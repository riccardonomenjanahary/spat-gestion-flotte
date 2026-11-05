package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import com.vehicule.Spat.vehicule.spat_backend.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class JustificatifParcoursTest {
    private final JustificatifRepository pieces = mock(JustificatifRepository.class);
    private final UtilisateurRepository utilisateurs = mock(UtilisateurRepository.class);
    private final ReservationRepository reservations = mock(ReservationRepository.class);
    private final StockageFichiersService stockage = mock(StockageFichiersService.class);
    private final AccesParcoursService acces = mock(AccesParcoursService.class);
    private final JustificatifController controller = new JustificatifController(pieces, mock(VehiculeRepository.class), reservations,
            mock(TransactionCarburantRepository.class), utilisateurs, stockage, acces);
    private final UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken("M001", null, List.of());

    @Test void depotIdentifieParMatriculeDuJwt() {
        Reservation r = new Reservation(); r.setId(1L);
        when(reservations.findById(1L)).thenReturn(Optional.of(r));
        Utilisateur u = new Utilisateur(); u.setMatricule("M001");
        when(utilisateurs.findByMatricule("M001")).thenReturn(Optional.of(u));
        when(stockage.stocker(any())).thenReturn("piece.pdf");
        when(pieces.save(any())).thenAnswer(inv -> inv.getArgument(0));
        var res = controller.deposerSurReservation(1L, "ORDRE_MISSION", "OM signé",
                new MockMultipartFile("fichier", "om.pdf", "application/pdf", new byte[]{1}), auth);
        assertEquals(200, res.getStatusCode().value());
        verify(acces).exigerLecture(r); verify(utilisateurs, never()).findByEmailIgnoreCase(any());
        verify(pieces).save(argThat(j -> j.getDeposePar() == u && !j.getValide()));
    }

    @Test void validationConserveAuteurEtDate() {
        Justificatif j = new Justificatif(); j.setType(TypeJustificatif.ORDRE_MISSION);
        when(pieces.findById(1L)).thenReturn(Optional.of(j));
        Utilisateur u = new Utilisateur(); u.setMatricule("M001");
        when(utilisateurs.findByMatricule("M001")).thenReturn(Optional.of(u));
        assertEquals(200, controller.valider(1L, Map.of("valide", true), auth).getStatusCode().value());
        assertTrue(j.getValide()); assertSame(u, j.getValidePar()); assertNotNull(j.getDateValidation());
    }
}
