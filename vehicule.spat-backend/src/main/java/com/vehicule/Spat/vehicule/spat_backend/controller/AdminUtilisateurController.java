package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.CreateUtilisateurRequest;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.EmailService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/admin/utilisateurs")
public class AdminUtilisateurController {

    private final UtilisateurRepository utilisateurRepository;
    private final ReservationRepository reservationRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private static final Set<String> ROLES_AUTORISES = Set.of(
            "DIRECTEUR_DFP",
            "CHEF_DIRECTION",
            "ASSISTANT_DIRECTION",
            "CHEF_SERVICE_LOGISTIQUE",
            "CHEF_DGAL",
            "MECANICIEN_DID",
            "AGENT_FLOTTE",
            "CHAUFFEUR"
    );

    // ============================================================
    // GENERATION AUTOMATIQUE DU MOT DE PASSE DE REINITIALISATION
    // ============================================================

    private static final SecureRandom SECURE_RANDOM =
            new SecureRandom();

    /*
     * On évite volontairement les caractères ambigus :
     * 0 / O et 1 / l / I.
     */
    private static final String CARACTERES_MOT_DE_PASSE =
            "ABCDEFGHJKLMNPQRSTUVWXYZ"
                    + "abcdefghijkmnopqrstuvwxyz"
                    + "23456789";

    private static final int LONGUEUR_MOT_DE_PASSE = 12;

