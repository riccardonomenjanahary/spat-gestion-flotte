package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Notification;

import jakarta.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class NotificationEmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:${spring.mail.username:}}")
    private String adresseExpediteur;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    public NotificationEmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void envoyer(Notification notification) throws Exception {

        if (notification == null) {
            return;
        }

        String email = notification.getDestinataireEmail();

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "Le destinataire ne possède aucune adresse email."
            );
        }

        MimeMessage mimeMessage = mailSender.createMimeMessage();

        MimeMessageHelper helper = new MimeMessageHelper(
                mimeMessage,
                false,
                StandardCharsets.UTF_8.name()
        );

        if (adresseExpediteur != null && !adresseExpediteur.isBlank()) {
            helper.setFrom(adresseExpediteur.trim());
        }

        helper.setTo(email.trim());

        helper.setSubject(
                "SPAT Parc Auto - " + notification.getTitre()
        );

        helper.setText(
                construireHtml(notification),
                true
        );

        mailSender.send(mimeMessage);
    }

    private String construireHtml(Notification notification) {

        String couleur = couleurNiveau(notification.getNiveau());

        String bouton = "";

        if (notification.getLien() != null
                && !notification.getLien().isBlank()) {

            String url = construireUrl(notification.getLien());

            bouton = """
                    <div style="margin-top:22px;">
                      <a href="%s"
                         style="
                           display:inline-block;
                           padding:11px 18px;
                           border-radius:8px;
                           background:#111827;
                           color:#ffffff;
                           text-decoration:none;
                           font-weight:700;
                           font-size:13px;
                         ">
                        Ouvrir SPAT Parc Auto
                      </a>
                    </div>
                    """.formatted(echapperHtml(url));
        }

        return """
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                  <meta charset="UTF-8">
                </head>
                <body style="
                  margin:0;
                  padding:0;
                  background:#f3f4f6;
                  font-family:Arial,Helvetica,sans-serif;
                  color:#111827;
                ">
                  <div style="
                    max-width:640px;
                    margin:30px auto;
                    padding:0 16px;
                  ">
                    <div style="
                      background:#ffffff;
                      border:1px solid #e5e7eb;
                      border-radius:14px;
                      overflow:hidden;
                      box-shadow:0 8px 28px rgba(15,23,42,0.08);
                    ">
                      <div style="
                        height:6px;
                        background:%s;
                      "></div>

                      <div style="padding:26px;">
                        <div style="
                          color:#6b7280;
                          font-size:12px;
                          font-weight:700;
                          letter-spacing:0.08em;
                          text-transform:uppercase;
                          margin-bottom:10px;
                        ">
                          SPAT Parc Auto
                        </div>

                        <h2 style="
                          margin:0 0 14px;
                          font-size:20px;
                          color:#111827;
                        ">
                          %s
                        </h2>

                        <p style="
                          margin:0;
                          font-size:14px;
                          line-height:1.65;
                          color:#374151;
                          white-space:pre-line;
                        ">
                          %s
                        </p>

                        %s
                      </div>

                      <div style="
                        padding:14px 26px;
                        background:#f9fafb;
                        border-top:1px solid #e5e7eb;
                        color:#9ca3af;
                        font-size:11px;
                      ">
                        Notification automatique - SPAT Parc Auto
                      </div>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(
                couleur,
                echapperHtml(notification.getTitre()),
                echapperHtml(notification.getMessage()),
                bouton
        );
    }

    private String construireUrl(String lien) {

        String propre = lien.trim();

        if (propre.startsWith("http://")
                || propre.startsWith("https://")) {
            return propre;
        }

        String base =
                frontendUrl == null
                        ? ""
                        : frontendUrl.trim();

        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }

        if (!propre.startsWith("/")) {
            propre = "/" + propre;
        }

        return base + propre;
    }

    private String couleurNiveau(String niveau) {

        if (niveau == null) {
            return "#2563eb";
        }

        return switch (niveau.trim().toUpperCase()) {
            case "URGENT" -> "#dc2626";
            case "IMPORTANT" -> "#d97706";
            case "SUCCES" -> "#16a34a";
            default -> "#2563eb";
        };
    }

    private String echapperHtml(String valeur) {

        if (valeur == null) {
            return "";
        }

        return valeur
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
