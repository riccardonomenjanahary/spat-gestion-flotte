package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Notification;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.EmailService;
import com.vehicule.Spat.vehicule.spat_backend.service.NotificationService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class MotDePasseOublieController {

    private final UtilisateurRepository utilisateurRepository;
    private final NotificationService notificationService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String CARACTERES_MOT_DE_PASSE = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

    public MotDePasseOublieController(
            UtilisateurRepository utilisateurRepository,
            NotificationService notificationService,
            PasswordEncoder passwordEncoder,
            EmailService emailService
    ) {
        this.utilisateurRepository = utilisateurRepository;
        this.notificationService = notificationService;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @PostMapping("/mot-de-passe-oublie/nouvelle-methode")
    public ResponseEntity<?> envoyerMotDePasseTemporaire(@RequestBody DemandeEmailRequest request) {
        String email = request == null || request.getEmail() == null ? "" : request.getEmail().trim();
        if (email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "L'adresse email est obligatoire."));
        }

        Utilisateur utilisateur = utilisateurRepository.findByEmailIgnoreCase(email).orElse(null);
        if (utilisateur == null || utilisateur.getEmail() == null || !utilisateur.isActif()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mail incorrect."));
        }

        String motDePasseTemporaire = genererMotDePasseTemporaire();
        utilisateur.setMotDePasseTemporaireHash(passwordEncoder.encode(motDePasseTemporaire));
        utilisateur.setMotDePasseTemporaireExpireLe(LocalDateTime.now().plusHours(1));
        utilisateurRepository.save(utilisateur);

        boolean emailEnvoye = emailService.envoyerMotDePasseTemporaireOublie(
                utilisateur.getEmail(),
                utilisateur.getNomComplet(),
                utilisateur.getMatricule(),
                motDePasseTemporaire
        );
        if (!emailEnvoye) {
            utilisateur.setMotDePasseTemporaireHash(null);
            utilisateur.setMotDePasseTemporaireExpireLe(null);
            utilisateurRepository.save(utilisateur);
        }

        return ResponseEntity.ok(Map.of(
                "message",
                "Si cette adresse correspond à un compte actif, un mot de passe temporaire a été envoyé. Il est valable une heure."
        ));
    }

    @PostMapping("/mot-de-passe-oublie/changer")
    public ResponseEntity<?> changerAvecMotDePasseTemporaire(@RequestBody ChangerMotDePasseRequest request) {
        if (request == null || estVide(request.getEmail()) || estVide(request.getMotDePasseTemporaire())
                || estVide(request.getNouveauMotDePasse())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Veuillez renseigner l'email, le mot de passe temporaire et le nouveau mot de passe."));
        }
        if (request.getNouveauMotDePasse().length() < 8 || request.getNouveauMotDePasse().length() > 72) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le nouveau mot de passe doit contenir entre 8 et 72 caractères."));
        }

        Utilisateur utilisateur = utilisateurRepository.findByEmailIgnoreCase(request.getEmail().trim()).orElse(null);
        LocalDateTime expiration = utilisateur == null ? null : utilisateur.getMotDePasseTemporaireExpireLe();
        if (utilisateur == null || !utilisateur.isActif() || expiration == null
                || !expiration.isAfter(LocalDateTime.now())
                || utilisateur.getMotDePasseTemporaireHash() == null
                || !passwordEncoder.matches(request.getMotDePasseTemporaire(), utilisateur.getMotDePasseTemporaireHash())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le mot de passe temporaire est invalide ou a expiré. Demandez-en un nouveau."));
        }

        utilisateur.setMotDePasse(passwordEncoder.encode(request.getNouveauMotDePasse()));
        utilisateur.setMotDePasseTemporaireHash(null);
        utilisateur.setMotDePasseTemporaireExpireLe(null);
        utilisateur.setDoitChangerMotDePasse(false);
        utilisateurRepository.save(utilisateur);
        return ResponseEntity.ok(Map.of("message", "Votre mot de passe a été changé. Vous pouvez maintenant vous connecter."));
    }

    private boolean estVide(String valeur) {
        return valeur == null || valeur.isBlank();
    }

    private String genererMotDePasseTemporaire() {
        StringBuilder motDePasse = new StringBuilder(16);
        for (int index = 0; index < 16; index++) {
            motDePasse.append(CARACTERES_MOT_DE_PASSE.charAt(SECURE_RANDOM.nextInt(CARACTERES_MOT_DE_PASSE.length())));
        }
        return motDePasse.toString();
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

    public static class DemandeEmailRequest {
        private String email;
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    public static class ChangerMotDePasseRequest {
        private String email;
        private String motDePasseTemporaire;
        private String nouveauMotDePasse;
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getMotDePasseTemporaire() { return motDePasseTemporaire; }
        public void setMotDePasseTemporaire(String motDePasseTemporaire) { this.motDePasseTemporaire = motDePasseTemporaire; }
        public String getNouveauMotDePasse() { return nouveauMotDePasse; }
        public void setNouveauMotDePasse(String nouveauMotDePasse) { this.nouveauMotDePasse = nouveauMotDePasse; }
    }
}
