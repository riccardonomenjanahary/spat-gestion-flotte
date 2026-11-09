package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.service.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.web.server.ResponseStatusException;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class PersonnelDirectionControllerTest {
    @ParameterizedTest @ValueSource(strings = {"ASSISTANT_DIRECTION", "AGENT_PAR_INTERIM_ASSISTANT"})
    void directionIssueDeLaSessionEtNonDunParametre(String role) {
        var acces = mock(AccesParcoursService.class); var service = mock(PersonnelDirectoryService.class);
        Utilisateur utilisateur = new Utilisateur(); utilisateur.setRole(role); utilisateur.setDirectionId(10L);
        when(acces.courant()).thenReturn(utilisateur);
        new PersonnelDirectionController(acces, service).lister();
        verify(service).pourDirection(10L);
    }

    @ParameterizedTest @ValueSource(strings = {"CHEF_SERVICE_LOGISTIQUE", "AGENT_FLOTTE"})
    void autresRolesRefuses(String role) {
        var acces = mock(AccesParcoursService.class); var service = mock(PersonnelDirectoryService.class);
        Utilisateur utilisateur = new Utilisateur(); utilisateur.setRole(role);
        when(acces.courant()).thenReturn(utilisateur);
        assertThrows(ResponseStatusException.class, () -> new PersonnelDirectionController(acces, service).lister());
        verifyNoInteractions(service);
    }
}
