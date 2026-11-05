package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DisponibiliteDispositifTest {
    private final VehiculeRepository vehicules = mock(VehiculeRepository.class);
    private final AssuranceRepository assurances = mock(AssuranceRepository.class);
    private final MaintenanceRepository maintenance = mock(MaintenanceRepository.class);
    private final ReservationRepository reservations = mock(ReservationRepository.class);
    private final DisponibiliteReservationService service = new DisponibiliteReservationService(
            reservations, vehicules, mock(ChauffeurRepository.class), assurances, maintenance);
    private final LocalDateTime debut = LocalDateTime.of(2026, 11, 2, 10, 0);
    private final LocalDateTime fin = debut.plusDays(2);

    private Vehicule vehicule() {
        Vehicule v = new Vehicule(); v.setId(1L); v.setStatut("DISPONIBLE");
        v.setDateExpirationVisiteTechnique(fin.toLocalDate());
        when(vehicules.findById(1L)).thenReturn(Optional.of(v));
        Assurance a = new Assurance(); a.setDateDebut(debut.toLocalDate()); a.setDateExpiration(fin.toLocalDate());
        when(assurances.findByVehiculeIdOrderByDateExpirationDesc(1L)).thenReturn(List.of(a));
        return v;
    }

    @Test void incidentInterditTouteAffectation() {
        vehicule().setStatut("INDISPONIBLE");
        assertFalse(service.estVehiculeDisponiblePourPeriode(1L, debut, fin, null));
    }
    @Test void visiteExpirePendantMissionBloquee() {
        vehicule().setDateExpirationVisiteTechnique(debut.toLocalDate());
        assertFalse(service.estVehiculeDisponiblePourPeriode(1L, debut, fin, null));
    }
    @Test void assuranceManquanteBloquee() {
        vehicule(); when(assurances.findByVehiculeIdOrderByDateExpirationDesc(1L)).thenReturn(List.of());
        assertFalse(service.estVehiculeDisponiblePourPeriode(1L, debut, fin, null));
    }
    @Test void chevauchementBloqueMemeVehiculeRegulier() {
        vehicule(); when(reservations.existeChevauchementVehicule(1L, null, debut, fin)).thenReturn(true);
        assertFalse(service.estVehiculeDisponiblePourPeriode(1L, debut, fin, null));
    }
    @Test void documentsValidesJusquaFinAcceptes() {
        vehicule(); assertTrue(service.estVehiculeDisponiblePourPeriode(1L, debut, fin, null));
    }
}
