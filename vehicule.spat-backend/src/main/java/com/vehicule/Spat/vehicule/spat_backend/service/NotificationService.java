package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Notification;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.NotificationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final NotificationEmailService notificationEmailService;
    private final PlatformTransactionManager transactionManager;

    public NotificationService(
            NotificationRepository notificationRepository,
            UtilisateurRepository utilisateurRepository,
            NotificationEmailService notificationEmailService,
            PlatformTransactionManager transactionManager
    ) {
        this.notificationRepository = notificationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.notificationEmailService = notificationEmailService;
        this.transactionManager = transactionManager;
    }

    @Transactional
    public Notification creerPourUtilisateur(
            Utilisateur utilisateur,
            String type,
            String niveau,
            String titre,
            String message,
            String lien,
            Long reservationId,
            Long maintenanceId,
            Long vehiculeId,
            boolean envoyerEmail
    ) {

        if (utilisateur == null) {
            throw new IllegalArgumentException(
                    "Utilisateur destinataire obligatoire."
            );
        }

        if (utilisateur.getMatricule() == null
                || utilisateur.getMatricule().isBlank()) {
            throw new IllegalArgumentException(
                    "Le destinataire ne possède aucun matricule."
            );
        }

        Notification notification = new Notification();

        notification.setType(normaliserType(type));
        notification.setNiveau(normaliserNiveau(niveau));
        notification.setTitre(
                texteObligatoire(
                        titre,
                        "Titre de notification obligatoire."
                )
        );
        notification.setMessage(
                texteObligatoire(
                        message,
                        "Message de notification obligatoire."
                )
        );

        notification.setDestinataireMatricule(
                utilisateur.getMatricule().trim()
        );
        notification.setDestinataireEmail(
                nettoyer(utilisateur.getEmail())
        );
        notification.setDestinataireRole(
                nettoyer(utilisateur.getRole())
        );

        notification.setLien(nettoyer(lien));
        notification.setReservationId(reservationId);
        notification.setMaintenanceId(maintenanceId);
        notification.setVehiculeId(vehiculeId);

        notification.setLu(false);
        notification.setEmailEnvoye(false);
        notification.setStatutEmail(
                envoyerEmail ? "A_ENVOYER" : "NON_DEMANDE"
        );

        notification =
                notificationRepository.save(notification);

        // L'envoi SMTP est effectue automatiquement APRES le commit,
        // par NotificationEmailDispatchService. Ne pas envoyer d'email ici :
        // une erreur SMTP ne doit jamais annuler une action metier validee.

        return notification;
    }

    @Transactional
    public Notification creerPourMatricule(
            String matricule,
            String type,
            String niveau,
            String titre,
            String message,
            String lien,
            Long reservationId,
            Long maintenanceId,
            Long vehiculeId,
            boolean envoyerEmail
    ) {

        if (matricule == null || matricule.isBlank()) {
            throw new IllegalArgumentException(
                    "Matricule destinataire obligatoire."
            );
        }

        Utilisateur utilisateur =
                utilisateurRepository
                        .findByMatricule(matricule.trim())
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "Aucun utilisateur trouvé pour le matricule "
                                                + matricule
                                )
                        );

        return creerPourUtilisateur(
                utilisateur,
                type,
                niveau,
                titre,
                message,
                lien,
                reservationId,
                maintenanceId,
                vehiculeId,
                envoyerEmail
        );
    }

    @Transactional
    public List<Notification> creerPourRole(
            String role,
            String type,
            String niveau,
            String titre,
            String message,
            String lien,
            Long reservationId,
            Long maintenanceId,
            Long vehiculeId,
            boolean envoyerEmail
    ) {

        if (role == null || role.isBlank()) {
            throw new IllegalArgumentException(
                    "Rôle destinataire obligatoire."
            );
        }

        String roleRecherche =
                role.trim().toUpperCase(Locale.ROOT);

        List<Utilisateur> utilisateurs =
                utilisateurRepository
                        .findAll()
                        .stream()
                        .filter(u -> u.getRole() != null)
                        .filter(
                                u -> roleRecherche.equals(
                                        u.getRole()
                                                .trim()
                                                .toUpperCase(Locale.ROOT)
                                )
                        )
                        .filter(
                                Utilisateur::isActif
                        )
                        .toList();

        List<Notification> creees =
                new ArrayList<>();

        for (Utilisateur utilisateur : utilisateurs) {
            try {
                creees.add(
                        creerPourUtilisateur(
                                utilisateur,
                                type,
                                niveau,
                                titre,
                                message,
                                lien,
                                reservationId,
                                maintenanceId,
                                vehiculeId,
                                envoyerEmail
                        )
                );
            } catch (Exception e) {
                System.err.println(
                        "Notification impossible pour "
                                + utilisateur.getMatricule()
                                + " : "
                                + e.getMessage()
                );
            }
        }

        return creees;
    }

    /**
     * Destine exclusivement aux notifications declenchees APRES COMMIT.
     * Chaque destinataire est traite dans une transaction independante.
     * Une erreur pour un destinataire ne marque pas la transaction de la
     * demande d'entretien comme rollback-only et n'empeche pas les autres.
     *
     * Ne pas appeler cette methode avant le commit d'une operation metier.
     */
    public List<Notification> creerPourRoleIsole(
            String role,
            String type,
            String niveau,
            String titre,
            String message,
            String lien,
            Long reservationId,
            Long maintenanceId,
            Long vehiculeId,
            boolean envoyerEmail
    ) {
        if (role == null || role.isBlank()) {
            throw new IllegalArgumentException("Role destinataire obligatoire.");
        }
        String roleRecherche = role.trim().toUpperCase(Locale.ROOT);
        TransactionTemplate transactionIsolee = new TransactionTemplate(transactionManager);
        transactionIsolee.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        // Meme la recherche des destinataires ne reutilise pas une transaction
        // Spring qui vient de se terminer (callback afterCommit).
        List<Utilisateur> destinataires = transactionIsolee.execute(status ->
                utilisateurRepository.findAll().stream()
                        .filter(u -> u.getRole() != null)
                        .filter(u -> roleRecherche.equals(
                                u.getRole().trim().toUpperCase(Locale.ROOT)))
                        .filter(Utilisateur::isActif)
                        .toList());
        if (destinataires == null || destinataires.isEmpty()) {
            return new ArrayList<>();
        }

        List<Notification> creees = new ArrayList<>();
        for (Utilisateur utilisateur : destinataires) {
            try {
                // Le commit se produit dans execute(). Une erreur differee
                // de base de donnees est ainsi interceptee ici, a l'exterieur.
                Notification notification = transactionIsolee.execute(status ->
                        creerPourUtilisateur(utilisateur, type, niveau, titre, message,
                                lien, reservationId, maintenanceId, vehiculeId, envoyerEmail));
                if (notification != null) {
                    creees.add(notification);
                }
            } catch (Exception e) {
                System.err.println("NOTIFICATION ENTRETIEN impossible pour "
                        + utilisateur.getMatricule() + " (" + roleRecherche + ") : "
                        + e.getClass().getSimpleName() + " : " + e.getMessage());
            }
        }
        return creees;
    }

    /**
     * Notification nominative indépendante, utilisée APRÈS COMMIT d'une
     * décision métier. La transaction se termine avant le retour de cette
     * méthode : un échec n'annule pas le refus déjà enregistré.
     */
    public Notification creerPourMatriculeIsole(
            String matricule,
            String type,
            String niveau,
            String titre,
            String message,
            String lien,
            Long reservationId,
            Long maintenanceId,
            Long vehiculeId,
            boolean envoyerEmail
    ) {
        if (matricule == null || matricule.isBlank()) {
            throw new IllegalArgumentException("Matricule du demandeur obligatoire.");
        }
        TransactionTemplate transactionIsolee = new TransactionTemplate(transactionManager);
        transactionIsolee.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return transactionIsolee.execute(status ->
                creerPourMatricule(matricule.trim(), type, niveau, titre, message,
                        lien, reservationId, maintenanceId, vehiculeId, envoyerEmail));
    }

    @Transactional(readOnly = true)
    public List<Notification> listerPourMatricule(
            String matricule,
            boolean seulementNonLues
    ) {

        String propre =
                texteObligatoire(
                        matricule,
                        "Matricule obligatoire."
                );

        if (seulementNonLues) {
            return notificationRepository
                    .findTop50ByDestinataireMatriculeAndLuFalseOrderByDateCreationDesc(
                            propre
                    );
        }

        return notificationRepository
                .findTop50ByDestinataireMatriculeOrderByDateCreationDesc(
                        propre
                );
    }

    @Transactional(readOnly = true)
    public long compterNonLues(String matricule) {
        return notificationRepository
                .countByDestinataireMatriculeAndLuFalse(
                        texteObligatoire(
                                matricule,
                                "Matricule obligatoire."
                        )
                );
    }

    @Transactional
    public Notification marquerCommeLue(
            Long notificationId,
            String matricule
    ) {

        Notification notification =
                notificationRepository
                        .findByIdAndDestinataireMatricule(
                                notificationId,
                                texteObligatoire(
                                        matricule,
                                        "Matricule obligatoire."
                                )
                        )
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "Notification introuvable."
                                )
                        );

        if (!Boolean.TRUE.equals(notification.getLu())) {
            notification.setLu(true);
            notification.setDateLecture(LocalDateTime.now());
            notification =
                    notificationRepository.save(notification);
        }

        return notification;
    }

    @Transactional
    public int toutMarquerCommeLu(String matricule) {

        List<Notification> notifications =
                notificationRepository
                        .findTop50ByDestinataireMatriculeAndLuFalseOrderByDateCreationDesc(
                                texteObligatoire(
                                        matricule,
                                        "Matricule obligatoire."
                                )
                        );

        LocalDateTime maintenant = LocalDateTime.now();

        for (Notification notification : notifications) {
            notification.setLu(true);
            notification.setDateLecture(maintenant);
        }

        notificationRepository.saveAll(notifications);

        return notifications.size();
    }

    private String normaliserType(String type) {
        if (type == null || type.isBlank()) {
            return "GENERAL";
        }

        return type.trim().toUpperCase(Locale.ROOT);
    }

    private String normaliserNiveau(String niveau) {
        if (niveau == null || niveau.isBlank()) {
            return "INFO";
        }

        String valeur =
                niveau.trim().toUpperCase(Locale.ROOT);

        return switch (valeur) {
            case "IMPORTANT", "URGENT", "SUCCES" -> valeur;
            default -> "INFO";
        };
    }

    private String texteObligatoire(
            String valeur,
            String erreur
    ) {
        if (valeur == null || valeur.isBlank()) {
            throw new IllegalArgumentException(erreur);
        }

        return valeur.trim();
    }

    private String nettoyer(String valeur) {
        if (valeur == null || valeur.isBlank()) {
            return null;
        }

        return valeur.trim();
    }
}
