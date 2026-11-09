package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Notification;
import com.vehicule.Spat.vehicule.spat_backend.repository.NotificationRepository;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDateTime;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class NotificationEmailDispatchServiceTest {
    private final NotificationRepository repository = mock(NotificationRepository.class);
    private final NotificationEmailService email = mock(NotificationEmailService.class);
    private final NotificationEmailDispatchService dispatcher = new NotificationEmailDispatchService(repository, email);
    private final Notification notification = new Notification();

    @BeforeEach void preparer() {
        ReflectionTestUtils.setField(dispatcher, "actif", true);
        ReflectionTestUtils.setField(dispatcher, "maximumTentatives", 5);
        notification.setId(1L); notification.setDestinataireEmail("recette@example.invalid"); notification.setTentativesEmail(1);
        when(repository.trouverIdsEmailsATraiter(any(), eq(5), any())).thenReturn(List.of(1L));
        when(repository.reserverEmail(eq(1L), any(), eq(5))).thenReturn(1);
        when(repository.findById(1L)).thenReturn(java.util.Optional.of(notification));
    }

    @Test void unSeulEnvoiApresReservationAtomique() throws Exception {
        dispatcher.expedierNotificationsEnAttente();
        var ordre = inOrder(repository, email);
        ordre.verify(repository).recupererEmailsInterrompus(any(), any());
        ordre.verify(repository).trouverIdsEmailsATraiter(any(), eq(5), any());
        ordre.verify(repository).reserverEmail(eq(1L), any(), eq(5));
        ordre.verify(repository).findById(1L);
        ordre.verify(email).envoyer(notification);
        ordre.verify(repository).confirmerEmailEnvoye(eq(1L), any());
    }

    @Test void autreInstanceAyantReserveEmpecheDoubleEnvoi() {
        when(repository.reserverEmail(eq(1L), any(), eq(5))).thenReturn(0);
        dispatcher.expedierNotificationsEnAttente();
        verifyNoInteractions(email);
    }

    @Test void echecSmtpProgrammeRepriseSansFauxSucces() throws Exception {
        notification.setTentativesEmail(2);
        doThrow(new IllegalStateException("SMTP indisponible")).when(email).envoyer(notification);
        LocalDateTime avant = LocalDateTime.now(); dispatcher.expedierNotificationsEnAttente();
        verify(repository).enregistrerEchecEmail(eq(1L), eq("ECHEC"), contains("SMTP indisponible"),
                argThat(date -> date != null && !date.isBefore(avant.plusMinutes(2)) && date.isBefore(LocalDateTime.now().plusMinutes(3))));
        verify(repository, never()).confirmerEmailEnvoye(anyLong(), any());
    }

    @Test void cinquiemeEchecArreteLesRelances() throws Exception {
        notification.setTentativesEmail(5);
        doThrow(new IllegalStateException("SMTP indisponible")).when(email).envoyer(notification);
        dispatcher.expedierNotificationsEnAttente();
        verify(repository).enregistrerEchecEmail(eq(1L), eq("ECHEC"), anyString(), isNull());
    }

    @Test void destinataireManquantNEmetPasDeMessage() {
        notification.setDestinataireEmail(null); dispatcher.expedierNotificationsEnAttente();
        verifyNoInteractions(email);
        verify(repository).enregistrerEchecEmail(eq(1L), eq("SANS_EMAIL"), anyString(), isNull());
    }

    @Test void panneBddNeTuePasLePlanificateur() {
        when(repository.trouverIdsEmailsATraiter(any(), anyInt(), any())).thenThrow(new IllegalStateException("BDD indisponible"));
        assertDoesNotThrow(dispatcher::expedierNotificationsEnAttente);
        verifyNoInteractions(email);
    }

    @Test void modeDesactiveNeFaitAucunEnvoi() {
        ReflectionTestUtils.setField(dispatcher, "actif", false); dispatcher.expedierNotificationsEnAttente();
        verifyNoInteractions(repository, email);
    }
}
