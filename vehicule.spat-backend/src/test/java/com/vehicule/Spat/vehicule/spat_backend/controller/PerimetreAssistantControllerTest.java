package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import com.vehicule.Spat.vehicule.spat_backend.service.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PerimetreAssistantControllerTest {
    private final VehiculeRepository vehicules = mock(VehiculeRepository.class);
    private final UtilisateurRepository utilisateurs = mock(UtilisateurRepository.class);
    private final ReservationRepository reservations = mock(ReservationRepository.class);
    private final SignalementIncidentRepository incidents = mock(SignalementIncidentRepository.class);
    private final MaintenanceService entretiens = mock(MaintenanceService.class);
    private final AccesParcoursService acces = new AccesParcoursService(utilisateurs);
    private final VehiculeController parc = new VehiculeController(vehicules, mock(AffectationRepository.class),
            reservations, mock(MaintenanceRepository.class), mock(ChauffeurRepository.class),
            mock(DirectionRepository.class), mock(ChauffeurAutoService.class), acces);
    private final SignalementIncidentController signalements = new SignalementIncidentController(incidents,
            vehicules, reservations, utilisateurs, mock(NotificationService.class), acces);
    private final MaintenanceController maintenance = new MaintenanceController(entretiens, vehicules,
            reservations, utilisateurs, mock(EntretienPeriodiqueService.class), acces);
    private final Utilisateur assistant = new Utilisateur();
    private Vehicule moto, voiture, autre, mission;

    private Vehicule vehicule(long id, String categorie, long directionId) {
        Vehicule v = new Vehicule(); v.setId(id); v.setCategorie(categorie); v.setStatut("DISPONIBLE");
        Direction direction = new Direction(); direction.setId(directionId); v.getDirections().add(direction);
        when(vehicules.findById(id)).thenReturn(Optional.of(v));
        return v;
    }

    @BeforeEach void preparer() {
        assistant.setId(1L); assistant.setMatricule("A1"); assistant.setDirectionId(5L); assistant.setActif(true);
        when(utilisateurs.findByMatricule("A1")).thenReturn(Optional.of(assistant));
        moto = vehicule(10, CategorieVehicule.MOTO_ELECTRIQUE, 5);
        voiture = vehicule(11, CategorieVehicule.MUTUALISEE, 5);
        autre = vehicule(12, CategorieVehicule.MOTO_ELECTRIQUE, 8);
        mission = vehicule(13, CategorieVehicule.MISSION, 5);
        when(vehicules.findAll()).thenReturn(List.of(moto, voiture, autre, mission));
    }

    private UsernamePasswordAuthenticationToken connecter(String role) {
        assistant.setRole(role);
        var session = new UsernamePasswordAuthenticationToken("A1", null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
        SecurityContextHolder.getContext().setAuthentication(session);
        return session;
    }

    @AfterEach void nettoyer() { SecurityContextHolder.clearContext(); }

    @ParameterizedTest @ValueSource(strings = {"ASSISTANT_DIRECTION", "AGENT_PAR_INTERIM_ASSISTANT"})
    void seulementLaMotoEtLaVoitureAffectees(String role) {
        connecter(role);
        assertEquals(List.of(moto, voiture), parc.lister());
        assertEquals(404, parc.obtenir(autre.getId()).getStatusCode().value());
        assistant.setDirectionId(null);
        assertTrue(parc.lister().isEmpty());
    }

    private Map<String, Object> incident(Vehicule v) {
        return new HashMap<>(Map.of("vehiculeId", v.getId(), "typeIncident", "PANNE", "description", "Panne constatée"));
    }

    @ParameterizedTest @ValueSource(strings = {"ASSISTANT_DIRECTION", "AGENT_PAR_INTERIM_ASSISTANT"})
    void impossibleDeSignalerSurAutreDirectionOuVoitureDeMission(String role) {
        connecter(role);
        assertEquals(403, signalements.signaler(incident(autre)).getStatusCode().value());
        assertEquals(403, signalements.signaler(incident(mission)).getStatusCode().value());
        verify(vehicules, never()).save(any()); verifyNoInteractions(incidents);
    }

    @Test void incidentPossibleSurVehiculeEnMissionDeSaDirection() {
        connecter("ASSISTANT_DIRECTION"); moto.setStatut("EN_MISSION");
        when(incidents.save(any())).thenAnswer(i -> i.getArgument(0));
        assertEquals(200, signalements.signaler(incident(moto)).getStatusCode().value());
        assertEquals("INDISPONIBLE", moto.getStatut());
        verify(incidents).save(argThat(i -> i.getVehicule() == moto && i.getSignalePar() == assistant));
    }

    @Test void missionEtVehiculeDuSignalementDoiventCorrespondre() {
        connecter("ASSISTANT_DIRECTION");
        Reservation r = new Reservation(); r.setVehicule(voiture); r.setDemandeur(assistant);
        when(reservations.findById(9L)).thenReturn(Optional.of(r));
        var demande = incident(moto); demande.put("reservationId", 9L);
        assertEquals(403, signalements.signaler(demande).getStatusCode().value());
        verifyNoInteractions(incidents); verify(vehicules, never()).save(any());
    }

    @Test void interimDemandeEntretienUniquementPourSaDirection() {
        var session = connecter("AGENT_PAR_INTERIM_ASSISTANT");
        var demande = new MaintenanceController.CreateMaintenanceRequest();
        demande.setVehiculeId(autre.getId()); demande.setNatureIntervention("Freinage");
        assertEquals(403, maintenance.demandeMecanicien(demande, session).getStatusCode().value());
        verifyNoInteractions(entretiens);
        demande.setVehiculeId(moto.getId());
        assertEquals(200, maintenance.demandeMecanicien(demande, session).getStatusCode().value());
        verify(entretiens).creerDemandeEntretien(argThat(m -> m.getVehicule() == moto), eq("ASSISTANT_DIRECTION"), eq("A1"));
    }

    @Test void responsablesTransversesGardentLeParcComplet() {
        for (String role : List.of("ADMIN", "CHEF_SERVICE_LOGISTIQUE", "CHEF_ATELIER", "MECANICIEN_DID", "CO_ADMIN")) {
            connecter(role); assertEquals(4, parc.lister().size());
        }
    }

    @ParameterizedTest @ValueSource(longs = {3, 5, 13})
    void dajDidDagrGardentLesDeuxVoituresPartagees(long directionId) {
        connecter("ASSISTANT_DIRECTION"); assistant.setDirectionId(directionId);
        Vehicule premiere = vehicule(20, CategorieVehicule.MUTUALISEE, directionId); premiere.setImmatriculation("5533AE");
        Vehicule seconde = vehicule(21, CategorieVehicule.MUTUALISEE, directionId); seconde.setImmatriculation("5334AJ");
        Vehicule motoDirection = vehicule(22, CategorieVehicule.MOTO_ELECTRIQUE, directionId);
        when(vehicules.findAll()).thenReturn(List.of(premiere, seconde, motoDirection, autre));
        assertEquals(List.of(premiere, seconde, motoDirection), parc.lister());

        var missions = new ReservationController(reservations, vehicules, mock(ChauffeurRepository.class),
                mock(ChauffeurAutoService.class), utilisateurs, mock(DisponibiliteReservationService.class),
                mock(MaintenanceService.class), mock(NotificationService.class), mock(MaintenanceRepository.class),
                mock(SignalementEntretienChauffeurRepository.class), mock(TransactionCarburantRepository.class),
                mock(ReglesDispositifService.class), acces);
        var affectation = (Map<?, ?>) missions.vehiculeAffecteAssistantDirection().getBody();
        assertNotNull(affectation);
        assertEquals(List.of(premiere, seconde), affectation.get("vehiculesVoiture"));
        assertEquals(List.of(motoDirection), affectation.get("vehiculesMoto"));
    }
}
