package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReglesDispositifServiceTest {
    private final JustificatifRepository pieces = mock(JustificatifRepository.class);
    private final ConducteurAutoriseRepository conducteurs = mock(ConducteurAutoriseRepository.class);
    private final DisponibiliteReservationService disponibilites = mock(DisponibiliteReservationService.class);
    private final ReglesDispositifService regles = new ReglesDispositifService(pieces, conducteurs, disponibilites);

    @Test void selectionConducteurExigeValidationPermisEtMemeDirection() {
        Direction direction = new Direction(); direction.setId(1L);
        ConducteurAutorise conducteur = new ConducteurAutorise(); conducteur.setId(7L);
        conducteur.setDirection(direction); conducteur.setValide(true);
        conducteur.setDateValidation(LocalDateTime.now()); conducteur.setPermisNomStocke("permis.pdf");
        when(conducteurs.findById(7L)).thenReturn(java.util.Optional.of(conducteur));
        assertSame(conducteur, regles.conducteurMotoValide(7L, 1L));
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> regles.conducteurMotoValide(7L, 2L));
        assertNull(regles.conducteurMotoValide(null, 1L));
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> regles.conducteurMotoValide(99L, 1L));
        conducteur.setValide(false);
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> regles.conducteurMotoValide(7L, 1L));
        conducteur.setValide(true); conducteur.setActif(false);
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> regles.conducteurMotoValide(7L, 1L));
        conducteur.setActif(true); conducteur.setPermisNomStocke(null);
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> regles.conducteurMotoValide(7L, 1L));
    }

    @Test void conducteurMotoSelectionnePeutEtreDifferentDuDemandeur() {
        Reservation r = reservation(CategorieVehicule.MOTO_ELECTRIQUE);
        Direction direction = new Direction(); direction.setId(1L);
        r.getVehicule().setDirections(new java.util.HashSet<>(List.of(direction)));
        Utilisateur demandeur = new Utilisateur(); demandeur.setDirectionId(1L); r.setDemandeur(demandeur);
        r.setDemandeurMatricule("DEMANDEUR");
        ConducteurAutorise conducteur = new ConducteurAutorise(); conducteur.setId(7L); conducteur.setMatricule("CONDUCTEUR");
        conducteur.setDirection(direction); conducteur.setValide(true); conducteur.setPermisNomStocke("permis.pdf");
        conducteur.setDateValidation(LocalDateTime.now()); r.setConducteurMoto(conducteur);
        when(conducteurs.findByActifTrue()).thenReturn(List.of(conducteur));
        assertNull(regles.verifier(r));
        r.setConducteurMoto(null);
        assertNull(regles.verifier(r));
    }

    private Reservation reservation(String categorie) {
        Reservation r = new Reservation();
        r.setId(4L);
        Vehicule v = new Vehicule(); v.setId(2L); v.setCategorie(categorie);
        r.setVehicule(v);
        Justificatif carte = new Justificatif(); carte.setType(TypeJustificatif.CARTE_GRISE); carte.setValide(true);
        when(pieces.findByVehiculeOrderByDateDepotDesc(v)).thenReturn(List.of(carte));
        r.setDateDebut(LocalDateTime.of(2026, 11, 2, 10, 0));
        r.setDateFin(r.getDateDebut().plusHours(1));
        r.setDateCreation(r.getDateDebut().minusDays(2));
        when(disponibilites.estVehiculeDisponiblePourPeriode(2L, r.getDateDebut(), r.getDateFin(), 4L)).thenReturn(true);
        return r;
    }

    @Test void missionSansOrdreDeposeeResteEligibleAvantValidationN2() {
        Reservation r = reservation(CategorieVehicule.MISSION);
        Chauffeur c = new Chauffeur(); c.setId(3L); c.setNumeroPermis("B123");
        c.setDateExpirationPermis(r.getDateFin().toLocalDate()); r.setChauffeur(c);
        when(disponibilites.estChauffeurDisponiblePourPeriode(3L, r.getDateDebut(), r.getDateFin(), 4L)).thenReturn(true);
        assertNull(regles.verifier(r));
    }

    @Test void patrouilleNePeutPasServirDeNavette() {
        assertTrue(regles.verifier(reservation(CategorieVehicule.PATROUILLE_URGENCE)).contains("patrouille"));
    }

    @Test void delaiInferieur24hExigeUrgenceExplicite() {
        Reservation r = reservation(CategorieVehicule.MUTUALISEE);
        r.setDateCreation(r.getDateDebut().minusHours(12));
        r.setMotifUrgence("Document urgent");
        assertTrue(regles.verifier(r).contains("urgence motivée"));
    }

    @Test void motoTraverseNuitEtBornes() {
        LocalDateTime debut = LocalDateTime.of(2026, 11, 2, 6, 0);
        assertFalse(ReglesDispositifService.traverseNuit(debut, debut.withHour(18)));
        assertTrue(ReglesDispositifService.traverseNuit(debut.minusMinutes(1), debut.withHour(12)));
        assertTrue(ReglesDispositifService.traverseNuit(debut, debut.withHour(18).plusMinutes(1)));
        assertTrue(ReglesDispositifService.traverseNuit(debut, debut.plusDays(1)));
    }

    @Test void voitureAvecPermisExpireBloquee() {
        Reservation r = reservation(CategorieVehicule.MUTUALISEE);
        Chauffeur c = new Chauffeur(); c.setId(3L); c.setNumeroPermis("B123");
        c.setDateExpirationPermis(r.getDateDebut().toLocalDate().minusDays(1));
        r.setChauffeur(c);
        assertTrue(regles.verifier(r).contains("valide jusqu'à"));
    }

    @Test void voitureReguliereAcceptee() {
        Reservation r = reservation(CategorieVehicule.MUTUALISEE);
        Chauffeur c = new Chauffeur(); c.setId(3L); c.setNumeroPermis("B123");
        c.setDateExpirationPermis(r.getDateFin().toLocalDate()); r.setChauffeur(c);
        when(disponibilites.estChauffeurDisponiblePourPeriode(3L, r.getDateDebut(), r.getDateFin(), 4L)).thenReturn(true);
        assertNull(regles.verifier(r));
    }

    @Test void pauseMidiExigeJustificationEtBornesTravailRespectees() {
        for (int heure : new int[]{8, 11, 12, 13, 14, 17, 18}) {
            Reservation r = reservation(CategorieVehicule.MUTUALISEE);
            r.setDateDebut(r.getDateDebut().withHour(heure));
            r.setDateFin(r.getDateDebut().plusHours(1));
            when(disponibilites.estVehiculeDisponiblePourPeriode(2L, r.getDateDebut(), r.getDateFin(), 4L)).thenReturn(true);
            String erreur = regles.verifier(r);
            assertEquals(heure == 12 || heure == 13 || heure == 18,
                    erreur.contains("justification"), "Créneau débutant à " + heure + " h");
        }
    }

    @Test void carteGriseManquanteBloquee() {
        Reservation r = reservation(CategorieVehicule.MUTUALISEE);
        when(pieces.findByVehiculeOrderByDateDepotDesc(r.getVehicule())).thenReturn(List.of());
        assertTrue(regles.verifier(r).contains("carte grise"));
    }
}
