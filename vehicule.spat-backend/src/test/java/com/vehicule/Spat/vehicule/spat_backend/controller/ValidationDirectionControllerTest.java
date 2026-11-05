package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.DecisionReservationRequest;
import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import com.vehicule.Spat.vehicule.spat_backend.service.*;
import org.junit.jupiter.api.*;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ValidationDirectionControllerTest {
    private final ReservationRepository reservations = mock(ReservationRepository.class);
    private final VehiculeRepository vehicules = mock(VehiculeRepository.class);
    private final ChauffeurRepository chauffeurs = mock(ChauffeurRepository.class);
    private final AccesParcoursService acces = mock(AccesParcoursService.class);
    private final ReglesDispositifService regles = mock(ReglesDispositifService.class);
    private final ValidationDirectionController controller = new ValidationDirectionController(reservations, vehicules, chauffeurs, acces, regles);
    private Reservation r;
    private Utilisateur assistant;
    private DecisionReservationRequest decision;

    @BeforeEach void preparer() {
        assistant = new Utilisateur(); assistant.setRole("ASSISTANT_DIRECTION"); assistant.setId(1L);
        when(acces.courant()).thenReturn(assistant);
        Vehicule v = new Vehicule(); v.setId(2L); v.setCategorie(CategorieVehicule.MOTO_ELECTRIQUE);
        r = new Reservation(); r.setId(3L); r.setVehicule(v); r.setStatut("EN_ATTENTE");
        r.setDateDebut(LocalDateTime.now().plusDays(2)); r.setDateFin(r.getDateDebut().plusHours(1));
        when(reservations.findByIdForUpdate(3L)).thenReturn(Optional.of(r));
        when(vehicules.findByIdForUpdate(2L)).thenReturn(Optional.of(v));
        when(acces.directionVehicule(assistant, v)).thenReturn(true);
        when(reservations.save(r)).thenReturn(r);
        decision = new DecisionReservationRequest(); decision.setStatut("VALIDEE");
    }

    @Test void validationTracee() {
        assertEquals(200, controller.decider(3L, decision).getStatusCode().value());
        assertEquals("VALIDEE", r.getStatut()); assertSame(assistant, r.getValidationN1Par());
        assertSame(assistant, r.getValidationN2Par()); assertNotNull(r.getDateValidationN2());
    }
    @Test void autreDirectionInterdite() {
        when(acces.directionVehicule(assistant, r.getVehicule())).thenReturn(false);
        assertEquals(403, controller.decider(3L, decision).getStatusCode().value());
        verify(reservations, never()).save(any());
    }
    @Test void vehiculeMissionInterditAssistante() {
        r.getVehicule().setCategorie(CategorieVehicule.MISSION);
        assertEquals(403, controller.decider(3L, decision).getStatusCode().value());
    }
    @Test void validationApresDepartInterdite() {
        r.setDateDebut(LocalDateTime.now().minusMinutes(1));
        assertEquals(409, controller.decider(3L, decision).getStatusCode().value());
    }
    @Test void doubleValidationInterdite() {
        r.setStatut("VALIDEE"); assertEquals(409, controller.decider(3L, decision).getStatusCode().value());
    }
    @Test void refusExigeMotif() {
        decision.setStatut("REFUSEE"); assertEquals(400, controller.decider(3L, decision).getStatusCode().value());
        decision.setMotifRefus("Véhicule réservé à un déplacement prioritaire");
        assertEquals(200, controller.decider(3L, decision).getStatusCode().value());
        assertSame(assistant, r.getRefusePar()); assertNotNull(r.getDateRefus());
    }
    @Test void erreurMetierNeModifiePasAffectation() {
        r.getVehicule().setCategorie(CategorieVehicule.MUTUALISEE);
        Chauffeur c = new Chauffeur(); c.setId(8L); decision.setChauffeurId(8L);
        when(chauffeurs.findByIdForUpdate(8L)).thenReturn(Optional.of(c));
        when(regles.verifier(any())).thenReturn("Permis expiré");
        assertEquals(409, controller.decider(3L, decision).getStatusCode().value());
        assertNull(r.getChauffeur()); assertEquals("EN_ATTENTE", r.getStatut());
        verify(reservations, never()).save(any());
    }
}
