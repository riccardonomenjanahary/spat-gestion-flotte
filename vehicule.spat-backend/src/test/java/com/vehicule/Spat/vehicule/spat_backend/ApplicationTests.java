package com.vehicule.Spat.vehicule.spat_backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:spat-context;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "spring.flyway.enabled=false",
        "jwt.secret=spat-context-test-only-secret-key-with-at-least-sixty-four-characters-123456",
        "app.frontend.url=http://localhost:3000",
        "gps.enabled=false",
        "gps.identifier=",
        "gps.password=",
        "spring.mail.username=",
        "spring.mail.password=",
        "app.uploads.dir=./target/test-uploads",
        "app.notifications.email.enabled=false",
        "app.notifications.email.initial-delay-ms=3600000"
})
class ApplicationTests {
    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.context.ApplicationContext contexte;

    @Test
    void smtpLentNeBloquePasLePlanificateurGps() throws Exception {
        var smtp = contexte.getBean("mailDispatchScheduler", org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler.class);
        var gps = contexte.getBean("gpsTaskScheduler", org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler.class);
        var debutEnvoi = new java.util.concurrent.CountDownLatch(1);
        var finEnvoi = new java.util.concurrent.CountDownLatch(1);
        var evenementGps = new java.util.concurrent.CountDownLatch(1);
        smtp.execute(() -> {
            debutEnvoi.countDown();
            try { finEnvoi.await(5, java.util.concurrent.TimeUnit.SECONDS); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        try {
            org.junit.jupiter.api.Assertions.assertTrue(debutEnvoi.await(2, java.util.concurrent.TimeUnit.SECONDS));
            gps.execute(evenementGps::countDown);
            org.junit.jupiter.api.Assertions.assertTrue(evenementGps.await(2, java.util.concurrent.TimeUnit.SECONDS));
        } finally { finEnvoi.countDown(); }
    }

	@Test
	void contextLoads() {
	}

}
