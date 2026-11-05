package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import com.vehicule.Spat.vehicule.spat_backend.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HabilitationMotoTest {
    private final ConducteurAutoriseRepository conducteurs = mock(ConducteurAutoriseRepository.class);
    private final DirectionRepository directions = mock(DirectionRepository.class);
    private final AccesParcoursService acces = mock(AccesParcoursService.class);
    private final StockageFichiersService stockage = mock(StockageFichiersService.class);
    private final ConducteurAutoriseController controller = new ConducteurAutoriseController(
            conducteurs, directions, mock(UtilisateurRepository.class), acces, stockage);
    private final Utilisateur assistant = new Utilisateur();
    private final Direction direction = new Direction();
    private final MockMultipartFile permis = new MockMultipartFile("permis", "permis.pdf", "application/pdf", "%PDF-1.4".getBytes());

    @BeforeEach void preparer() {
        assistant.setRole("ASSISTANT_DIRECTION"); assistant.setDirectionId(3L); assistant.setActif(true);
        direction.setId(3L); direction.setNom("Direction de test");
        when(acces.courant()).thenReturn(assistant);
        when(directions.findById(3L)).thenReturn(Optional.of(direction));
        when(conducteurs.findByMatriculeAndDirectionId(anyString(), eq(3L))).thenReturn(Optional.empty());
        when(stockage.stocker(permis)).thenReturn("permis-stocke.pdf");
        when(conducteurs.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test void demandeAvecPermisRattacheeALaDirectionDuCompte() {
        var response = controller.proposerHabilitation(" Nom Prénom ", " Technicien ", " 123 ", permis);
        assertEquals(200, response.getStatusCode().value());
        var conducteur = (ConducteurAutorise) response.getBody();
        assertNotNull(conducteur);
        assertEquals("Nom Prénom", conducteur.getNomComplet());
        assertEquals("Technicien", conducteur.getPoste());
        assertEquals("123", conducteur.getMatricule());
        assertSame(direction, conducteur.getDirection());
        assertEquals("permis-stocke.pdf", conducteur.getPermisNomStocke());
        assertFalse(conducteur.getValide()); assertNull(conducteur.getDateValidation());
    }

    @Test void saisieManuelleSansMatriculeEstAcceptee() {
        var conducteur = (ConducteurAutorise) controller.proposerHabilitation("Nom", "Poste", null, permis).getBody();
        assertNotNull(conducteur); assertTrue(conducteur.getMatricule().startsWith("MANUEL-"));
    }

    @Test void depotMultipartUtiliseLeBonEndpointEtIgnoreLaDirectionFournieParLeClient() throws Exception {
        var mvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(controller).build();
        var response = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .multipart("/api/conducteurs-autorises").file(permis)
                .param("nomComplet", "Conducteur test").param("poste", "Agent")
                .param("matricule", "123").param("directionId", "999"))
                .andReturn().getResponse();
        assertEquals(200, response.getStatus());
        verify(conducteurs).saveAndFlush(argThat(conducteur -> conducteur.getDirection().getId().equals(3L)
                && !conducteur.getValide() && "permis-stocke.pdf".equals(conducteur.getPermisNomStocke())));
    }

    @Test void permisInvalideNeCreePasDeDemande() {
        doThrow(new IllegalArgumentException("Format non autorisé")).when(stockage).verifierFichier(permis);
        assertEquals(400, controller.proposerHabilitation("Nom", "Poste", "123", permis).getStatusCode().value());
        verify(conducteurs, never()).saveAndFlush(any()); verify(stockage, never()).stocker(any());
    }

    @Test void autreRoleNePeutPasProposerUneHabilitation() {
        assistant.setRole("AGENT_FLOTTE");
        assertEquals(403, controller.proposerHabilitation("Nom", "Poste", "123", permis).getStatusCode().value());
        verifyNoInteractions(stockage);
    }

    @Test void fichierNettoyeSiLaSauvegardeEchoue() {
        when(conducteurs.saveAndFlush(any())).thenThrow(new IllegalStateException("Base indisponible"));
        assertThrows(IllegalStateException.class, () -> controller.proposerHabilitation("Nom", "Poste", "123", permis));
        verify(stockage).supprimer("permis-stocke.pdf");
    }

    @Test void permisAutreDirectionInaccessible() {
        Direction autre = new Direction(); autre.setId(9L);
        ConducteurAutorise conducteur = new ConducteurAutorise(); conducteur.setDirection(autre); conducteur.setPermisNomStocke("permis.pdf");
        when(conducteurs.findById(9L)).thenReturn(Optional.of(conducteur));
        assertEquals(403, controller.permis(9L).getStatusCode().value());
        verify(stockage, never()).resoudreChemin(anyString());
    }
}
