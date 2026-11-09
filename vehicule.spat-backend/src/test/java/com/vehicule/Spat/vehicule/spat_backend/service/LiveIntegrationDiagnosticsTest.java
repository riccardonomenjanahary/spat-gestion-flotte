package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Opt-in uniquement : accès réseau réel, aucune écriture dans la base métier. */
@EnabledIfEnvironmentVariable(named = "SPAT_LIVE_DIAGNOSTICS", matches = "true")
class LiveIntegrationDiagnosticsTest {
    private Properties configuration() throws Exception {
        Properties p = new Properties();
        try (var lecteur = Files.newBufferedReader(Path.of("src/main/resources/application.properties"))) { p.load(lecteur); }
        return p;
    }

    private String valeur(Properties p, String cle) {
        return resoudre(p.getProperty(cle, ""));
    }

    private String resoudre(String valeur) {
        if (valeur.startsWith("${") && valeur.endsWith("}")) {
            String[] parties = valeur.substring(2, valeur.length() - 1).split(":", 2);
            return resoudre(System.getenv().getOrDefault(parties[0], parties.length > 1 ? parties[1] : ""));
        }
        return valeur;
    }

    private JavaMailSenderImpl smtp(Properties p) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(valeur(p, "spring.mail.host")); sender.setPort(Integer.parseInt(valeur(p, "spring.mail.port")));
        sender.setUsername(valeur(p, "spring.mail.username")); sender.setPassword(valeur(p, "spring.mail.password"));
        Properties options = new Properties();
        for (String cle : p.stringPropertyNames()) {
            if (cle.startsWith("spring.mail.properties.")) options.setProperty(cle.substring("spring.mail.properties.".length()), valeur(p, cle));
        }
        sender.setJavaMailProperties(options);
        return sender;
    }

    @Test @Timeout(45)
    void authentificationSmtpReelleSansEnvoi() throws Exception {
        smtp(configuration()).testConnection();
        System.out.println("DIAGNOSTIC SMTP: TLS et authentification acceptes, aucun message envoye.");
    }

    @Test @Timeout(90)
    @EnabledIfEnvironmentVariable(named = "SPAT_DIAGNOSTIC_RECIPIENT", matches = ".+")
    void envoyerUnUniqueEmailTechniqueEtVerifierReception() throws Exception {
        Properties p = configuration();
        JavaMailSenderImpl sender = smtp(p);
        String destinataire = System.getenv("SPAT_DIAGNOSTIC_RECIPIENT");
        assertEquals(sender.getUsername(), destinataire, "Cette recette est limitee a la boite SMTP du projet.");
        String reference = "SPAT-RECETTE-" + java.util.UUID.randomUUID();
        var notification = new com.vehicule.Spat.vehicule.spat_backend.model.Notification();
        notification.setDestinataireEmail(destinataire); notification.setTitre(reference);
        notification.setNiveau("INFO"); notification.setMessage("Test technique d'envoi et de reception. Aucune donnee metier. Reference : " + reference);
        var service = new NotificationEmailService(sender);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "adresseExpediteur", valeur(p, "app.mail.from"));
        service.envoyer(notification);
        System.out.println("DIAGNOSTIC EMAIL: message technique accepte par SMTP, reference=" + reference);

        Properties options = new Properties();
        options.setProperty("mail.imaps.connectiontimeout", "10000"); options.setProperty("mail.imaps.timeout", "10000");
        options.setProperty("mail.imaps.ssl.checkserveridentity", "true");
        try (var boite = jakarta.mail.Session.getInstance(options).getStore("imaps")) {
            boite.connect("imap.gmail.com", 993, sender.getUsername(), sender.getPassword());
            var reception = boite.getFolder("INBOX"); reception.open(jakarta.mail.Folder.READ_ONLY);
            try {
                boolean recu = false;
                for (int essai = 0; essai < 6 && !recu; essai++) {
                    recu = reception.search(new jakarta.mail.search.SubjectTerm(reference)).length > 0;
                    if (!recu) Thread.sleep(2000);
                }
                assertTrue(recu, "SMTP a accepte le message mais la reception dans INBOX n'est pas encore confirmee.");
                System.out.println("DIAGNOSTIC EMAIL: reception INBOX confirmee pour " + reference);
            } finally { reception.close(false); }
        }
    }

    @Test @Timeout(180)
    void gpsReelAuthentificationEtPositionsSansEcritureMetier() throws Exception {
        Properties p = configuration();
        long[] appareils = {3756, 3760, 3761, 3765, 3763, 3758, 3762, 3759, 3764, 3851};
        List<Vehicule> flotte = new ArrayList<>();
        for (long appareil : appareils) {
            Vehicule v = new Vehicule(); v.setId(appareil); v.setGpsDeviceId(appareil); v.setGpsEquipe(true); v.setImmatriculation("DIAGNOSTIC-" + appareil); flotte.add(v);
        }
        var vehicules = mock(VehiculeRepository.class); when(vehicules.findAll()).thenReturn(flotte);
        var gps = new GpsService(vehicules, mock(GpsHistoriqueService.class), true,
                valeur(p, "gps.base-url"), valeur(p, "gps.items-path"), valeur(p, "gps.items-json-path"),
                valeur(p, "gps.identifier"), valeur(p, "gps.password"));
        gps.initialiserGps();
        var positions = gps.getPositions();
        long valides = positions.stream().filter(r -> r.getLatitude() != null && r.getLongitude() != null
                && Double.isFinite(r.getLatitude()) && Double.isFinite(r.getLongitude())
                && Math.abs(r.getLatitude()) <= 90 && Math.abs(r.getLongitude()) <= 180
                && !(r.getLatitude() == 0 && r.getLongitude() == 0)).count();
        long recentes = positions.stream().filter(r -> r.getTimestampGps() != null
                && Math.abs(Instant.now().getEpochSecond() - r.getTimestampGps()) <= 300).count();
        System.out.printf("DIAGNOSTIC GPS: appareils=%d positions=%d coordonnees_valides=%d moins_de_5_minutes=%d%n", appareils.length, positions.size(), valides, recentes);
        assertFalse(positions.isEmpty(), "Aucune position retournee par le fournisseur GPS.");
        assertEquals(positions.size(), valides, "Des coordonnees GPS sont invalides.");
    }
}
