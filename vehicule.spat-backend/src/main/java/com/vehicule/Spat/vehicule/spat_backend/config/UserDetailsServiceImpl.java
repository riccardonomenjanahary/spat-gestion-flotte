
        package com.vehicule.Spat.vehicule.spat_backend.config;

import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UtilisateurRepository utilisateurRepository;

    public UserDetailsServiceImpl(
            UtilisateurRepository utilisateurRepository) {

        this.utilisateurRepository = utilisateurRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String matricule)
            throws UsernameNotFoundException {

        Utilisateur utilisateur =
                utilisateurRepository
                        .findByMatricule(matricule)
                        .orElseThrow(
                                () -> new UsernameNotFoundException(
                                        "Utilisateur introuvable : " + matricule
                                )
                        );

        return User.builder()
                .username(utilisateur.getMatricule())
                .password(utilisateur.getMotDePasse())
                .authorities(
                        List.of(
                                new SimpleGrantedAuthority(
                                        "ROLE_" + utilisateur.getRole()
                                )
                        )
                )
                .disabled(!utilisateur.isActif())
                .build();
    }
}
