package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.ChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/chauffeur-comptes")
public class AdminChauffeurCompteController {

    private final ChauffeurRepository chauffeurRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;

    private static final SecureRandom SECURE_RANDOM =
            new SecureRandom();

    /*
     * Caractères volontairement non ambigus :
     * pas de 0/O ni de 1/l/I.
     */
    private static final String CARACTERES_MOT_DE_PASSE =
            "ABCDEFGHJKLMNPQRSTUVWXYZ"
                    + "abcdefghijkmnopqrstuvwxyz"
                    + "23456789";

    private static final int LONGUEUR_MOT_DE_PASSE = 12;

    public AdminChauffeurCompteController(
            ChauffeurRepository chauffeurRepository,
            UtilisateurRepository utilisateurRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.chauffeurRepository = chauffeurRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ============================================================
    // LISTE DES CHAUFFEURS FIXES + ETAT DU COMPTE PORTAIL
    // ============================================================
    //
    // IMPORTANT :
    // aucun mot de passe n'est retourné ici.
    //
    // Le mot de passe en clair n'est disponible qu'au moment
    // précis de sa génération ou de sa régénération.
    // ============================================================

    @GetMapping
    public ResponseEntity<?> listerComptesChauffeurs() {

        List<Chauffeur> chauffeurs =
                chauffeurRepository.findAll();

        List<Map<String, Object>> resultat =
                new ArrayList<>();

        for (Chauffeur chauffeur : chauffeurs) {

            Map<String, Object> ligne =
                    new LinkedHashMap<>();

            ligne.put(
                    "chauffeurId",
                    chauffeur.getId()
            );

            ligne.put(
                    "matricule",
                    chauffeur.getMatricule()
            );

            ligne.put(
                    "nom",
                    chauffeur.getNom()
            );

            ligne.put(
                    "prenom",
                    chauffeur.getPrenom()
            );

            ligne.put(
                    "telephone",
                    chauffeur.getTelephone()
            );

            ligne.put(
                    "email",
                    chauffeur.getEmail()
            );

            ligne.put(
                    "numeroPermis",
                    chauffeur.getNumeroPermis()
            );

            ligne.put(
                    "affectationService",
                    chauffeur.getAffectationService()
            );

            ligne.put(
                    "statutChauffeur",
                    chauffeur.getStatut()
            );

            Utilisateur compte = null;

            if (chauffeur.getMatricule() != null
                    && !chauffeur.getMatricule().isBlank()) {

                compte =
                        utilisateurRepository
                                .findByMatricule(
                                        chauffeur
                                                .getMatricule()
                                                .trim()
                                )
                                .orElse(null);
            }

            boolean compteExiste =
                    compte != null
                            && "CHAUFFEUR".equals(
                            compte.getRole()
                    );

            ligne.put(
                    "compteExiste",
                    compteExiste
            );

            /*
             * Si le matricule existe déjà dans utilisateurs mais avec
             * un autre rôle, on le signale au lieu d'écraser ce compte.
             */
            ligne.put(
                    "matriculeDejaUtilise",
                    compte != null
                            && !"CHAUFFEUR".equals(
                            compte.getRole()
                    )
            );

            ligne.put(
                    "roleExistant",
                    compte != null
                            ? compte.getRole()
                            : null
            );

            ligne.put(
                    "utilisateurId",
                    compteExiste
                            ? compte.getId()
                            : null
            );

            resultat.add(
                    ligne
            );
        }

        return ResponseEntity.ok(
                resultat
        );
    }

    // ============================================================
    // CREER LE COMPTE PORTAIL D'UN CHAUFFEUR FIXE
    // ============================================================
    //
    // Le chauffeur existe déjà dans la table chauffeurs.
    // Cette méthode crée uniquement son compte de connexion.
    //
    // Le lien entre les deux est le MATRICULE.
    // ============================================================

    @PostMapping("/{chauffeurId}/creer")
    @Transactional
    public ResponseEntity<?> creerCompteChauffeur(
            @PathVariable Long chauffeurId
    ) {

        Chauffeur chauffeur =
                chauffeurRepository
                        .findById(chauffeurId)
                        .orElse(null);

        if (chauffeur == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        if (chauffeur.getMatricule() == null
                || chauffeur.getMatricule().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Impossible de créer le compte : le chauffeur ne possède pas de matricule."
                    );
        }

        String matricule =
                chauffeur
                        .getMatricule()
                        .trim();

        Utilisateur utilisateurExistant =
                utilisateurRepository
                        .findByMatricule(matricule)
                        .orElse(null);

        if (utilisateurExistant != null) {

            if ("CHAUFFEUR".equals(
                    utilisateurExistant.getRole()
            )) {

                return ResponseEntity
                        .status(409)
                        .body(
                                "Ce chauffeur possède déjà un compte portail."
                        );
            }

            return ResponseEntity
                    .status(409)
                    .body(
                            "Le matricule "
                                    + matricule
                                    + " est déjà utilisé par un compte ayant le rôle "
                                    + utilisateurExistant.getRole()
                                    + "."
                    );
        }

        String email = nettoyerEmail(
                chauffeur.getEmail()
        );

        if (email != null) {

            Utilisateur utilisateurAvecEmail =
                    utilisateurRepository
                            .findByEmail(email)
                            .orElse(null);

            if (utilisateurAvecEmail != null) {

                return ResponseEntity
                        .status(409)
                        .body(
                                "L'adresse email du chauffeur est déjà utilisée par un autre compte utilisateur."
                        );
            }
        }

        String motDePasse =
                genererMotDePasse();

        Utilisateur utilisateur =
                new Utilisateur();

        utilisateur.setNomComplet(
                construireNomComplet(
                        chauffeur
                )
        );

        utilisateur.setMatricule(
                matricule
        );

        /*
         * L'email n'est pas utilisé pour l'authentification :
         * la connexion se fait avec le matricule.
         *
         * Il peut donc rester null si la fiche chauffeur
         * n'en possède pas.
         */
        utilisateur.setEmail(
                email
        );

        utilisateur.setRole(
                "CHAUFFEUR"
        );

        utilisateur.setMotDePasse(
                passwordEncoder.encode(
                        motDePasse
                )
        );

        utilisateur.setActif(
                true
        );

        /*
         * Le mot de passe généré reste valable jusqu'à ce que
         * le Super Admin en génère un nouveau.
         */
        utilisateur.setDoitChangerMotDePasse(
                false
        );

        Utilisateur sauvegarde =
                utilisateurRepository.save(
                        utilisateur
                );

        return ResponseEntity.ok(
                reponseMotDePasse(
                        sauvegarde,
                        chauffeur,
                        motDePasse,
                        "Compte chauffeur créé avec succès."
                )
        );
    }

    // ============================================================
    // GENERER UN NOUVEAU MOT DE PASSE
    // ============================================================
    //
    // L'ancien mot de passe cesse immédiatement de fonctionner.
    // Le nouveau mot de passe est retourné UNE SEULE FOIS
    // au Super Admin afin qu'il puisse le communiquer au chauffeur.
    // ============================================================

    @PostMapping("/{chauffeurId}/nouveau-mot-de-passe")
    @Transactional
    public ResponseEntity<?> genererNouveauMotDePasse(
            @PathVariable Long chauffeurId
    ) {

        Chauffeur chauffeur =
                chauffeurRepository
                        .findById(chauffeurId)
                        .orElse(null);

        if (chauffeur == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        if (chauffeur.getMatricule() == null
                || chauffeur.getMatricule().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Ce chauffeur ne possède pas de matricule."
                    );
        }

        String matricule =
                chauffeur
                        .getMatricule()
                        .trim();

        Utilisateur utilisateur =
                utilisateurRepository
                        .findByMatricule(matricule)
                        .orElse(null);

        if (utilisateur == null) {

            return ResponseEntity
                    .status(404)
                    .body(
                            "Aucun compte portail n'existe encore pour ce chauffeur."
                    );
        }

        if (!"CHAUFFEUR".equals(
                utilisateur.getRole()
        )) {

            return ResponseEntity
                    .status(409)
                    .body(
                            "Le compte lié à ce matricule n'est pas un compte CHAUFFEUR."
                    );
        }

        String nouveauMotDePasse =
                genererMotDePasse();

        utilisateur.setMotDePasse(
                passwordEncoder.encode(
                        nouveauMotDePasse
                )
        );

        utilisateur.setDoitChangerMotDePasse(
                false
        );

        utilisateurRepository.save(
                utilisateur
        );

        return ResponseEntity.ok(
                reponseMotDePasse(
                        utilisateur,
                        chauffeur,
                        nouveauMotDePasse,
                        "Nouveau mot de passe généré avec succès."
                )
        );
    }

    // ============================================================
    // OUTILS
    // ============================================================

    private Map<String, Object> reponseMotDePasse(
            Utilisateur utilisateur,
            Chauffeur chauffeur,
            String motDePasse,
            String message
    ) {

        Map<String, Object> reponse =
                new LinkedHashMap<>();

        reponse.put(
                "message",
                message
        );

        reponse.put(
                "utilisateurId",
                utilisateur.getId()
        );

        reponse.put(
                "chauffeurId",
                chauffeur.getId()
        );

        reponse.put(
                "nomComplet",
                utilisateur.getNomComplet()
        );

        reponse.put(
                "matricule",
                utilisateur.getMatricule()
        );

        /*
         * C'est la SEULE réponse dans laquelle le mot de passe
         * en clair est renvoyé.
         *
         * Il n'est jamais enregistré en clair dans la base.
         */
        reponse.put(
                "motDePasse",
                motDePasse
        );

        return reponse;
    }

    private String nettoyerEmail(
            String email
    ) {

        if (email == null
                || email.isBlank()) {

            return null;
        }

        return email
                .trim()
                .toLowerCase();
    }

    private String construireNomComplet(
            Chauffeur chauffeur
    ) {

        String prenom =
                chauffeur.getPrenom() != null
                        ? chauffeur.getPrenom().trim()
                        : "";

        String nom =
                chauffeur.getNom() != null
                        ? chauffeur.getNom().trim()
                        : "";

        String nomComplet =
                (prenom + " " + nom)
                        .trim();

        if (!nomComplet.isBlank()) {

            return nomComplet;
        }

        return chauffeur.getMatricule();
    }

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
}
