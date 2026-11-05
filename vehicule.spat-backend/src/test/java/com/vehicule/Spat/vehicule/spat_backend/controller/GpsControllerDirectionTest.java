package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.GpsPositionResponse;
import com.vehicule.Spat.vehicule.spat_backend.model.Direction;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService;
import com.vehicule.Spat.vehicule.spat_backend.service.GpsHistoriqueService;
import com.vehicule.Spat.vehicule.spat_backend.service.GpsService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GpsControllerDirectionTest {
    @Test
    void neRetourneQueLesPositionsDesVehiculesAffectesALaDirectionConnectee() {
        AccesParcoursService acces = mock(AccesParcoursService.class);
        VehiculeRepository vehicules = mock(VehiculeRepository.class);
        GpsService gps = mock(GpsService.class);
        GpsController controller = new GpsController(gps, mock(GpsHistoriqueService.class), acces, vehicules);

        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setDirectionId(4L);
        utilisateur.setRole("ASSISTANT_DIRECTION");
        when(acces.courant()).thenReturn(utilisateur);

        Direction directionAffectee = new Direction();
        directionAffectee.setId(4L);
        Direction autreDirection = new Direction();
        autreDirection.setId(8L);

        Vehicule affecte = vehiculeGps(11L, 501L, directionAffectee);
        Vehicule nonAffecte = vehiculeGps(12L, 502L, autreDirection);
        when(vehicules.findAll()).thenReturn(List.of(affecte, nonAffecte));

        GpsPositionResponse positionAffectee = new GpsPositionResponse();
        positionAffectee.setVehiculeId(11L);
        positionAffectee.setGpsDeviceId(501L);
        GpsPositionResponse positionAutreDirection = new GpsPositionResponse();
        positionAutreDirection.setVehiculeId(12L);
        positionAutreDirection.setGpsDeviceId(502L);
        when(gps.getPositions()).thenReturn(List.of(positionAffectee, positionAutreDirection));

        var response = controller.obtenirPositionsDirection();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(List.of(11L), response.getBody().stream().map(GpsPositionResponse::getVehiculeId).toList());

        utilisateur.setRole("AGENT_FLOTTE");
        var agentFlotteResponse = controller.obtenirPositions();
        assertEquals(List.of(11L, 12L), agentFlotteResponse.getBody().stream()
            .map(GpsPositionResponse::getVehiculeId).toList());
    }

    private static Vehicule vehiculeGps(Long id, Long gpsDeviceId, Direction direction) {
        Vehicule vehicule = new Vehicule();
        vehicule.setId(id);
        vehicule.setGpsEquipe(true);
        vehicule.setGpsDeviceId(gpsDeviceId);
        vehicule.getDirections().add(direction);
        return vehicule;
    }
}
