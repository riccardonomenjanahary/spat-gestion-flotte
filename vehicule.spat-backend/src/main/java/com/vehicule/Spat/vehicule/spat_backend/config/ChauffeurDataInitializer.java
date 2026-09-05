package com.vehicule.Spat.vehicule.spat_backend.config;

import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;
import com.vehicule.Spat.vehicule.spat_backend.repository.ChauffeurRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class ChauffeurDataInitializer implements CommandLineRunner {

    private final ChauffeurRepository chauffeurRepository;

    public ChauffeurDataInitializer(ChauffeurRepository chauffeurRepository) {
        this.chauffeurRepository = chauffeurRepository;
    }

    @Override
    public void run(String... args) {

        // Évite d'ajouter les chauffeurs à chaque redémarrage
        if (chauffeurRepository.count() > 0) {
            System.out.println("Les chauffeurs existent déjà dans la base.");
            return;
        }

        ajouterChauffeur(
                "2014007",
                "EMMANUEL",
                "",
                "Directeur Générale (D.G)"
        );

        ajouterChauffeur(
                "2014011",
                "RABE",
                "Venor",
                "Garage"
        );

        ajouterChauffeur(
                "2014010",
                "RANDRIANANTENAINA",
                "Sabin Joel",
                "Garage"
        );

        ajouterChauffeur(
                "2014012",
                "VELONJARA",
                "Parizera",
                "Ambulance"
        );

        ajouterChauffeur(
                "2014014",
                "FALY",
                "ZéZé",
                "Madame DG"
        );

        ajouterChauffeur(
                "2014013",
                "LEZOMA",
                "Germain",
                "Garage"
        );

        ajouterChauffeur(
                "2021045",
                "LERA",
                "",
                "Garage/Voirie"
        );

        ajouterChauffeur(
                "2024103",
                "RAZAFINDRAKATSO",
                "Richard",
                "Garage"
        );

        ajouterChauffeur(
                "2024106",
                "RAZANAMAHAVONJY",
                "Escande C.",
                "Garage"
        );

        ajouterChauffeur(
                "2024089",
                "LEDOA",
                "Nathaniel Ricco",
                "Garage"
        );

        ajouterChauffeur(
                "2024109",
                "ROMAIN",
                "",
                "Garage"
        );

        ajouterChauffeur(
                "2014009",
                "YAMICOLE",
                "Gidicaël",
                "Garage"
        );

        ajouterChauffeur(
                "2024095",
                "RAMANANTSOA",
                "Fidèle",
                "Ambulance"
        );

        System.out.println("13 chauffeurs ajoutés avec succès.");
    }

    private void ajouterChauffeur(
            String matricule,
            String nom,
            String prenom,
            String affectationService
    ) {

        Chauffeur chauffeur = new Chauffeur();

        chauffeur.setMatricule(matricule);
        chauffeur.setNom(nom);
        chauffeur.setPrenom(prenom);
        chauffeur.setAffectationService(affectationService);
        chauffeur.setStatut("DISPONIBLE");

        chauffeurRepository.save(chauffeur);
    }
}
