package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.Set;
import java.util.List;
import java.util.Locale;
import java.text.Normalizer;

@Service
public class AccesParcoursService {
    private final UtilisateurRepository utilisateurs;
    private static final Set<String> LECTURE_PARC = Set.of("ADMIN", "SUPER_ADMIN", "CO_ADMIN",
            "DIRECTEUR_DFP", "CHEF_SERVICE_LOGISTIQUE", "AGENT_FLOTTE", "AGENT_SURETE", "CHEF_DGAL", "MECANICIEN_DID",
            "CHEF_ATELIER", "MECANICIEN", "DIRECTION_GENERALE", "CONTROLE_GESTION");

    public AccesParcoursService(UtilisateurRepository utilisateurs) { this.utilisateurs = utilisateurs; }

    public Utilisateur courant() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return utilisateurs.findByMatricule(auth.getName()).filter(Utilisateur::isActif)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    public static String role(Utilisateur u) {
        return u == null || u.getRole() == null ? "" : u.getRole().trim().replaceFirst("^ROLE_", "");
    }

    public boolean peutLire(Utilisateur u, Reservation r) {
        if (u == null || !u.isActif() || r == null) return false;
        if (LECTURE_PARC.contains(role(u))) return true;
        if ("CHAUFFEUR".equals(role(u))) return false;
        if (r.getDemandeur() != null && u.getId() != null && u.getId().equals(r.getDemandeur().getId())) return true;
        if (("ASSISTANT_DIRECTION".equals(role(u)) || "AGENT_PAR_INTERIM_ASSISTANT".equals(role(u)))
            && directionVehicule(u, r.getVehicule())) return true;
        return ("CHEF_DIRECTION".equals(role(u)) || "AGENT_PAR_INTERIM_CHEF".equals(role(u)))
            && u.getDirectionId() != null && r.getDemandeur() != null
                && u.getDirectionId().equals(r.getDemandeur().getDirectionId());
    }

    public boolean directionVehicule(Utilisateur u, Vehicule v) {
        return u != null && estAffecteDirection(u.getDirectionId(), v);
    }

    public static boolean estAssistant(Utilisateur u) {
        return Set.of("ASSISTANT_DIRECTION", "AGENT_PAR_INTERIM_ASSISTANT").contains(role(u));
    }

    public static boolean estAffecteDirection(Long directionId, Vehicule v) {
        if (directionId == null || v == null) return false;
        if (v.getDirections() != null && !v.getDirections().isEmpty()) {
            return v.getDirections().stream().anyMatch(d -> directionId.equals(d.getId()));
        }
        // Compatibilité avec les anciennes affectations, uniquement en l'absence de relation Admin.
        List<String> alias = switch (directionId.intValue()) {
            case 1 -> List.of("DG", "DIRECTION GENERALE");
            case 2 -> List.of("AUDIT", "GESTION DES RISQUES");
            case 3 -> List.of("DAJ", "AFFAIRES JURIDIQUES");
            case 4 -> List.of("DIRCAP", "CAPITAINERIE");
            case 5 -> List.of("DID", "INFRASTRUCTURE ET DEVELOPPEMENT");
            case 6 -> List.of("MARKETING");
            case 7 -> List.of("DIREX", "EXPLOITATION");
            case 8 -> List.of("DFP", "FINANCIERE ET PERFORMANCE");
            case 9 -> List.of("DRH", "RESSOURCES HUMAINES");
            case 10 -> List.of("DDI", "DIGITALISATION ET INNOVATION");
            case 11 -> List.of("SG", "SECRETARIAT GENERAL");
            case 12 -> List.of("DMC", "MARKETING ET COMMUNICATION");
            case 13 -> List.of("DAGR", "AFFAIRES GENERALES");
            default -> List.of();
        };
        String affectation = " " + normaliser(v.getAffectation()) + " ";
        return alias.stream().anyMatch(a -> affectation.contains(" " + normaliser(a) + " "));
    }

    private static String normaliser(String valeur) {
        return Normalizer.normalize(valeur == null ? "" : valeur, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", " ").trim();
    }

    public boolean vehiculeAssistant(Utilisateur u, Vehicule v) {
        return v != null && directionVehicule(u, v)
                && (CategorieVehicule.estMotoElectrique(v.getCategorie()) || CategorieVehicule.estVoitureMutualisee(v.getCategorie()));
    }

    public void exigerLecture(Reservation r) {
        if (!peutLire(courant(), r)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Dossier hors de votre périmètre.");
    }

    public boolean peutLireVehicule(Utilisateur u, Vehicule v) {
        return u != null && u.isActif() && v != null
                && (LECTURE_PARC.contains(role(u)) || (estAssistant(u) ? vehiculeAssistant(u, v) : directionVehicule(u, v)));
    }

    public void exigerLectureVehicule(Vehicule v) {
        if (!peutLireVehicule(courant(), v)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    public void exigerLectureTransaction(TransactionCarburant t) {
        Utilisateur u = courant();
        if (t != null && ((t.getReservation() != null && peutLire(u, t.getReservation()))
                || (t.getChauffeur() != null && u.getMatricule().equals(t.getChauffeur().getMatricule()))
                || peutLireVehicule(u, t.getVehicule()))) return;
        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    public boolean peutLireCarnet(Utilisateur u, CarnetBord c) {
        return c != null && (c.getReservation() != null ? peutLire(u, c.getReservation())
                : peutLireVehicule(u, c.getVehicule())
                    || c.getSaisiPar() != null && u != null && u.getId() != null && u.getId().equals(c.getSaisiPar().getId()));
    }

    public void exigerLectureCarnet(CarnetBord c) {
        if (!peutLireCarnet(courant(), c)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
}
