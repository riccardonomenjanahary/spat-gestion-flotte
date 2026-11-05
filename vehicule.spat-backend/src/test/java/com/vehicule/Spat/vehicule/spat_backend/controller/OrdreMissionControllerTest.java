package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.EnvoyerOrdreMissionEmailRequest;
import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.EmailService;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.*;

class OrdreMissionControllerTest {
    private final ReservationRepository reservations = mock(ReservationRepository.class);
    private final UtilisateurRepository utilisateurs = mock(UtilisateurRepository.class);
    private final EmailService emails = mock(EmailService.class);
    private final OrdreMissionController controller = new OrdreMissionController(reservations, utilisateurs, emails);

    @Test
    void destinataireEtEnvoiUtilisentLeMatriculeDuBeneficiaire() {
        Reservation reservation = new Reservation();
        reservation.setId(42L);
        reservation.setDemandeurMatricule("SPAT00123");
        reservation.setDemandeurNom("RAKOTO");
        reservation.setDemandeurPrenom("Jean");
        when(reservations.findById(42L)).thenReturn(Optional.of(reservation));

        Utilisateur personnel = new Utilisateur();
        personnel.setMatricule("SPAT00123");
        personnel.setNomComplet("Jean RAKOTO");
        personnel.setEmail("jean.rakoto@port-toamasina.mg");
        when(utilisateurs.findByMatricule("SPAT00123")).thenReturn(Optional.of(personnel));

        var destinataire = controller.obtenirDestinataire(42L);
        assertEquals("jean.rakoto@port-toamasina.mg",
            ((OrdreMissionController.DestinataireOrdreMission) destinataire.getBody()).email());

        when(emails.envoyerOrdreMission(eq("jean.rakoto@port-toamasina.mg"), eq("Jean RAKOTO"),
                eq(42L), any(byte[].class), eq("om.pdf"))).thenReturn(true);
        String pdfBase64 = Base64.getEncoder().encodeToString("%PDF-1.4".getBytes(StandardCharsets.US_ASCII));
        var envoi = controller.envoyerAuDemandeur(42L, new EnvoyerOrdreMissionEmailRequest(pdfBase64, "om.pdf"));

        assertEquals(200, envoi.getStatusCode().value());
        verify(emails).envoyerOrdreMission(eq("jean.rakoto@port-toamasina.mg"), eq("Jean RAKOTO"),
                eq(42L), any(byte[].class), eq("om.pdf"));
    }

    @Test
    void aucunEmailNestRetourneOuEnvoyeSansEmailDuPersonnel() {
        Reservation reservation = new Reservation();
        reservation.setId(43L);
        reservation.setDemandeurMatricule("SPAT00456");
        when(reservations.findById(43L)).thenReturn(Optional.of(reservation));
        Utilisateur personnel = new Utilisateur();
        personnel.setMatricule("SPAT00456");
        when(utilisateurs.findByMatricule("SPAT00456")).thenReturn(Optional.of(personnel));

        var destinataire = controller.obtenirDestinataire(43L);
        assertNull(((OrdreMissionController.DestinataireOrdreMission) destinataire.getBody()).email());
        verifyNoInteractions(emails);
    }
}
