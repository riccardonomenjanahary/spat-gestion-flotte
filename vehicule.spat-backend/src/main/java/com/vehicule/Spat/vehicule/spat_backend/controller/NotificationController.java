package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Notification;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.NotificationService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UtilisateurRepository utilisateurRepository;

    public NotificationController(
            NotificationService notificationService,
            UtilisateurRepository utilisateurRepository
    ) {
        this.notificationService = notificationService;
        this.utilisateurRepository = utilisateurRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<?> mesNotifications(
            Authentication authentication,
            @RequestParam(defaultValue = "false")
            boolean nonLuesUniquement
    ) {

        String matricule =
                matriculeCourant(authentication);

        if (matricule == null) {
            return ResponseEntity
                    .status(401)
                    .body("Utilisateur non authentifié.");
        }

        List<Notification> notifications =
                notificationService
                        .listerPourMatricule(
                                matricule,
                                nonLuesUniquement
                        );

        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/me/non-lues/count")
    public ResponseEntity<?> compterNonLues(
            Authentication authentication
    ) {

        String matricule =
                matriculeCourant(authentication);

        if (matricule == null) {
            return ResponseEntity
                    .status(401)
                    .body("Utilisateur non authentifié.");
        }

        long total =
                notificationService
                        .compterNonLues(matricule);

        return ResponseEntity.ok(
                Map.of("count", total)
        );
    }

    @PutMapping("/{id}/lu")
    public ResponseEntity<?> marquerCommeLue(
            @PathVariable Long id,
            Authentication authentication
    ) {

        String matricule =
                matriculeCourant(authentication);

        if (matricule == null) {
            return ResponseEntity
                    .status(401)
                    .body("Utilisateur non authentifié.");
        }

        try {

            Notification notification =
                    notificationService
                            .marquerCommeLue(
                                    id,
                                    matricule
                            );

            return ResponseEntity.ok(notification);

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .status(404)
                    .body(e.getMessage());
        }
    }

    @PutMapping("/tout-lire")
    public ResponseEntity<?> toutLire(
            Authentication authentication
    ) {

        String matricule =
                matriculeCourant(authentication);

        if (matricule == null) {
            return ResponseEntity
                    .status(401)
                    .body("Utilisateur non authentifié.");
        }

        int total =
                notificationService
                        .toutMarquerCommeLu(
                                matricule
                        );

        return ResponseEntity.ok(
                Map.of(
                        "marqueesCommeLues",
                        total
                )
        );
    }

    /*
     * Le principal JWT peut être :
     * - directement le matricule ;
     * - ou, selon l'ancienne génération du JWT, l'email.
     *
     * Les notifications sont enregistrées avec
     * destinataireMatricule. On résout donc toujours le
     * vrai matricule avant de les chercher.
     */
    private String matriculeCourant(
            Authentication authentication
    ) {

        if (authentication == null
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            return null;
        }

        String principal =
                authentication
                        .getName()
                        .trim();

        // 1. Cas normal : le principal est déjà le matricule.
        Utilisateur parMatricule =
                utilisateurRepository
                        .findByMatricule(principal)
                        .orElse(null);

        if (parMatricule != null
                && parMatricule.getMatricule() != null
                && !parMatricule.getMatricule().isBlank()) {

            return parMatricule
                    .getMatricule()
                    .trim();
        }

        // 2. Compatibilité : le principal est l'email.
        Utilisateur parEmail =
                utilisateurRepository
                        .findByEmail(
                                principal.toLowerCase()
                        )
                        .orElse(null);

        if (parEmail != null
                && parEmail.getMatricule() != null
                && !parEmail.getMatricule().isBlank()) {

            return parEmail
                    .getMatricule()
                    .trim();
        }

        System.err.println(
                "NOTIFICATIONS → impossible de résoudre le matricule depuis le principal : "
                        + principal
        );

        return null;
    }
}
