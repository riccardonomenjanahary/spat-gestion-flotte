package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class ConducteurDirectionParcoursTest {
    private final ConducteurAutoriseRepository conducteurs = mock(ConducteurAutoriseRepository.class);
    private final UtilisateurRepository utilisateurs = mock(UtilisateurRepository.class);
    private final ConducteurAutoriseController controller = new ConducteurAutoriseController(conducteurs,
            mock(DirectionRepository.class), utilisateurs, mock(AccesParcoursService.class),
            mock(com.vehicule.Spat.vehicule.spat_backend.service.StockageFichiersService.class));
    private final Utilisateur directeur = new Utilisateur();
    private final ConducteurAutorise conducteur = new ConducteurAutorise();
    @BeforeEach void preparer() {
        directeur.setRole("CHEF_DIRECTION"); directeur.setDirectionId(1L); directeur.setActif(true);
        Direction d = new Direction(); d.setId(1L); conducteur.setDirection(d);
        conducteur.setPermisNomStocke("permis.pdf");
        when(conducteurs.findById(1L)).thenReturn(Optional.of(conducteur));
        when(utilisateurs.findByMatricule("D1")).thenReturn(Optional.of(directeur));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("D1", null, List.of()));
    }
    @AfterEach void nettoyer() { SecurityContextHolder.clearContext(); }
    @Test void directeurValideSaDirectionAvecAuteurSession() {
        assertEquals(200, controller.valider(1L, Map.of("validePar", "FAUX_AUTEUR")).getStatusCode().value());
        assertEquals("D1", conducteur.getValidePar()); assertNotNull(conducteur.getDateValidation());
    }
    @Test void directeurAutreDirectionRefuse() {
        directeur.setDirectionId(2L); assertEquals(403, controller.valider(1L, Map.of()).getStatusCode().value());
        verify(conducteurs, never()).save(any());
    }
    @Test void assistanteNePeutPasValiderSaProposition() {
        directeur.setRole("ASSISTANT_DIRECTION"); assertEquals(403, controller.valider(1L, Map.of()).getStatusCode().value());
    }
    @Test void directeurDesactiveRefuse() {
        directeur.setActif(false); assertEquals(403, controller.valider(1L, Map.of()).getStatusCode().value());
    }
    @Test void sansPermisLaValidationEstRefusee() {
        conducteur.setPermisNomStocke(null);
        assertEquals(400, controller.valider(1L, Map.of()).getStatusCode().value());
        verify(conducteurs, never()).save(any());
    }
    @Test void habilitationInactiveNePeutEtreValidee() {
        conducteur.setActif(false);
        assertEquals(400, controller.valider(1L, Map.of()).getStatusCode().value());
    }
}
