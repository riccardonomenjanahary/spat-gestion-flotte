package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.*;
import org.junit.jupiter.api.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MotDePasseOublieControllerTest {
    private final UtilisateurRepository utilisateurs = mock(UtilisateurRepository.class);
    private final EmailService emails = mock(EmailService.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final MotDePasseOublieController controller = new MotDePasseOublieController(utilisateurs, mock(NotificationService.class), encoder, emails);

    private MotDePasseOublieController.DemandeEmailRequest demande(String email) {
        var demande = new MotDePasseOublieController.DemandeEmailRequest(); demande.setEmail(email); return demande;
    }

    @Test void emailMalFormeOuInconnuRefuseSansEnvoi() {
        assertEquals(400, controller.envoyerMotDePasseTemporaire(demande("adresse invalide")).getStatusCode().value());
        when(utilisateurs.findByEmailIgnoreCase("absent@example.invalid")).thenReturn(Optional.empty());
        assertEquals(400, controller.envoyerMotDePasseTemporaire(demande("absent@example.invalid")).getStatusCode().value());
        verifyNoInteractions(emails); verify(utilisateurs, never()).save(any());
    }

    @Test void emailManuelCompareAuCompteSansTenirCompteDeLaCasse() {
        Utilisateur compte = new Utilisateur(); compte.setActif(true); compte.setEmail("personnel@example.invalid"); compte.setMatricule("TEST"); compte.setNomComplet("Recette");
        when(utilisateurs.findByEmailIgnoreCase("Personnel@Example.invalid")).thenReturn(Optional.of(compte));
        when(encoder.encode(anyString())).thenReturn("hash-temporaire");
        when(emails.envoyerMotDePasseTemporaireOublie(eq(compte.getEmail()), eq("Recette"), eq("TEST"), anyString())).thenReturn(true);
        assertEquals(200, controller.envoyerMotDePasseTemporaire(demande(" Personnel@Example.invalid ")).getStatusCode().value());
        assertEquals("hash-temporaire", compte.getMotDePasseTemporaireHash());
        assertNotNull(compte.getMotDePasseTemporaireExpireLe());
    }

    @Test void echecEmailNestJamaisPresenteCommeUnSucces() {
        Utilisateur compte = new Utilisateur(); compte.setActif(true); compte.setEmail("personnel@example.invalid");
        when(utilisateurs.findByEmailIgnoreCase(compte.getEmail())).thenReturn(Optional.of(compte));
        when(encoder.encode(anyString())).thenReturn("hash-temporaire");
        assertEquals(502, controller.envoyerMotDePasseTemporaire(demande(compte.getEmail())).getStatusCode().value());
        assertNull(compte.getMotDePasseTemporaireHash()); assertNull(compte.getMotDePasseTemporaireExpireLe());
    }

    @Test void compteDesactiveRefuse() {
        Utilisateur compte = new Utilisateur(); compte.setEmail("personnel@example.invalid"); compte.setActif(false);
        when(utilisateurs.findByEmailIgnoreCase(compte.getEmail())).thenReturn(Optional.of(compte));
        assertEquals(400, controller.envoyerMotDePasseTemporaire(demande(compte.getEmail())).getStatusCode().value());
        verifyNoInteractions(emails);
    }
}
