package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.config.*;
import com.vehicule.Spat.vehicule.spat_backend.dto.LoginRequest;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CompteChefDirectionMasqueTest {
    private final UtilisateurRepository utilisateurs = mock(UtilisateurRepository.class);
    private final PasswordEncoder motsDePasse = mock(PasswordEncoder.class);
    private final JwtUtil jwt = mock(JwtUtil.class);

    private Utilisateur compte(String role) {
        Utilisateur compte = new Utilisateur(); compte.setRole(role); compte.setActif(true);
        compte.setMatricule("D1"); compte.setMotDePasse("hash");
        when(utilisateurs.findByMatricule("D1")).thenReturn(Optional.of(compte));
        return compte;
    }

    @AfterEach void nettoyer() { SecurityContextHolder.clearContext(); }

    @ParameterizedTest
    @ValueSource(strings = {"CHEF_DIRECTION", "AGENT_PAR_INTERIM_CHEF", "ROLE_CHEF_DIRECTION"})
    void connexionMasqueeSansSupprimerCompte(String role) {
        Utilisateur compte = compte(role);
        when(motsDePasse.matches("secret", "hash")).thenReturn(true);
        LoginRequest requete = new LoginRequest(); requete.setNumMatricule("D1"); requete.setMotDePasse("secret");
        var reponse = new AuthController(utilisateurs, motsDePasse, jwt).login(requete);
        assertEquals(403, reponse.getStatusCode().value());
        assertTrue(compte.isActif());
        verifyNoInteractions(jwt);
        verify(utilisateurs, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"CHEF_DIRECTION", "AGENT_PAR_INTERIM_CHEF"})
    void ancienJetonNeRouvrePasEspaceMasque(String role) throws Exception {
        compte(role);
        when(jwt.estValide("ancien-jeton")).thenReturn(true);
        when(jwt.extraireEmail("ancien-jeton")).thenReturn("D1");
        var requete = new MockHttpServletRequest("GET", "/api/reservations");
        requete.addHeader("Authorization", "Bearer ancien-jeton");
        new JwtAuthFilter(jwt, utilisateurs).doFilter(requete, new MockHttpServletResponse(), new MockFilterChain());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @ParameterizedTest
    @ValueSource(strings = {"CHEF_SERVICE_LOGISTIQUE", "ASSISTANT_DIRECTION", "ADMIN"})
    void autresComptesRestentAccessibles(String role) {
        compte(role);
        when(motsDePasse.matches("secret", "hash")).thenReturn(true);
        when(jwt.genererToken("D1", role)).thenReturn("jeton");
        LoginRequest requete = new LoginRequest(); requete.setNumMatricule("D1"); requete.setMotDePasse("secret");
        assertEquals(200, new AuthController(utilisateurs, motsDePasse, jwt).login(requete).getStatusCode().value());
    }
}
