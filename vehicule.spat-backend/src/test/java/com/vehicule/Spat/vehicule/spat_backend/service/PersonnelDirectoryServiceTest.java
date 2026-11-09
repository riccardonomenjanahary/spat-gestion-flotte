package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import org.junit.jupiter.api.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PersonnelDirectoryServiceTest {
    private final PersonnelModificationRepository corrections = mock(PersonnelModificationRepository.class);
    private final DirectionRepository directions = mock(DirectionRepository.class);
    private final UtilisateurRepository utilisateurs = mock(UtilisateurRepository.class);
    private final PersonnelDirectoryService service = new PersonnelDirectoryService(corrections, directions, utilisateurs);
    private final Direction ddi = new Direction();

    @BeforeEach void preparer() {
        ddi.setId(10L); ddi.setCode("DDI"); ddi.setNom("Direction de la Digitalisation et de l'Innovation");
        when(directions.findById(10L)).thenReturn(Optional.of(ddi));
    }

    @Test void ddiNeRecoitQueSonPersonnel() {
        var personnel = service.pourDirection(10L);
        assertFalse(personnel.isEmpty());
        assertTrue(personnel.stream().allMatch(p -> "DIR DIGITALISATION INNOVATION".equals(p.direction())));
    }

    @Test void directionManquanteOuInactiveNeDonneJamaisLeRepertoireGlobal() {
        assertTrue(service.pourDirection(null).isEmpty());
        assertTrue(service.pourDirection(999L).isEmpty());
        ddi.setActif(false); assertTrue(service.pourDirection(10L).isEmpty());
    }

    @Test void suppressionsEtTransfertsSuperAdminAppliquesAvantFiltrage() {
        var initial = service.pourDirection(10L);
        assertTrue(initial.size() > 1);
        PersonnelModification suppression = new PersonnelModification(); suppression.matricule = initial.get(0).matricule(); suppression.supprime = true;
        PersonnelModification transfert = new PersonnelModification(); transfert.matricule = initial.get(1).matricule(); transfert.nom = "Transfert"; transfert.direction = "DIR RESSOURCES HUMAINES";
        PersonnelModification ajout = new PersonnelModification(); ajout.matricule = "RECETTE-DDI"; ajout.nom = "Nouveau"; ajout.direction = "DDI";
        when(corrections.findAll()).thenReturn(List.of(suppression, transfert, ajout));
        var resultat = service.pourDirection(10L);
        assertTrue(resultat.stream().noneMatch(p -> p.matricule().equals(suppression.matricule) || p.matricule().equals(transfert.matricule)));
        assertTrue(resultat.stream().anyMatch(p -> p.matricule().equals(ajout.matricule)));
    }

    @Test void emailDuCompteRattacheAuPersonnelDeLaMemeDirection() {
        String matricule = service.pourDirection(10L).getFirst().matricule();
        Utilisateur compte = new Utilisateur(); compte.setMatricule(matricule); compte.setDirectionId(10L); compte.setEmail("recette@example.invalid");
        when(utilisateurs.findAll()).thenReturn(List.of(compte));
        assertEquals("recette@example.invalid", service.pourDirection(10L).stream().filter(p -> p.matricule().equals(matricule)).findFirst().orElseThrow().email());
        compte.setDirectionId(9L);
        assertEquals("", service.pourDirection(10L).stream().filter(p -> p.matricule().equals(matricule)).findFirst().orElseThrow().email());
    }

    @Test void correspondanceExacteSansCollisionDeDirections() {
        Direction dg = new Direction(); dg.setCode("DG"); dg.setNom("Direction Générale");
        assertFalse(PersonnelDirectoryService.appartientDirection("DIR AFFAIRES GENERALES", dg));
        assertTrue(PersonnelDirectoryService.appartientDirection("  dir générale ", dg));
    }
}
