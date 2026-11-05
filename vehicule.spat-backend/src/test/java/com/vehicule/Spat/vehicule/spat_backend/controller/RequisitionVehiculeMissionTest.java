package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.RequisitionRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class RequisitionVehiculeMissionTest {
    private final RequisitionRepository requisitions = mock(RequisitionRepository.class);
    private final VehiculeRepository vehicules = mock(VehiculeRepository.class);
    private final ReservationRepository reservations = mock(ReservationRepository.class);
    private final UtilisateurRepository utilisateurs = mock(UtilisateurRepository.class);
    private final RequisitionController controller = new RequisitionController(
            requisitions, vehicules, reservations, utilisateurs, mock(NotificationService.class));

    @AfterEach
    void nettoyerContexte() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void refuseUnVehiculeQuiNestPasUnDesDeuxVehiculesDeMission() {
        Vehicule vehicule = new Vehicule();
        vehicule.setId(8L);
        vehicule.setCategorie(CategorieVehicule.MUTUALISEE);
        vehicule.setImmatriculation("5174 AH");
        when(vehicules.findById(8L)).thenReturn(Optional.of(vehicule));

        var response = controller.creerRequisition(Map.of(
                "vehiculeId", 8,
                "motif", "Réquisition de test",
                "dateDebut", "2026-11-05T10:00:00"
        ));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(vehicules, never()).save(any());
        verify(requisitions, never()).save(any());
    }

    @Test
    void accepteUnAutreVehiculeSeulementSiLeChoixAutreEstExplicite() {
        Vehicule vehicule = new Vehicule();
        vehicule.setId(9L);
        vehicule.setCategorie(CategorieVehicule.MUTUALISEE);
        vehicule.setImmatriculation("5174 AH");
        when(vehicules.findById(9L)).thenReturn(Optional.of(vehicule));
        when(vehicules.save(vehicule)).thenReturn(vehicule);
        when(requisitions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(utilisateurs.findByMatricule("DGAL001")).thenReturn(Optional.of(new com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur()));
        when(utilisateurs.findByRole(anyString())).thenReturn(List.of());
        when(reservations.findAll()).thenReturn(List.of());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("DGAL001", null, List.of()));

        var response = controller.creerRequisition(Map.of(
                "vehiculeId", 9,
                "autreVehicule", true,
                "motif", "Réquisition de test",
                "dateDebut", "2026-11-05T10:00:00"
        ));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(requisitions).save(any());
    }
}
