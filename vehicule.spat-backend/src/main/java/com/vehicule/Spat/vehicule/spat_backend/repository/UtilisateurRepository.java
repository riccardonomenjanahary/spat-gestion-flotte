package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {

    Optional<Utilisateur> findByMatricule(String matricule);

    Optional<Utilisateur> findByEmail(String email);

    // Utilisateurs visibles dans l'application :
    // exclut les comptes techniques ADMIN et SUPER_ADMIN
    List<Utilisateur> findByRoleNotIn(List<String> roles);
}