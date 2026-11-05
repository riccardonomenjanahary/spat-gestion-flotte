package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.PersonnelModification;
import com.vehicule.Spat.vehicule.spat_backend.repository.PersonnelModificationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AdminPersonnelControllerTest {
    private final PersonnelModificationRepository repository = mock(PersonnelModificationRepository.class);
    private final AdminPersonnelController controller = new AdminPersonnelController(repository);
    private final UsernamePasswordAuthenticationToken superAdmin = new UsernamePasswordAuthenticationToken(
            "super-admin", "", List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN")));

    @Test
    void refuseLesAutresRoles() {
        var admin = new UsernamePasswordAuthenticationToken("admin", "",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        assertThrows(ResponseStatusException.class, () -> controller.lister(admin));
        assertThrows(ResponseStatusException.class, () -> controller.supprimer("1988020", admin));
        assertThrows(ResponseStatusException.class, () -> controller.modifier("1988020", null, admin));
        verifyNoInteractions(repository);
    }

    @Test
    void conserveUneSuppressionPourMasquerLaFicheDuFichierSource() {
        when(repository.findById("1988020")).thenReturn(Optional.empty());
        controller.supprimer("1988020", superAdmin);
        verify(repository).save(argThat(personnel -> personnel.supprime
                && "1988020".equals(personnel.matricule)));
    }

    @Test
    void enregistreTousLesChampsEtAutoriseUnEmailVide() {
        when(repository.save(any(PersonnelModification.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var resultat = controller.modifier("1988020", new AdminPersonnelController.Modification(
                " Nom ", " Prénom ", " DRH ", " Poste ", " T2 ", ""), superAdmin);
        assertEquals("1988020", resultat.matricule);
        assertEquals("Nom", resultat.nom);
        assertEquals("Prénom", resultat.prenom);
        assertEquals("DRH", resultat.direction);
        assertEquals("Poste", resultat.poste);
        assertEquals("T2", resultat.categorie);
        assertEquals("", resultat.email);
        assertFalse(resultat.supprime);
    }
}
