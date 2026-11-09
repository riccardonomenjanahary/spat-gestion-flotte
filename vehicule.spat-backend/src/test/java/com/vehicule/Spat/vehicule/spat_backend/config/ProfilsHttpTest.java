package com.vehicule.Spat.vehicule.spat_backend.config;

import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.context.annotation.*;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import static org.mockito.Mockito.mock;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;
import org.springframework.http.HttpMethod;

/** Exerce la vraie chaîne SecurityConfig sans ouvrir de base ni envoyer de notifications. */
class ProfilsHttpTest {
    private static AnnotationConfigWebApplicationContext contexte;
    private static MockMvc mvc;

    @Configuration @EnableWebMvc @EnableWebSecurity
    static class Config {
        @Bean UtilisateurRepository utilisateurs() { return mock(UtilisateurRepository.class); }
        @Bean UserDetailsServiceImpl details(UtilisateurRepository u) { return new UserDetailsServiceImpl(u); }
        @Bean JwtAuthFilter jwt(UtilisateurRepository u) { return new JwtAuthFilter(mock(JwtUtil.class), u); }
        @Bean Sonde sonde() { return new Sonde(); }
    }
    @RestController static class Sonde {
        @RequestMapping("/api/**") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
        void recevoir() { }
    }
    @BeforeAll static void ouvrir() {
        contexte = new AnnotationConfigWebApplicationContext();
        contexte.setServletContext(new MockServletContext()); contexte.register(Config.class, SecurityConfig.class);
        contexte.refresh(); mvc = webAppContextSetup(contexte).apply(springSecurity()).build();
    }
    @AfterAll static void fermer() { if (contexte != null) contexte.close(); }

    @ParameterizedTest
    @CsvSource({
        "ASSISTANT_DIRECTION,PUT,/api/reservations/1/assistant-direction/decision,204",
        "CHEF_DIRECTION,PUT,/api/reservations/1/assistant-direction/decision,403",
        "CHAUFFEUR,POST,/api/reservations/assistant-direction/rapide,403",
        "ASSISTANT_DIRECTION,POST,/api/reservations/assistant-direction/rapide,204",
        "ASSISTANT_DIRECTION,GET,/api/gps/positions-direction,204",
        "AGENT_PAR_INTERIM_ASSISTANT,GET,/api/gps/positions-direction,204",
        "CHEF_DIRECTION,GET,/api/gps/positions-direction,204",
        "AGENT_PAR_INTERIM_CHEF,GET,/api/gps/positions-direction,204",
        "ASSISTANT_DIRECTION,GET,/api/gps/positions,204",
        "CHEF_DIRECTION,GET,/api/gps/positions,204",
        "AGENT_FLOTTE,GET,/api/gps/positions,204",
        "ASSISTANT_DIRECTION,GET,/api/gps/positions/3760,403",
        "AGENT_FLOTTE,GET,/api/gps/positions-direction,403",
        "CHEF_DIRECTION,PUT,/api/conducteurs-autorises/1/valider,204",
        "AGENT_PAR_INTERIM_CHEF,PUT,/api/conducteurs-autorises/1/valider,204",
        "AGENT_PAR_INTERIM_ASSISTANT,POST,/api/conducteurs-autorises,204",
        "AGENT_PAR_INTERIM_ASSISTANT,GET,/api/conducteurs-autorises/profil,204",
        "CHEF_DIRECTION,GET,/api/conducteurs-autorises/1/permis,204",
        "AGENT_FLOTTE,GET,/api/conducteurs-autorises/1/permis,403",
        "ASSISTANT_DIRECTION,PUT,/api/conducteurs-autorises/1/valider,403",
        "CHEF_DGAL,POST,/api/requisitions,204",
        "CHEF_SERVICE_LOGISTIQUE,POST,/api/requisitions,403",
        "AGENT_FLOTTE,PUT,/api/signalements-incidents/1/statut,204",
        "CHAUFFEUR,PUT,/api/signalements-incidents/1/statut,403",
        "MECANICIEN_DID,PUT,/api/maintenances/1/avis-did,204",
        "AGENT_FLOTTE,PUT,/api/maintenances/1/avis-did,403",
        "CHEF_SERVICE_LOGISTIQUE,PUT,/api/reservations/1/decision,204",
        "CHEF_SERVICE_LOGISTIQUE,POST,/api/reservations,204",
        "CHEF_SERVICE_LOGISTIQUE,PUT,/api/reservations/1/validation-n2,403",
        "CHEF_DGAL,PUT,/api/reservations/1/validation-n2,204",
        "ADMIN,POST,/api/admin/directions,204",
        "SUPER_ADMIN,POST,/api/admin/directions,204",
        "CO_ADMIN,POST,/api/admin/directions,403",
        "DIRECTEUR_DFP,POST,/api/justificatifs/reservations/1,403",
        "CHEF_SERVICE_LOGISTIQUE,GET,/api/reservations/42/ordre-mission/destinataire,204",
        "AGENT_FLOTTE,GET,/api/reservations/42/ordre-mission/destinataire,403",
        "DIRECTEUR_DFP,PUT,/api/carnet-bord/1/retour,403",
        "ADMIN,GET,/api/carnet-bord,204",
        "CO_ADMIN,GET,/api/carnet-bord,204",
        "DIRECTEUR_DFP,GET,/api/carnet-bord,204",
        "CO_ADMIN,GET,/api/carnet-bord/1/etat-lieux,204",
        "DIRECTEUR_DFP,GET,/api/carnet-bord/1/etat-lieux,204",
        "CO_ADMIN,POST,/api/carnet-bord,403",
        "DIRECTEUR_DFP,POST,/api/carnet-bord,403",
        "CO_ADMIN,PUT,/api/carnet-bord/1/retour,403",
        "DIRECTEUR_DFP,GET,/api/admin/modifications,204",
        "DIRECTEUR_DFP,GET,/api/admin/utilisateurs,204",
        "CO_ADMIN,GET,/api/fiches-surete,204",
        "DIRECTEUR_DFP,GET,/api/fiches-surete/1/contenu,204",
        "DIRECTEUR_DFP,POST,/api/fiches-surete,403",
        "CO_ADMIN,GET,/api/requisitions,204",
        "DIRECTEUR_DFP,GET,/api/requisitions,204",
        "DIRECTEUR_DFP,PUT,/api/requisitions/1/terminer,403",
        "CO_ADMIN,GET,/api/rapports,204",
        "DIRECTEUR_DFP,GET,/api/rapports,204",
        "CHAUFFEUR,GET,/api/justificatifs/a-valider,403",
        "CHEF_SERVICE_LOGISTIQUE,GET,/api/justificatifs/a-valider,204"
    })
    void autorisations(String role, String methode, String chemin, int attendu) throws Exception {
        mvc.perform(request(HttpMethod.valueOf(methode), chemin).with(user("TEST").roles(role)))
                .andExpect(status().is(attendu));
    }

    @Test void sansSessionAccesRefuse() throws Exception {
        mvc.perform(request(HttpMethod.GET, "/api/reservations")).andExpect(status().is4xxClientError());
    }
}
