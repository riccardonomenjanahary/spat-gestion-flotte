package com.vehicule.Spat.vehicule.spat_backend.service;

import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    /*
     * Compte utilisé pour l'authentification SMTP.
     * Cette propriété existait déjà dans ton projet.
     */
    @Value("${spring.mail.username}")
    private String compteSmtp;

    /*
     * IMPORTANT :
     * On met une valeur par défaut pour éviter que Spring Boot
     * s'arrête au démarrage si app.mail.from n'a pas encore été
     * ajouté dans application.properties.
     */
    @Value("${app.mail.from:noreply-evaluation.spat@port-toamasina.com}")
    private String expediteur;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // ============================================================
    // VERIFICATION CONFIGURATION EMAIL AU DEMARRAGE
    // ============================================================

    @PostConstruct
    public void verifierConfigurationEmail() {

        System.out.println(
                "========== CONFIGURATION EMAIL =========="
        );

        System.out.println(
                "Compte SMTP utilisé : " + compteSmtp
        );

        System.out.println(
                "Expéditeur visible : " + expediteur
        );

        System.out.println(
                "=========================================="
        );
    }

    // ============================================================
    // EMAIL CREATION DE COMPTE
    // ============================================================

    @Async("mailTaskExecutor")
    public CompletableFuture<Boolean> envoyerCreationCompte(
            String destinataire,
            String nomComplet,
            String matricule,
            String motDePasseTemporaire
    ) {

        try {

            System.out.println(
                    "[EMAIL] Tentative création compte vers : "
                            + destinataire
            );

            SimpleMailMessage message =
                    new SimpleMailMessage();

            message.setFrom(expediteur);
            message.setTo(destinataire);

            message.setSubject(
                    "Création de votre compte - Portail Flotte SPAT"
            );

            message.setText(
                    "Bonjour " + nomComplet + ",\n\n"

                            + "Votre compte d'accès au portail de gestion de la flotte SPAT a été créé.\n\n"

                            + "Matricule : "
                            + matricule
                            + "\n"

                            + "Mot de passe temporaire : "
                            + motDePasseTemporaire
                            + "\n\n"

                            + "Pour des raisons de sécurité, veuillez modifier ce mot de passe après votre première connexion.\n\n"

                            + "Cordialement,\n"

                            + "Administration du portail SPAT"
            );

            mailSender.send(message);

            System.out.println(
                    "[EMAIL] Création compte acceptée par SMTP pour : "
                            + destinataire
            );

            return CompletableFuture.completedFuture(true);

        } catch (Exception e) {

            afficherErreurEmail(
                    "CREATION COMPTE",
                    destinataire,
                    e
            );

            return CompletableFuture.completedFuture(false);
        }
    }

    // ============================================================
    // EMAIL REINITIALISATION MOT DE PASSE
    // ============================================================

    @Async("mailTaskExecutor")
    public CompletableFuture<Boolean> envoyerReinitialisationMotDePasse(
            String destinataire,
            String nomComplet,
            String matricule,
            String nouveauMotDePasse
    ) {

        try {

            System.out.println(
                    "[EMAIL] Tentative réinitialisation vers : "
                            + destinataire
            );

            SimpleMailMessage message =
                    new SimpleMailMessage();

            message.setFrom(expediteur);
            message.setTo(destinataire);

            message.setSubject(
                    "Réinitialisation de votre mot de passe - Portail Flotte SPAT"
            );

            message.setText(
                    "Bonjour " + nomComplet + ",\n\n"

                            + "Votre mot de passe d'accès au portail de gestion de la flotte SPAT a été réinitialisé.\n\n"

                            + "Matricule : "
                            + matricule
                            + "\n"

                            + "Nouveau mot de passe : "
                            + nouveauMotDePasse
                            + "\n\n"

                            + "Ce mot de passe est maintenant votre mot de passe actif. "
                            + "Il restera valable jusqu'à ce que vous le changiez "
                            + "ou qu'une nouvelle réinitialisation soit effectuée.\n\n"

                            + "Cordialement,\n"

                            + "Administration du portail SPAT"
            );

            mailSender.send(message);

            System.out.println(
                    "[EMAIL] Réinitialisation acceptée par SMTP pour : "
                            + destinataire
            );

            return CompletableFuture.completedFuture(true);

        } catch (Exception e) {

            afficherErreurEmail(
                    "REINITIALISATION MOT DE PASSE",
                    destinataire,
                    e
            );

            return CompletableFuture.completedFuture(false);
        }
    }

    // ============================================================
    // GESTION CENTRALISEE DES ERREURS EMAIL
    // ============================================================

    private void afficherErreurEmail(
            String operation,
            String destinataire,
            Exception e
    ) {

        System.err.println(
                "========== ERREUR EMAIL "
                        + operation
                        + " =========="
        );

        System.err.println(
                "Destinataire : "
                        + destinataire
        );

        System.err.println(
                "Compte SMTP : "
                        + compteSmtp
        );

        System.err.println(
                "Expéditeur : "
                        + expediteur
        );

        System.err.println(
                "Type : "
                        + e.getClass().getName()
        );

        System.err.println(
                "Message : "
                        + e.getMessage()
        );

        e.printStackTrace();

        System.err.println(
                "============================================"
        );
    }
}
