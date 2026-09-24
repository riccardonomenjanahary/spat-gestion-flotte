package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Notification;
import com.vehicule.Spat.vehicule.spat_backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Dispatcher SMTP : hors de toute transaction metier, apres commit des notifications.
 * Le champ statut_email constitue la file d'attente persistante.
 */
@Service
@EnableScheduling
public class NotificationEmailDispatchService {

    private final NotificationRepository repository;
    private final NotificationEmailService emailService;

    @Value("${app.notifications.email.enabled:true}")
    private boolean actif;

    @Value("${app.notifications.email.max-attempts:5}")
    private int maximumTentatives;

    public NotificationEmailDispatchService(NotificationRepository repository,
                                            NotificationEmailService emailService) {
        this.repository = repository;
        this.emailService = emailService;
    }

    @Scheduled(fixedDelayString = "${app.notifications.email.poll-ms:15000}",
            initialDelayString = "${app.notifications.email.initial-delay-ms:15000}")
    public void expedierNotificationsEnAttente() {
        if (!actif) return;

        int limite = Math.max(1, maximumTentatives);
        LocalDateTime maintenant = LocalDateTime.now();
        try {
            repository.recupererEmailsInterrompus(maintenant.minusMinutes(5), maintenant);
            List<Long> ids = repository.trouverIdsEmailsATraiter(
                    maintenant, limite, PageRequest.of(0, 25));
            for (Long id : ids) {
                traiterUnEmail(id, limite);
            }
        } catch (Exception e) {
            // Une panne SMTP / BDD ne doit jamais bloquer le scheduler ou les actions metier.
            System.err.println("SPAT EMAIL : traitement temporairement indisponible : "
                    + e.getClass().getSimpleName());
        }
    }

    private void traiterUnEmail(Long id, int limite) {
        try {
            if (repository.reserverEmail(id, LocalDateTime.now(), limite) != 1) return;

            Notification notification = repository.findById(id).orElse(null);
            if (notification == null) return;

            if (notification.getDestinataireEmail() == null
                    || notification.getDestinataireEmail().isBlank()) {
                repository.enregistrerEchecEmail(id, "SANS_EMAIL",
                        "Aucune adresse email renseignée pour ce destinataire.", null);
                return;
            }

            try {
                // Les titres, textes, identifiants et liens sont ceux de la notification interne.
                emailService.envoyer(notification);
                repository.confirmerEmailEnvoye(id, LocalDateTime.now());
            } catch (Exception envoiErreur) {
                int tentatives = notification.getTentativesEmail() == null
                        ? 1 : notification.getTentativesEmail();
                // 1, 2, 4, 8 minutes; arret apres le nombre maximum de tentatives.
                long minutes = Math.min(60L, 1L << Math.min(6, Math.max(0, tentatives - 1)));
                LocalDateTime prochain = tentatives >= limite ? null
                        : LocalDateTime.now().plusMinutes(minutes);
                String erreur = envoiErreur.getClass().getSimpleName() + " : "
                        + String.valueOf(envoiErreur.getMessage());
                if (erreur.length() > 1900) erreur = erreur.substring(0, 1900);
                repository.enregistrerEchecEmail(id, "ECHEC", erreur, prochain);
                System.err.println("SPAT EMAIL : echec notification ID " + id
                        + " (tentative " + tentatives + "/" + limite + ").");
            }
        } catch (Exception e) {
            // Si la BDD tombe, EN_COURS sera repris automatiquement apres cinq minutes.
            System.err.println("SPAT EMAIL : erreur de traitement ID " + id
                    + " : " + e.getClass().getSimpleName());
        }
    }
}

