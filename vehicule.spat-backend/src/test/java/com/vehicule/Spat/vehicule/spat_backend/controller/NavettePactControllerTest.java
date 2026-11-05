package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import com.vehicule.Spat.vehicule.spat_backend.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class NavettePactControllerTest {
    ReservationRepository reservations = mock(ReservationRepository.class);
    VehiculeRepository vehicules = mock(VehiculeRepository.class);
    ChauffeurRepository chauffeurs = mock(ChauffeurRepository.class);
    ReglesDispositifService regles = mock(ReglesDispositifService.class);
    ChauffeurAutoService compatibilite = mock(ChauffeurAutoService.class);
    AccesParcoursService acces = mock(AccesParcoursService.class);
    NavettePactController controller = new NavettePactController(reservations, vehicules, chauffeurs, regles, compatibilite, acces);
    Reservation r = new Reservation(); Vehicule v = new Vehicule(); Chauffeur c = new Chauffeur();
    Utilisateur auteur = new Utilisateur();
    @BeforeEach void init() {
        auteur.setRole("CHEF_SERVICE_LOGISTIQUE"); when(acces.courant()).thenReturn(auteur);
        r.setId(1L); r.setModeCreation("NAVETTE_PACT"); r.setStatut("EN_ATTENTE");
        r.setDateDebut(LocalDateTime.now().plusDays(3));
        v.setCategorie(CategorieVehicule.MUTUALISEE);
        when(reservations.findByIdForUpdate(1L)).thenReturn(Optional.of(r));
        when(vehicules.findByIdForUpdate(2L)).thenReturn(Optional.of(v));
        when(chauffeurs.findByIdForUpdate(3L)).thenReturn(Optional.of(c));
        when(compatibilite.estCompatible(v,c)).thenReturn(true);
        when(regles.ordreMissionValide(r,v)).thenReturn(true);
        when(reservations.save(r)).thenReturn(r);
    }
    void affecter() { controller.affecter(1L, new NavettePactController.Affectation(2L,3L)); }
    @Test void planifieSansSecondeValidation() {
        affecter(); assertEquals("PLANIFIEE",r.getStatut());
        assertSame(auteur,r.getValidationN1Par()); assertNotNull(r.getDateValidationN1());
        assertNull(r.getValidationN2Par()); verify(regles).verifier(r); verify(reservations).save(r);
    }
    @Test void neChangePasLeCircuitOrdinaire() {
        r.setModeCreation("NORMAL"); assertThrows(ResponseStatusException.class,this::affecter);
        verify(reservations,never()).save(any());
    }
    @Test void refuseAutreProfil() {
        auteur.setRole("ADMIN"); assertThrows(ResponseStatusException.class,this::affecter);
        verifyNoInteractions(vehicules);
    }
    @Test void bloqueVehiculePatrouille() {
        v.setCategorie(CategorieVehicule.PATROUILLE_URGENCE);
        assertThrows(ResponseStatusException.class,this::affecter); verify(reservations,never()).save(any());
    }
    @Test void bloqueConformiteOuConflit() {
        when(regles.verifier(r)).thenReturn("Véhicule indisponible");
        assertThrows(ResponseStatusException.class,this::affecter); verify(reservations,never()).save(any());
    }
    @Test void conserveOrdreMissionObligatoire() {
        v.setCategorie(CategorieVehicule.MISSION); when(regles.ordreMissionValide(r,v)).thenReturn(false);
        assertThrows(ResponseStatusException.class,this::affecter); verify(reservations,never()).save(any());
    }
    @Test void interditDoublePlanification() {
        r.setStatut("PLANIFIEE"); assertThrows(ResponseStatusException.class,this::affecter);
        verify(reservations,never()).save(any());
    }
}
