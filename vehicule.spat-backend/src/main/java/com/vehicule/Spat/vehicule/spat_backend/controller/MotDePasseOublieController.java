package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Notification;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.NotificationService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class MotDePasseOublieController {

    private final UtilisateurRepository utilisateurRepository;
    private final NotificationService notificationService;

    public MotDePasseOublieController(
            UtilisateurRepository utilisateurRepository,
            NotificationService notificationService
    ) {
        this.utilisateurRepository = utilisateurRepository;
        this.notificationService = notificationService;
    }

    @PostMapping("/mot-de-passe-oublie")
    public ResponseEntity<?> demanderNouveauMotDePasse(
            @RequestBody MotDePasseOublieRequest request
    ) {

        String matricule =
                request == null
                        ? null
                        : request.getMatricule();

        if (matricule == null || matricule.isBlank()) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "message",
                                    "Le matricule est obligatoire."
                            )
                    );
        }

        String matriculePropre = matricule.trim();

        Utilisateur utilisateur =
                utilisateurRepository
                        .findByMatricule(matriculePropre)
                        .orElse(null);

        /*
         * Réponse générique volontaire :
         * on ne révèle pas publiquement si le matricule existe.
         */
        if (utilisateur == null) {

            System.out.println(
                    "MOT DE PASSE OUBLIE → matricule introuvable : "
                            + matriculePropre
            );

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "Si ce matricule correspond à un compte, la demande a été transmise au Super Admin."
                    )
            );
        }

        String lien =
                "/super-admin/utilisateurs?matricule="
                        + URLEncoder.encode(
                        matriculePropre,
                        StandardCharsets.UTF_8
                );

        /*
         * IMPORTANT :
         * On cible directement tous les comptes SUPER_ADMIN.
         *
         * On ne dépend pas ici du filtre "actif" de creerPourRole(),
         * afin qu'un Super Admin déjà utilisable dans l'application
         * ne soit pas exclu à cause d'une ancienne valeur de statut.
         *
         * On accepte également ROLE_SUPER_ADMIN si cette forme existe
         * dans une ancienne donnée.
         */
        List<Utilisateur> superAdmins =
                utilisateurRepository
                        .findAll()
                        .stream()
                        .filter(u -> u.getRole() != null)
                        .filter(u -> {
                            String role =
                                    u.getRole()
                                            .trim()
                                            .toUpperCase(Locale.ROOT);

                            return "SUPER_ADMIN".equals(role)
                                    || "ROLE_SUPER_ADMIN".equals(role);
                        })
                        .toList();

        if (superAdmins.isEmpty()) {

            System.err.println(
                    "MOT DE PASSE OUBLIE → AUCUN COMPTE SUPER_ADMIN TROUVE."
            );

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "Si ce matricule correspond à un compte, la demande a été transmise au Super Admin."
                    )
            );
        }

        int totalCree = 0;

        for (Utilisateur superAdmin : superAdmins) {

            try {

                Notification notification =
                        notificationService
                                .creerPourUtilisateur(
                                        superAdmin,
                                        "MOT_DE_PASSE_OUBLIE",
                                        "IMPORTANT",
                                        "Demande de nouveau mot de passe",
                                        "Le matricule "
                                                + matriculePropre
                                                + " a besoin d'un nouveau mot de passe.",
                                        lien,
                                        null,
                                        null,
                                        null,
                                        false
                                );

                totalCree++;

                System.out.println(
                        "MOT DE PASSE OUBLIE → notification ID="
                                + notification.getId()
                                + " créée pour SUPER_ADMIN matricule="
                                + superAdmin.getMatricule()
                );

            } catch (Exception e) {

                System.err.println(
                        "MOT DE PASSE OUBLIE → échec notification SUPER_ADMIN "
                                + superAdmin.getMatricule()
                                + " : "
                                + e.getMessage()
                );
            }
        }

        System.out.println(
                "MOT DE PASSE OUBLIE → "
                        + matriculePropre
                        + " → notifications créées : "
                        + totalCree
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "Si ce matricule correspond à un compte, la demande a été transmise au Super Admin."
                )
        );
    }

    public static class MotDePasseOublieRequest {

        private String matricule;

        public MotDePasseOublieRequest() {
        }

        public String getMatricule() {
            return matricule;
        }

        public void setMatricule(
                String matricule
        ) {
            this.matricule = matricule;
        }
    }
}
