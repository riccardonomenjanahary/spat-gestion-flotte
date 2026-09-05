package com.vehicule.Spat.vehicule.spat_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String expediteur;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void envoyerCreationCompte(
            String destinataire,
            String nomComplet,
            String matricule,
            String motDePasseTemporaire) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(expediteur);
        message.setTo(destinataire);
        message.setSubject(
                "Création de votre compte - Portail Flotte SPAT"
        );

        message.setText(
                "Bonjour " + nomComplet + ",\n\n"
                        + "Votre compte d'accès au portail de gestion de la flotte SPAT a été créé.\n\n"
                        + "Matricule : " + matricule + "\n"
                        + "Mot de passe temporaire : " + motDePasseTemporaire + "\n\n"
                        + "Pour des raisons de sécurité, veuillez modifier ce mot de passe après votre première connexion.\n\n"
                        + "Cordialement,\n"
                        + "Administration du portail SPAT"
        );

        mailSender.send(message);
    }

    public void envoyerReinitialisationMotDePasse(
            String destinataire,
            String nomComplet,
            String matricule,
            String nouveauMotDePasse) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(expediteur);
        message.setTo(destinataire);
        message.setSubject(
                "Réinitialisation de votre mot de passe - Portail Flotte SPAT"
        );

        message.setText(
                "Bonjour " + nomComplet + ",\n\n"
                        + "Votre mot de passe d'accès au portail de gestion de la flotte SPAT a été réinitialisé.\n\n"
                        + "Matricule : " + matricule + "\n"
                        + "Nouveau mot de passe temporaire : " + nouveauMotDePasse + "\n\n"
                        + "Veuillez modifier ce mot de passe après votre prochaine connexion.\n\n"
                        + "Cordialement,\n"
                        + "Administration du portail SPAT"
        );

        mailSender.send(message);
    }
}