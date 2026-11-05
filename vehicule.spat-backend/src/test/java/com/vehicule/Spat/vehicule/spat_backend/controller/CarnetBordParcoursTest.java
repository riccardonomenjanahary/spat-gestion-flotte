package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class CarnetBordParcoursTest {
    private final CarnetBordRepository carnets = mock(CarnetBordRepository.class);
    private final AccesParcoursService acces = mock(AccesParcoursService.class);
    private final CarnetBordController controller = new CarnetBordController(carnets, mock(EtatLieuxRepository.class),
            mock(VehiculeRepository.class), mock(ReservationRepository.class), mock(UtilisateurRepository.class), acces);
    private CarnetBord carnet(String statut) {
        CarnetBord c = new CarnetBord(); c.setId(1L); c.setStatut(statut);
        c.setDateSortie(LocalDateTime.now().minusHours(1)); c.setKilometrageDepart(200L);
        Vehicule v = new Vehicule(); v.setCategorie(CategorieVehicule.MUTUALISEE); c.setVehicule(v);
        when(carnets.findById(1L)).thenReturn(Optional.of(c)); return c;
    }
    @Test void compteurNePeutPasReculer() {
        CarnetBord c = carnet("EN_COURS");
        var res = controller.enregistrerRetour(1L, Map.of("dateRetour", LocalDateTime.now().minusMinutes(1).toString(), "kilometrageRetour", 199));
        assertEquals(400, res.getStatusCode().value()); assertNull(c.getDateRetour());
        verify(carnets, never()).save(any());
    }
    @Test void doubleRetourInterdit() {
        carnet("CLOTURE");
        assertEquals(409, controller.enregistrerRetour(1L, Map.of()).getStatusCode().value());
    }
    @Test void retourAvantSortieInterdit() {
        carnet("EN_COURS");
        assertEquals(400, controller.enregistrerRetour(1L, Map.of("dateRetour", LocalDateTime.now().minusDays(1).toString(), "kilometrageRetour", 250)).getStatusCode().value());
    }
    @Test void retourValideControlePerimetre() {
        CarnetBord c = carnet("EN_COURS");
        assertEquals(200, controller.enregistrerRetour(1L, Map.of("dateRetour", LocalDateTime.now().minusMinutes(1).toString(), "kilometrageRetour", 250)).getStatusCode().value());
        verify(acces).exigerLectureCarnet(c);
        verify(carnets).save(argThat(v -> "CLOTURE".equals(v.getStatut()) && v.getKilometrageRetour() == 250L));
    }
}
