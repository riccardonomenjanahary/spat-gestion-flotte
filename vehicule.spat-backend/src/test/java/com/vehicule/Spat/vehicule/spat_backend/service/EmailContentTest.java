package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Notification;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmailContentTest {
    private final JavaMailSender sender = mock(JavaMailSender.class);
    private final MimeMessage mime = new MimeMessage(Session.getInstance(new Properties()));

    @Test void notificationEncodeContenuEtLienSansPerdreAccents() throws Exception {
        when(sender.createMimeMessage()).thenReturn(mime);
        var service = new NotificationEmailService(sender);
        ReflectionTestUtils.setField(service, "adresseExpediteur", "recette@example.invalid");
        ReflectionTestUtils.setField(service, "frontendUrl", "https://parc.example.invalid/");
        Notification n = new Notification(); n.setDestinataireEmail("destinataire@example.invalid");
        n.setTitre("Inspection à valider"); n.setMessage("<script>indesirable</script> & contrôle");
        n.setLien("/chef-service-logistique"); n.setNiveau("IMPORTANT");
        service.envoyer(n);
        verify(sender).send(mime);
        assertEquals("SPAT Parc Auto - Inspection à valider", mime.getSubject());
        String contenu = (String) mime.getContent();
        assertTrue(contenu.contains("&lt;script&gt;indesirable&lt;/script&gt; &amp; contrôle"));
        assertTrue(contenu.contains("https://parc.example.invalid/chef-service-logistique"));
        assertFalse(contenu.contains("<script>"));
    }

    @Test void ordreMissionContientLePdfEnPieceJointe() throws Exception {
        when(sender.createMimeMessage()).thenReturn(mime);
        var service = new EmailService(sender);
        ReflectionTestUtils.setField(service, "expediteur", "recette@example.invalid");
        byte[] pdf = "%PDF-1.4\nRecette technique".getBytes(StandardCharsets.UTF_8);
        assertTrue(service.envoyerOrdreMission("destinataire@example.invalid", "Recette", 42L, pdf, "ordre-mission.pdf"));
        verify(sender).send(mime);
        var parties = (MimeMultipart) mime.getContent();
        boolean pieceTrouvee = false;
        for (int i = 0; i < parties.getCount(); i++) {
            var partie = parties.getBodyPart(i);
            if ("ordre-mission.pdf".equals(partie.getFileName())) {
                pieceTrouvee = true;
                assertArrayEquals(pdf, partie.getInputStream().readAllBytes());
            }
        }
        assertTrue(pieceTrouvee);
    }

    @Test void refusSmtpOrdreMissionNeRetournePasUnFauxSucces() {
        when(sender.createMimeMessage()).thenReturn(mime);
        doThrow(new org.springframework.mail.MailSendException("SMTP indisponible")).when(sender).send(any(MimeMessage.class));
        var service = new EmailService(sender);
        ReflectionTestUtils.setField(service, "expediteur", "recette@example.invalid");
        assertFalse(service.envoyerOrdreMission("destinataire@example.invalid", "Recette", 42L,
                "%PDF-1.4".getBytes(StandardCharsets.UTF_8), "ordre.pdf"));
    }
}
