package com.vehicule.Spat.vehicule.spat_backend.config;

import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import static org.mockito.Mockito.*;

class DataInitializerTest {
    private final UtilisateurRepository utilisateurs = mock(UtilisateurRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);

    @Test void aucunCompteCreeSansMotDePasseConfigure() {
        new DataInitializer(utilisateurs, encoder, "", "", "").run();
        verifyNoInteractions(utilisateurs, encoder);
    }

    @Test void compteExistantJamaisReinitialise() {
        when(utilisateurs.findByMatricule("2026012")).thenReturn(Optional.of(new Utilisateur()));
        new DataInitializer(utilisateurs, encoder, "configured-test-password", "", "").run();
        verify(utilisateurs, never()).save(any()); verifyNoInteractions(encoder);
    }

    @Test void motDePasseConfigureEncodeAvantCreation() {
        when(utilisateurs.findByMatricule("2024005")).thenReturn(Optional.empty());
        when(encoder.encode("configured-test-password")).thenReturn("encoded-password");
        new DataInitializer(utilisateurs, encoder, "", "", "configured-test-password").run();
        verify(utilisateurs).save(argThat(u -> "2024005".equals(u.getMatricule())
                && "encoded-password".equals(u.getMotDePasse()) && Roles.SUPER_ADMIN.equals(u.getRole())));
    }
}
