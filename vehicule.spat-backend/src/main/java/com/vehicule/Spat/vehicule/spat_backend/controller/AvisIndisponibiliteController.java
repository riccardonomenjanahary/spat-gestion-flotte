package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Direction;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.DirectionRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/indisponibilites")
public class AvisIndisponibiliteController {
    private static final Set<String> ROLES_DIRECTION = Set.of(
            "ASSISTANT_DIRECTION", "CHEF_DIRECTION", "AGENT_PAR_INTERIM_ASSISTANT", "AGENT_PAR_INTERIM_CHEF");

    private static final Map<String, String> ROLE_INTERIM_PAR_TITULAIRE = Map.of(
            "ASSISTANT_DIRECTION", "AGENT_PAR_INTERIM_ASSISTANT",
            "CHEF_DIRECTION", "AGENT_PAR_INTERIM_CHEF");

    private final UtilisateurRepository utilisateurs;
    private final NotificationService notifications;
    private final DirectionRepository directions;

    public AvisIndisponibiliteController(UtilisateurRepository utilisateurs,
                                         NotificationService notifications,
                                         DirectionRepository directions) {
        this.utilisateurs = utilisateurs;
        this.notifications = notifications;
        this.directions = directions;
    }

    @PostMapping
    public ResponseEntity<?> publier(@RequestBody Map<String, String> request,
                                     Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Utilisateur non authentifié."));
        }
        Utilisateur auteur = utilisateurs.findByMatricule(authentication.getName())
                .filter(Utilisateur::isActif).orElse(null);
        if (auteur == null) return ResponseEntity.status(401).body(Map.of("message", "Compte utilisateur introuvable ou désactivé."));
        String role = auteur.getRole() == null ? "" : auteur.getRole().trim().replaceFirst("^ROLE_", "");
        if (!ROLES_DIRECTION.contains(role) || auteur.getDirectionId() == null) {
            return ResponseEntity.status(403).body(Map.of("message", "Avis réservé aux responsables rattachés à une Direction."));
        }

        String motif = request == null ? null : request.get("motif");
        if (motif == null || motif.isBlank() || motif.trim().length() > 1000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le motif est obligatoire (1 000 caractères maximum)."));
        }
        try {
            LocalDate debut = LocalDate.parse(request.get("dateDebut"));
            LocalDate fin = LocalDate.parse(request.get("dateFin"));
            if (fin.isBefore(debut) || debut.isBefore(LocalDate.now())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Vérifiez la période : la date de début ne peut pas être passée et la fin doit suivre le début."));
            }
            String periode = debut.equals(fin)
                    ? "le " + debut
                    : "du " + debut + " au " + fin;
            String nomAuteur = auteur.getNomComplet() == null ? auteur.getMatricule() : auteur.getNomComplet();
            String titre = "Avis d'indisponibilité — " + nomAuteur;
            String message = nomAuteur + " signale son indisponibilité " + periode + ".\nMotif : " + motif.trim();
            int[] destinataires = {0};
            for (Utilisateur destinataire : utilisateurs.findAll()) {
                String roleDestinataire = destinataire.getRole() == null ? "" : destinataire.getRole().trim().replaceFirst("^ROLE_", "");
                if (!destinataire.isActif() || destinataire.getId().equals(auteur.getId())
                        || !auteur.getDirectionId().equals(destinataire.getDirectionId())
                        || !ROLES_DIRECTION.contains(roleDestinataire)) continue;
                notifications.creerPourUtilisateur(destinataire, "AVIS_INDISPONIBILITE", "IMPORTANT",
                        titre, message, null, null, null, null, true);
                destinataires[0]++;
            }
            int superAdmins = notifierSuperAdmins(auteur, role, nomAuteur, periode, motif.trim());
            return ResponseEntity.ok(Map.of("message", "Avis d'indisponibilité transmis.",
                    "notificationsCreees", destinataires[0],
                    "superAdminsNotifies", superAdmins));
        } catch (DateTimeParseException | NullPointerException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Les dates de début et de fin sont obligatoires et doivent être valides."));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "L'avis n'a pas pu être transmis."));
        }
    }

    private int notifierSuperAdmins(Utilisateur auteur, String role, String nomAuteur,
                                    String periode, String motif) {
        String roleInterim = ROLE_INTERIM_PAR_TITULAIRE.get(role);
        if (roleInterim == null) return 0;

        String fonction = "CHEF_DIRECTION".equals(role) ? "Chef de Direction" : "Assistante de Direction";
        String direction = directions.findById(auteur.getDirectionId())
                .map(Direction::getNom).orElse("Direction n°" + auteur.getDirectionId());
        String titre = "Compte par intérim à créer — " + direction;
        String message = nomAuteur + " (" + fonction + ", " + direction + ") sera indisponible " + periode
                + ".\nMotif : " + motif
                + "\nVeuillez créer le compte de l'agent par intérim ("
                + ("AGENT_PAR_INTERIM_CHEF".equals(roleInterim) ? "Agent par intérim Chef" : "Agent par intérim Assistante")
                + ").";
        String lien = "/super-admin/utilisateurs?interimRole=" + roleInterim
                + "&directionId=" + auteur.getDirectionId();

        int total = 0;
        for (Utilisateur superAdmin : utilisateurs.findAll()) {
            String roleSuperAdmin = superAdmin.getRole() == null ? "" : superAdmin.getRole().trim().replaceFirst("^ROLE_", "");
            if (!superAdmin.isActif() || !"SUPER_ADMIN".equals(roleSuperAdmin)) continue;
            notifications.creerPourUtilisateur(superAdmin, "DEMANDE_COMPTE_INTERIM", "IMPORTANT",
                    titre, message, lien, null, null, null, true);
            total++;
        }
        return total;
    }
}
