package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.Set;

@Service
public class AccesParcoursService {
    private final UtilisateurRepository utilisateurs;
    private static final Set<String> LECTURE_PARC = Set.of("ADMIN", "SUPER_ADMIN", "CO_ADMIN",
            "DIRECTEUR_DFP", "CHEF_SERVICE_LOGISTIQUE", "AGENT_FLOTTE", "AGENT_SURETE", "CHEF_DGAL", "MECANICIEN_DID");

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
        return u != null && u.getDirectionId() != null && v != null && v.getDirections() != null
                && v.getDirections().stream().anyMatch(d -> u.getDirectionId().equals(d.getId()));
    }

    public void exigerLecture(Reservation r) {
        if (!peutLire(courant(), r)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Dossier hors de votre périmètre.");
    }

    public boolean peutLireVehicule(Utilisateur u, Vehicule v) {
        return u != null && u.isActif() && v != null
                && (LECTURE_PARC.contains(role(u)) || directionVehicule(u, v));
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
