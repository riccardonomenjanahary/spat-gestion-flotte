package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.ClotureMissionAssistantDirectionRequest;
import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import com.vehicule.Spat.vehicule.spat_backend.service.*;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.LocalDateTime;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class ClotureProfilsTest {
    private final ReservationRepository reservations = mock(ReservationRepository.class);
    private final UtilisateurRepository utilisateurs = mock(UtilisateurRepository.class);
    private final ReservationController assistant = new ReservationController(reservations, mock(VehiculeRepository.class),
            mock(ChauffeurRepository.class), mock(ChauffeurAutoService.class), utilisateurs,
            mock(DisponibiliteReservationService.class), mock(MaintenanceService.class), mock(NotificationService.class),
            mock(MaintenanceRepository.class), mock(SignalementEntretienChauffeurRepository.class),
            mock(TransactionCarburantRepository.class), mock(ReglesDispositifService.class), mock(AccesParcoursService.class));
    private Reservation r;
    private Utilisateur u;

    @BeforeEach void preparer() {
        u = new Utilisateur(); u.setId(1L); u.setRole("ASSISTANT_DIRECTION"); u.setDirectionId(1L);
        when(utilisateurs.findByMatricule("A1")).thenReturn(Optional.of(u));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("A1", null, List.of()));
        r = new Reservation(); r.setId(1L); r.setStatut("EN_ATTENTE"); r.setZoneMission("VILLE_TOAMASINA");
        r.setDateDebut(LocalDateTime.now().minusHours(2)); r.setDateFin(LocalDateTime.now().minusHours(1));
        Vehicule v = new Vehicule(); v.setCategorie(CategorieVehicule.MOTO_ELECTRIQUE);
        Direction d = new Direction(); d.setId(1L); v.getDirections().add(d); r.setVehicule(v);
        when(reservations.findByIdForUpdate(1L)).thenReturn(Optional.of(r));
        when(reservations.save(r)).thenReturn(r);
    }
    @AfterEach void nettoyer() { SecurityContextHolder.clearContext(); }
    private ClotureMissionAssistantDirectionRequest retour() {
        var retour = new ClotureMissionAssistantDirectionRequest();
        retour.setDateHeureRetour(LocalDateTime.now().minusMinutes(1)); return retour;
    }
    @Test void pasDeClotureSansValidation() {
        assertEquals(409, assistant.cloturerMissionAssistantDirection(1L, retour()).getStatusCode().value());
        verify(reservations, never()).save(any());
    }
    @Test void pasDeClotureAutreGroupe() {
        u.setDirectionId(3L); r.setStatut("VALIDEE");
        assertEquals(403, assistant.cloturerMissionAssistantDirection(1L, retour()).getStatusCode().value());
    }
    @Test void groupePartagePeutCloturerMissionValidee() {
        r.setStatut("VALIDEE");
        Utilisateur demandeur = new Utilisateur(); demandeur.setDirectionId(2L); r.setDemandeur(demandeur);
        assertEquals(200, assistant.cloturerMissionAssistantDirection(1L, retour()).getStatusCode().value());
        assertEquals("CLOTUREE", r.getStatut()); assertTrue(r.getDureeUtilisationMinutes() > 0);
    }
    @Test void retourFuturRefuse() {
        r.setStatut("VALIDEE"); var retour = retour(); retour.setDateHeureRetour(LocalDateTime.now().plusHours(1));
        assertEquals(400, assistant.cloturerMissionAssistantDirection(1L, retour).getStatusCode().value());
    }
    @Test void calendrierNePartagePasLesVehiculesDunAutreGroupe() {
        Reservation autre = new Reservation(); autre.setId(2L);
        Vehicule v = new Vehicule(); v.setCategorie(CategorieVehicule.MUTUALISEE);
        Direction d2 = new Direction(); d2.setId(2L); v.getDirections().add(d2);
        Direction d3 = new Direction(); d3.setId(3L); v.getDirections().add(d3); autre.setVehicule(v);
        // Le demandeur peut appartenir à une Direction partageant un autre véhicule :
        // cela n'autorise pas la consultation de tous ses déplacements.
        Utilisateur demandeur = new Utilisateur(); demandeur.setDirectionId(2L); autre.setDemandeur(demandeur);
        when(reservations.findAllByOrderByDateCreationDesc()).thenReturn(List.of(r, autre));
        var res = assistant.missionsIntraToamasinaAssistant();
        assertEquals(List.of(r), res.getBody());
    }
}
