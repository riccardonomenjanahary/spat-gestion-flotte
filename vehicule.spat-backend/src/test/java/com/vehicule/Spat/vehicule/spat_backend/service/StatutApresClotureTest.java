package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class StatutApresClotureTest {
    @ParameterizedTest @ValueSource(strings = {"INDISPONIBLE", "REQUISITIONNE", "EN_PANNE"})
    void clotureNeLiberePasVehiculeBloque(String statut) {
        VehiculeRepository vehicules = mock(VehiculeRepository.class);
        MaintenanceService service = new MaintenanceService(mock(MaintenanceRepository.class), vehicules,
                mock(ReservationRepository.class), mock(AffectationRepository.class), mock(NotificationService.class));
        Vehicule v = new Vehicule(); v.setId(1L); v.setStatut(statut);
        service.synchroniserStatutApresMission(v);
        assertEquals(statut, v.getStatut()); verify(vehicules, never()).save(any());
    }
}