    public AdminUtilisateurController(
            UtilisateurRepository utilisateurRepository,
            ReservationRepository reservationRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService
    ) {

        this.utilisateurRepository = utilisateurRepository;
        this.reservationRepository = reservationRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    // ============================================================
    // LISTER LES UTILISATEURS
    // ============================================================

    @GetMapping
    public List<Utilisateur> listerUtilisateurs() {

        return utilisateurRepository.findByRoleNotIn(
                List.of(
                        "ADMIN",
                        "SUPER_ADMIN"
                )
        );
    }

    // ============================================================
    // CRÉER UN UTILISATEUR
    // ============================================================

    @PostMapping
    public ResponseEntity<?> creerUtilisateur(
            @RequestBody CreateUtilisateurRequest request
    ) {

        if (request.getNomComplet() == null
                || request.getNomComplet().isBlank()) {

            return ResponseEntity.badRequest()
                    .body("Le nom complet est obligatoire.");
        }

        if (request.getMatricule() == null
                || request.getMatricule().isBlank()) {

            return ResponseEntity.badRequest()
                    .body("Le matricule est obligatoire.");
        }

        if (request.getEmail() == null
                || request.getEmail().isBlank()) {

            return ResponseEntity.badRequest()
                    .body("L'adresse email est obligatoire.");
        }

        if (request.getRole() == null
                || !ROLES_AUTORISES.contains(request.getRole())) {

            return ResponseEntity.badRequest()
                    .body(
                            "Rôle invalide. Les rôles autorisés sont : "
                                    + ROLES_AUTORISES
                    );
        }

        if (request.getMotDePasse() == null
                || request.getMotDePasse().isBlank()) {

            return ResponseEntity.badRequest()
                    .body("Le mot de passe est obligatoire.");
        }

        if (request.getMotDePasse().length() < 8) {

            return ResponseEntity.badRequest()
                    .body(
                            "Le mot de passe doit contenir au moins 8 caractères."
                    );
        }

        if ("CHEF_SERVICE".equals(request.getRole())
                && request.getServiceId() == null) {

            return ResponseEntity.badRequest()
                    .body(
                            "Un CHEF_SERVICE doit obligatoirement être rattaché à un service."
                    );
        }

        if ("CHEF_DEPARTEMENT".equals(request.getRole())
                && request.getDepartementId() == null) {

            return ResponseEntity.badRequest()
                    .body(
                            "Un CHEF_DEPARTEMENT doit obligatoirement être rattaché à un département."
                    );
        }

        String matricule = request.getMatricule().trim();
        String email = request.getEmail().trim().toLowerCase();

        if (utilisateurRepository
                .findByMatricule(matricule)
                .isPresent()) {

            return ResponseEntity.status(409)
                    .body(
                            "Un utilisateur avec ce matricule existe déjà."
                    );
        }

        if (utilisateurRepository
                .findByEmail(email)
                .isPresent()) {

            return ResponseEntity.status(409)
                    .body(
                            "Un utilisateur avec cette adresse email existe déjà."
                    );
        }

        Utilisateur utilisateur = new Utilisateur();

        utilisateur.setNomComplet(
                request.getNomComplet().trim()
        );

        utilisateur.setMatricule(matricule);

        utilisateur.setEmail(email);

        utilisateur.setRole(
                request.getRole()
        );

        utilisateur.setMotDePasse(
                passwordEncoder.encode(
                        request.getMotDePasse()
                )
        );

        utilisateur.setServiceId(
                request.getServiceId()
        );

        utilisateur.setDepartementId(
                request.getDepartementId()
        );

        utilisateur.setActif(
                request.getActif() == null
                        || request.getActif()
        );

        /*
         * FONCTIONNEMENT EXISTANT CONSERVE :
         * le mot de passe défini à la création reste un mot
         * de passe initial/temporaire à modifier.
         */
        utilisateur.setDoitChangerMotDePasse(true);

        utilisateurRepository.save(utilisateur);

        try {

            /*
             * On garde l'appel asynchrone déjà utilisé par ton projet.
             * La création du compte n'est donc pas modifiée.
             */
            emailService.envoyerCreationCompte(
                    utilisateur.getEmail(),
                    utilisateur.getNomComplet(),
                    utilisateur.getMatricule(),
                    request.getMotDePasse()
            );

        } catch (Exception e) {

            System.err.println(
                    "Utilisateur créé mais email non envoyé : "
                            + e.getMessage()
            );

            e.printStackTrace();

            return ResponseEntity.ok(
                    "Utilisateur créé, mais l'email n'a pas pu être envoyé."
            );
        }

        return ResponseEntity.ok(utilisateur);
    }

    // ============================================================
    // MODIFIER UN UTILISATEUR
    // ============================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> modifierUtilisateur(
            @PathVariable Long id,
            @RequestBody CreateUtilisateurRequest request
    ) {

        if (request.getNomComplet() == null
                || request.getNomComplet().isBlank()) {

            return ResponseEntity.badRequest()
                    .body("Le nom complet est obligatoire.");
        }

        if (request.getMatricule() == null
                || request.getMatricule().isBlank()) {

            return ResponseEntity.badRequest()
                    .body("Le matricule est obligatoire.");
        }

        if (request.getEmail() == null
                || request.getEmail().isBlank()) {

            return ResponseEntity.badRequest()
                    .body("L'adresse email est obligatoire.");
        }

        if (request.getRole() == null
                || !ROLES_AUTORISES.contains(request.getRole())) {

            return ResponseEntity.badRequest()
                    .body("Rôle invalide.");
        }

        if ("CHEF_SERVICE".equals(request.getRole())
                && request.getServiceId() == null) {

            return ResponseEntity.badRequest()
                    .body(
                            "Un CHEF_SERVICE doit obligatoirement être rattaché à un service."
                    );
        }

        if ("CHEF_DEPARTEMENT".equals(request.getRole())
                && request.getDepartementId() == null) {

            return ResponseEntity.badRequest()
                    .body(
                            "Un CHEF_DEPARTEMENT doit obligatoirement être rattaché à un département."
                    );
        }

        return utilisateurRepository.findById(id)
                .map(utilisateur -> {

                    String matricule =
                            request.getMatricule().trim();

                    String email =
                            request.getEmail()
                                    .trim()
                                    .toLowerCase();

                    utilisateurRepository
                            .findByMatricule(matricule)
                            .filter(u ->
                                    !u.getId().equals(id)
                            )
                            .ifPresent(u -> {
                                throw new IllegalArgumentException(
                                        "Ce matricule est déjà utilisé."
                                );
                            });

                    utilisateurRepository
                            .findByEmail(email)
                            .filter(u ->
                                    !u.getId().equals(id)
                            )
                            .ifPresent(u -> {
                                throw new IllegalArgumentException(
                                        "Cette adresse email est déjà utilisée."
                                );
                            });

                    utilisateur.setNomComplet(
                            request.getNomComplet().trim()
                    );

                    utilisateur.setMatricule(
                            matricule
                    );

                    utilisateur.setEmail(
                            email
                    );

                    utilisateur.setRole(
                            request.getRole()
                    );

                    utilisateur.setServiceId(
                            request.getServiceId()
                    );

                    utilisateur.setDepartementId(
                            request.getDepartementId()
                    );

                    if (request.getActif() != null) {
                        utilisateur.setActif(
                                request.getActif()
                        );
                    }

                    if (request.getMotDePasse() != null
                            && !request
                            .getMotDePasse()
                            .isBlank()) {

                        utilisateur.setMotDePasse(
                                passwordEncoder.encode(
                                        request.getMotDePasse()
                                )
                        );

                        utilisateur.setDoitChangerMotDePasse(
                                true
                        );
                    }

                    return ResponseEntity.ok(
                            utilisateurRepository
                                    .save(utilisateur)
                    );
                })
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build()
                );
    }

    // ============================================================
    // ACTIVER / DÉSACTIVER UN COMPTE
    // ============================================================

    @PatchMapping("/{id}/actif")
    public ResponseEntity<?> modifierStatutCompte(
            @PathVariable Long id,
            @RequestParam boolean actif
    ) {

        return utilisateurRepository.findById(id)
                .map(utilisateur -> {

                    if ("ADMIN".equals(
                            utilisateur.getRole())
                            || "SUPER_ADMIN".equals(
                            utilisateur.getRole())) {

                        return ResponseEntity
                                .badRequest()
                                .body(
                                        "Le compte ADMIN ou SUPER_ADMIN ne peut pas être désactivé depuis cette interface."
                                );
                    }

                    utilisateur.setActif(actif);

                    utilisateurRepository
                            .save(utilisateur);

                    return ResponseEntity.ok(
                            actif
                                    ? "Compte activé."
                                    : "Compte désactivé."
                    );
                })
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build()
                );
    }

    // ============================================================
    // RÉINITIALISER LE MOT DE PASSE
    // ============================================================
    //
    // SEULE PARTIE MODIFIEE DU CONTROLEUR :
    //
    // - plus de ResetMotDePasseRequest
    // - aucun mot de passe saisi par le frontend
    // - génération automatique par le backend
    // - BCrypt conservé
    // - doitChangerMotDePasse = false
    // - envoi par EmailService conservé
    // ============================================================

    @PostMapping("/{id}/reinitialiser-mot-de-passe")
    public ResponseEntity<?> reinitialiserMotDePasse(
            @PathVariable Long id
    ) {

        // --------------------------------------------------------
        // Recherche de l'utilisateur
        // --------------------------------------------------------

        Utilisateur utilisateur =
                utilisateurRepository
                        .findById(id)
                        .orElse(null);

        if (utilisateur == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        // --------------------------------------------------------
        // Vérification de l'adresse email
        // --------------------------------------------------------

        if (utilisateur.getEmail() == null
                || utilisateur.getEmail().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Cet utilisateur ne possède aucune adresse email."
                    );
        }

        // --------------------------------------------------------
        // Génération automatique
        // --------------------------------------------------------

        String nouveauMotDePasse =
                genererMotDePasse();

        // --------------------------------------------------------
        // Modification du mot de passe
        // --------------------------------------------------------

        try {

            utilisateur.setMotDePasse(
                    passwordEncoder.encode(
                            nouveauMotDePasse
                    )
            );

            /*
             * IMPORTANT :
             * contrairement au mot de passe initial de création,
             * celui généré par une réinitialisation n'est pas
             * temporaire.
             */
            utilisateur.setDoitChangerMotDePasse(
                    false
            );

            utilisateurRepository.save(utilisateur);

        } catch (Exception e) {

            System.err.println(
                    "========== ERREUR REINITIALISATION MOT DE PASSE =========="
            );

            System.err.println(
                    "Utilisateur ID : " + id
            );

            System.err.println(
                    "Type : " + e.getClass().getName()
            );

            System.err.println(
                    "Message : " + e.getMessage()
            );

            e.printStackTrace();

            System.err.println(
                    "=========================================================="
            );

            return ResponseEntity
                    .internalServerError()
                    .body(
                            "Impossible de réinitialiser le mot de passe."
                    );
        }

        // --------------------------------------------------------
        // Envoi du nouveau mot de passe par email
        // --------------------------------------------------------

        try {

            /*
             * EmailService est @Async et retourne un
             * CompletableFuture<Boolean>.
             *
             * join() est utilisé uniquement ici afin que le
             * frontend sache si l'envoi du mail a réellement
             * réussi ou non.
             */
            boolean emailEnvoye =
                    emailService
                            .envoyerReinitialisationMotDePasse(
                                    utilisateur.getEmail().trim(),
                                    utilisateur.getNomComplet(),
                                    utilisateur.getMatricule(),
                                    nouveauMotDePasse
                            )
                            .join();

            if (!emailEnvoye) {

                return ResponseEntity.ok(
                        "Le mot de passe a été réinitialisé, mais l'email n'a pas pu être envoyé."
                );
            }

        } catch (Exception e) {

            /*
             * On conserve le comportement existant :
             * si SMTP échoue, le mot de passe reste réinitialisé.
             */
            System.err.println(
                    "========== ERREUR ENVOI EMAIL RESET =========="
            );

            System.err.println(
                    "Utilisateur ID : " + utilisateur.getId()
            );

            System.err.println(
                    "Matricule : " + utilisateur.getMatricule()
            );

            System.err.println(
                    "Destinataire : " + utilisateur.getEmail()
            );

            System.err.println(
                    "Type : " + e.getClass().getName()
            );

            System.err.println(
                    "Message : " + e.getMessage()
            );

            e.printStackTrace();

            System.err.println(
                    "================================================"
            );

            return ResponseEntity.ok(
                    "Le mot de passe a été réinitialisé, mais l'email n'a pas pu être envoyé."
            );
        }

        return ResponseEntity.ok(
                "Nouveau mot de passe généré automatiquement et envoyé par email."
        );
    }

    // ============================================================
    // GENERATEUR DE MOT DE PASSE
    // ============================================================

    private String genererMotDePasse() {

        StringBuilder motDePasse =
                new StringBuilder(
                        LONGUEUR_MOT_DE_PASSE
                );

        for (
                int i = 0;
                i < LONGUEUR_MOT_DE_PASSE;
                i++
        ) {

            int index =
                    SECURE_RANDOM.nextInt(
                            CARACTERES_MOT_DE_PASSE.length()
                    );

            motDePasse.append(
                    CARACTERES_MOT_DE_PASSE.charAt(
                            index
                    )
            );
        }

        return motDePasse.toString();
    }

    // ============================================================
    // SUPPRIMER UN UTILISATEUR
    // ============================================================

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> supprimerUtilisateur(
            @PathVariable Long id
    ) {

        Utilisateur utilisateur =
                utilisateurRepository
                        .findById(id)
                        .orElse(null);

        if (utilisateur == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        if ("ADMIN".equals(utilisateur.getRole())
                || "SUPER_ADMIN".equals(
                utilisateur.getRole())) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Un compte ADMIN ou SUPER_ADMIN ne peut pas être supprimé."
                    );
        }

        reservationRepository
                .deleteByDemandeurId(id);

        utilisateurRepository
                .deleteById(id);

        return ResponseEntity
                .noContent()
                .build();
    }
}
