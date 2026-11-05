package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.mockito.Mockito.mock;
import static org.junit.jupiter.api.Assertions.*;

class AccesParcoursServiceTest {
    private final AccesParcoursService acces = new AccesParcoursService(mock(UtilisateurRepository.class));
    private Utilisateur utilisateur(String role, long id, long direction) {
        Utilisateur u = new Utilisateur(); u.setId(id); u.setRole(role); u.setDirectionId(direction); u.setActif(true); return u;
    }
    private Reservation dossier() {
        Reservation r = new Reservation(); r.setDemandeur(utilisateur("ASSISTANT_DIRECTION", 10, 1));
        Vehicule v = new Vehicule();
        Direction d = new Direction(); d.setId(1L); v.getDirections().add(d);
        Direction partagee = new Direction(); partagee.setId(2L); v.getDirections().add(partagee);
        r.setVehicule(v); return r;
    }
    @Test void chefDirectionNeVoitPasAutreDirection() {
        assertFalse(acces.peutLire(utilisateur("CHEF_DIRECTION", 20, 3), dossier()));
        assertTrue(acces.peutLire(utilisateur("CHEF_DIRECTION", 20, 1), dossier()));
    }
    @Test void assistanteDuGroupeVoitPlanningPartage() {
        assertTrue(acces.peutLire(utilisateur("ASSISTANT_DIRECTION", 20, 2), dossier()));
        assertFalse(acces.peutLire(utilisateur("ASSISTANT_DIRECTION", 20, 3), dossier()));
    }
    @Test void chauffeurNeVoitQueSesMissions() {
        Reservation r = dossier(); Chauffeur c = new Chauffeur(); c.setMatricule("C1"); r.setChauffeur(c);
        Utilisateur u = utilisateur("CHAUFFEUR", 30, 0); u.setMatricule("C1");
        assertTrue(acces.peutLire(u, r)); u.setMatricule("C2"); assertFalse(acces.peutLire(u, r));
    }
    @ParameterizedTest @ValueSource(strings = {"ADMIN", "SUPER_ADMIN", "CO_ADMIN", "DIRECTEUR_DFP", "CHEF_DGAL", "CHEF_SERVICE_LOGISTIQUE", "AGENT_FLOTTE", "MECANICIEN_DID"})
    void profilsTransversesPeuventConsulter(String role) { assertTrue(acces.peutLire(utilisateur(role, 20, 3), dossier())); }
    @Test void compteDesactiveInterditMemeAdministrateur() {
        Utilisateur u = utilisateur("ADMIN", 20, 3); u.setActif(false); assertFalse(acces.peutLire(u, dossier()));
    }
}
