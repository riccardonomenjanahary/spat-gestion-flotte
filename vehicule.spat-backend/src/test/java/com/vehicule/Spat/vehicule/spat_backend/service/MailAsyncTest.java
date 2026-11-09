package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.config.MailAsyncConfig;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.*;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MailAsyncTest {
    @Configuration @Import(MailAsyncConfig.class)
    static class Recette {
        @Bean JavaMailSender mailSender() { return mock(JavaMailSender.class); }
        @Bean EmailService emailService(JavaMailSender sender) {
            EmailService service = new EmailService(sender);
            ReflectionTestUtils.setField(service, "expediteur", "recette@example.invalid");
            return service;
        }
    }

    @Test void emailCreationUtiliseLePoolDedieEtRetourneUnResultat() throws Exception {
        try (var contexte = new AnnotationConfigApplicationContext(Recette.class)) {
            var threadEnvoi = new AtomicReference<String>();
            doAnswer(invocation -> { threadEnvoi.set(Thread.currentThread().getName()); return null; })
                    .when(contexte.getBean(JavaMailSender.class)).send(any(SimpleMailMessage.class));
            var resultat = contexte.getBean(EmailService.class).envoyerCreationCompte(
                    "recette@example.invalid", "Recette technique", "TEST", "temporary-test-password");
            assertTrue(resultat.get(5, TimeUnit.SECONDS));
            assertNotNull(threadEnvoi.get());
            assertTrue(threadEnvoi.get().startsWith("spat-mail-"));
        }
    }
}
