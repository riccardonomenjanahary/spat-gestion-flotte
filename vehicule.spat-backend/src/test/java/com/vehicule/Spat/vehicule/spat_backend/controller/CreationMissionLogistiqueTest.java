package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.CreateReservationRequest;
import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import com.vehicule.Spat.vehicule.spat_backend.service.*;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CreationMissionLogistiqueTest {
    private final ReservationRepository reservations = mock(ReservationRepository.class);
    private final UtilisateurRepository utilisateurs = mock(UtilisateurRepository.class);
    private final VehiculeRepository vehicules = mock(VehiculeRepository.class);
    private final ChauffeurRepository chauffeurs = mock(ChauffeurRepository.class);
    private final ChauffeurAutoService chauffeurAuto = mock(ChauffeurAutoService.class);
    private final DisponibiliteReservationService disponibilites = mock(DisponibiliteReservationService.class);
    private final MaintenanceService maintenanceService = mock(MaintenanceService.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final ReservationController controller = new ReservationController(reservations, vehicules,
            chauffeurs, chauffeurAuto, utilisateurs,
            disponibilites, maintenanceService, notifications,
            mock(MaintenanceRepository.class), mock(SignalementEntretienChauffeurRepository.class),
            mock(TransactionCarburantRepository.class), mock(ReglesDispositifService.class), mock(AccesParcoursService.class));
    private final Utilisateur logistique = new Utilisateur();

    @BeforeEach void preparer() {
        logistique.setId(10L); logistique.setRole("CHEF_SERVICE_LOGISTIQUE");
        when(utilisateurs.findByMatricule("L1")).thenReturn(Optional.of(logistique));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("L1", null, List.of()));
        when(reservations.save(any())).thenAnswer(invocation -> {
            Reservation mission = invocation.getArgument(0); mission.setId(42L); return mission;
        });
    }

    @AfterEach void nettoyer() { SecurityContextHolder.clearContext(); }

    private CreateReservationRequest demande() {
        var demande = new CreateReservationRequest();
        demande.setZoneMission("HORS_TOAMASINA");
        demande.setTypeVehiculeSouhaite("VOITURE");
        demande.setDateDebut(LocalDateTime.now().plusDays(3));
        demande.setDateFin(demande.getDateDebut().plusDays(1));
        demande.setDureeEstimeeMinutes(2880);
        demande.setMotif("Visite de site");
        demande.setDemandeurNom("Rakoto"); demande.setDemandeurPrenom("Jean");
        demande.setDemandeurEntite("DID"); demande.setDestination("Antananarivo");
        demande.setPointDepart("SPAT Toamasina"); demande.setNombrePassagers(1);
        return demande;
    }

    @Test void creationSansRessourcesRefuseeAvantEnregistrement() {
        var requete = demande();
        var reponse = controller.creerReservation(requete);
        assertEquals(400, reponse.getStatusCode().value());
        verify(reservations, never()).save(any());
        verifyNoInteractions(vehicules, chauffeurs);
    }

    @Test void motoToujoursInterditeHorsVille() {
        var requete = demande(); requete.setTypeVehiculeSouhaite("MOTO");
        assertEquals(400, controller.creerReservation(requete).getStatusCode().value());
        verify(reservations, never()).save(any());
    }

    private CreateReservationRequest demandeAvecRessources(boolean vehiculeDisponible, boolean chauffeurDisponible) {
        var requete = demande(); requete.setVehiculeId(14L); requete.setChauffeurId(15L);
        Vehicule voiture = new Vehicule(); voiture.setId(14L); voiture.setImmatriculation("1614 WWA"); voiture.setCategorie(CategorieVehicule.MISSION);
        Chauffeur conducteur = new Chauffeur(); conducteur.setId(15L);
        when(vehicules.findByIdForUpdate(14L)).thenReturn(Optional.of(voiture));
        when(chauffeurs.findByIdForUpdate(15L)).thenReturn(Optional.of(conducteur));
        when(disponibilites.estVehiculeDisponiblePourPeriode(eq(14L), any(), any(), isNull())).thenReturn(vehiculeDisponible);
        when(disponibilites.estVehiculeDisponiblePourPeriode(eq(14L), any(), any(), eq(42L))).thenReturn(vehiculeDisponible);
        when(maintenanceService.creer(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(chauffeurAuto.trouverChauffeursDisponiblesManuellement(any(), any(), isNull())).thenReturn(chauffeurDisponible ? List.of(conducteur) : List.of());
        return requete;
    }

    @Test void choixVehiculeEtChauffeurEnregistresDesLaCreation() {
        var reponse = controller.creerReservation(demandeAvecRessources(true, true));
        assertEquals(200, reponse.getStatusCode().value());
        Reservation mission = (Reservation) reponse.getBody();
        assertNotNull(mission);
        assertEquals(14L, mission.getVehicule().getId()); assertEquals(15L, mission.getChauffeur().getId());
        assertEquals("EN_ATTENTE_AVIS_DID", mission.getStatut());
        assertSame(logistique, mission.getDemandeur());
        assertEquals(mission.getDateDebut().plusDays(2), mission.getDateFin());
        assertNull(mission.getValidationN1Par()); assertNull(mission.getDateValidationN1());
        verify(maintenanceService, times(1)).creer(argThat(inspection ->
                inspection.getReservation() == mission && inspection.getVehicule() == mission.getVehicule()
                        && "Contrôle visuel avant mission".equals(inspection.getNatureIntervention())));
        verify(notifications).creerPourRole(eq("MECANICIEN_DID"), eq("AVIS_DID"), anyString(), anyString(),
                contains("1614 WWA"), eq("/mecanicien-did"), eq(42L), isNull(), eq(14L), eq(true));
    }

    @Test void vehiculeDevenuIndisponibleBloqueCreation() {
        assertEquals(409, controller.creerReservation(demandeAvecRessources(false, true)).getStatusCode().value());
        verify(reservations, never()).save(any());
    }

    @Test void chauffeurDevenuIndisponibleBloqueCreation() {
        assertEquals(409, controller.creerReservation(demandeAvecRessources(true, false)).getStatusCode().value());
        verify(reservations, never()).save(any());
    }

    @Test void voitureSelectionneeExigeUnChauffeur() {
        var requete = demandeAvecRessources(true, true); requete.setChauffeurId(null);
        assertEquals(400, controller.creerReservation(requete).getStatusCode().value());
        verify(reservations, never()).save(any());
    }

    @Test void echecInspectionAnnuleTransactionDeCreation() {
        var requete = demandeAvecRessources(true, true);
        when(maintenanceService.creer(any())).thenThrow(new IllegalStateException("Inspection indisponible"));
        var transactions = mock(org.springframework.transaction.PlatformTransactionManager.class);
        var statut = mock(org.springframework.transaction.TransactionStatus.class);
        when(transactions.getTransaction(any())).thenReturn(statut);
        var attributs = new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource();
        var intercepteur = new org.springframework.transaction.interceptor.TransactionInterceptor(transactions, attributs);
        var fabrique = new org.springframework.aop.framework.ProxyFactory(controller);
        fabrique.addAdvice(intercepteur);
        var proxy = (ReservationController) fabrique.getProxy();
        assertThrows(IllegalStateException.class, () -> proxy.creerReservation(requete));
        verify(transactions).rollback(statut);
        verify(transactions, never()).commit(any());
    }
}
