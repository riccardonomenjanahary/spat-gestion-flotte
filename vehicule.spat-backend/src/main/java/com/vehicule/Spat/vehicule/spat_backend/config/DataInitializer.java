package com.vehicule.Spat.vehicule.spat_backend.config;

import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class DataInitializer implements CommandLineRunner {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminPassword;
    private final String coAdminPassword;
    private final String superAdminPassword;

    public DataInitializer(UtilisateurRepository utilisateurRepository,
                           PasswordEncoder passwordEncoder,
                           @Value("${SPAT_BOOTSTRAP_ADMIN_PASSWORD:}") String adminPassword,
                           @Value("${SPAT_BOOTSTRAP_COADMIN_PASSWORD:}") String coAdminPassword,
                           @Value("${SPAT_BOOTSTRAP_SUPERADMIN_PASSWORD:}") String superAdminPassword) {
        this.utilisateurRepository = utilisateurRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminPassword = adminPassword;
        this.coAdminPassword = coAdminPassword;
        this.superAdminPassword = superAdminPassword;
    }

    @Override
    public void run(String... args) {

        // =====================================================
        // ADMIN EXISTANT
        // Les comptes existants sont conservés ; aucun mot de passe par défaut.
        // =====================================================

        if (!adminPassword.isBlank() && utilisateurRepository.findByMatricule("2026012").isEmpty()) {

            Utilisateur admin = new Utilisateur();

            admin.setMatricule("2026012");
            admin.setNomComplet("Administrateur SPAT");
            admin.setMotDePasse(passwordEncoder.encode(adminPassword));
            admin.setRole(Roles.ADMIN);
            admin.setActif(true);

            utilisateurRepository.save(admin);

            System.out.println("Compte admin créé : 2026012");
        }

        // Compte co-administrateur : mêmes consultations que l'admin,
        // sans droits d'écriture (verrouillés dans SecurityConfig).
        if (!coAdminPassword.isBlank() && utilisateurRepository.findByMatricule("2022002").isEmpty()) {
            Utilisateur coAdmin = new Utilisateur();
            coAdmin.setMatricule("2022002");
            coAdmin.setNomComplet("Co-administrateur SPAT");
            coAdmin.setMotDePasse(passwordEncoder.encode(coAdminPassword));
            coAdmin.setRole(Roles.CO_ADMIN);
            coAdmin.setActif(true);
            utilisateurRepository.save(coAdmin);
            System.out.println("Compte co-administrateur créé : 2022002");
        }


        // =====================================================
        // SUPER ADMIN
        // Créé uniquement s'il n'existe pas déjà
        // =====================================================

        if (!superAdminPassword.isBlank() && utilisateurRepository.findByMatricule("2024005").isEmpty()) {

            Utilisateur superAdmin = new Utilisateur();

            superAdmin.setMatricule("2024005");
            superAdmin.setNomComplet("Super Administrateur SPAT");
            superAdmin.setMotDePasse(passwordEncoder.encode(superAdminPassword));
            superAdmin.setRole(Roles.SUPER_ADMIN);
            superAdmin.setActif(true);

            utilisateurRepository.save(superAdmin);

            System.out.println("Compte super admin créé : 2024005");
        }
    }
}
