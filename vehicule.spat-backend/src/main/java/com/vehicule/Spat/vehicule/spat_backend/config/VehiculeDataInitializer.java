package com.vehicule.Spat.vehicule.spat_backend.config;

import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class VehiculeDataInitializer {

    @Bean
    CommandLineRunner initialiserVehicules(
            VehiculeRepository vehiculeRepository
    ) {

        return args -> {

            // =====================================================
            // VOITURES DE SERVICE
            // =====================================================

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de service",
                    "1205TCA",
                    "TOYOTA REVO",
                    2024,
                    "Garage / Missionnaire",
                    "Bon état",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de service",
                    "1218TCA",
                    "TOYOTA REVO",
                    2024,
                    "Garage / Missionnaire",
                    "Bon état (En salle de peinture)",
                    "MAINTENANCE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de service",
                    "5174AH",
                    "TOYOTA REVO",
                    2019,
                    "Garage / Missionnaire",
                    "Bon état",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de service",
                    "5533AE",
                    "TOYOTA VIGO",
                    2007,
                    "Garage",
                    "État moyen",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de service",
                    "6742AJ",
                    "HILUX ATMO",
                    2024,
                    "Garage",
                    "État moyen",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de service",
                    "6743AJ",
                    "HILUX ATMO",
                    2024,
                    "Garage",
                    "État moyen",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de service",
                    "5334AJ",
                    "HILUX ATMO",
                    2025,
                    "Garage",
                    "État moyen",
                    "DISPONIBLE"
            );


            // =====================================================
            // VOITURES DE FONCTION
            // =====================================================

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "40560WWT",
                    "Toyota Sequoia",
                    2025,
                    "DG SPAT",
                    "État neuf",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "33803WWT",
                    "Toyota Tundra",
                    2026,
                    "DG SPAT",
                    "État neuf, pare-brise fissuré, stationné au garage",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "11881WWT",
                    "LC300",
                    2023,
                    "DG SPAT",
                    "État bon",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "3940TBU",
                    "LC 200",
                    2020,
                    "DG SPAT",
                    "État bon",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "4972AJ",
                    "Prado TXL (Venant Penta)",
                    null,
                    "Transféré au Ministère des Transports et de la Météorologie, Tana (07/05/26)",
                    "État bon",
                    "TRANSFERE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "1219TCA",
                    "Fortuner VP",
                    2024,
                    "CT 1",
                    "État bon",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "53701WWT",
                    "Fortuner VP",
                    2026,
                    "SG SPAT",
                    "État neuf",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "44355WWT",
                    "Fortuner VP",
                    2026,
                    "DIREX",
                    "État neuf",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "44356WWT",
                    "Fortuner VP",
                    2026,
                    "DAJ",
                    "État neuf",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "44362WWT",
                    "Fortuner VP",
                    2026,
                    "DID",
                    "État neuf",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "37418WWT",
                    "Fortuner VP",
                    2026,
                    "DIRCAP",
                    "État neuf",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "19045WWT",
                    "Fortuner VP",
                    2026,
                    "DIR MARKETING",
                    "État neuf",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "10252WWA",
                    "Fortuner VP",
                    2026,
                    "DIR AUDIT",
                    "État neuf",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "3040TBV",
                    "Fortuner VP",
                    2024,
                    "CT 2",
                    "État bon",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "44361WWT",
                    "Fortuner VP",
                    2026,
                    "DRH",
                    "État neuf",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "19146WWT",
                    "Fortuner VP",
                    2026,
                    "DDI",
                    "État neuf",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de fonction",
                    "33515WWT",
                    "Fortuner VP",
                    2026,
                    "DFP",
                    "État neuf",
                    "DISPONIBLE"
            );


            // =====================================================
            // CAMIONS
            // =====================================================

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Camion",
                    "9774 AE",
                    "Benne à ordure",
                    2020,
                    "Garage",
                    "État moyen",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Camion",
                    "4409 AC",
                    "Benne à ordure",
                    1996,
                    "Garage",
                    "État moyen",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Camion",
                    "7542 AE",
                    "Benne basculante",
                    2012,
                    "Garage",
                    "État moyen",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Camion",
                    "9775AE",
                    "Camion à incendie",
                    2009,
                    "FENERIVE",
                    "État moyen",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Camion",
                    "40643WWT",
                    "Camion à incendie",
                    2026,
                    "Pompier",
                    "État bon",
                    "DISPONIBLE"
            );


            // =====================================================
            // ENGINS
            // =====================================================

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Engin",
                    "TRAX 966G",
                    "Pelle chargeuse",
                    null,
                    "Garage",
                    "État moyen (Panne BV)",
                    "MAINTENANCE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Engin",
                    "BOBCAT 272C",
                    "Pelle chargeuse",
                    null,
                    "Garage",
                    "État moyen",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Engin",
                    "ELEVATEUR HYSTER 2,5T",
                    "Élévateur",
                    null,
                    "Garage",
                    "État mauvais, fonctionnel",
                    "DISPONIBLE"
            );


            // =====================================================
            // TRACTEURS
            // =====================================================

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Tracteur",
                    "2535 AE",
                    "Renault Claas",
                    2006,
                    "Pompier",
                    "État moyen",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Tracteur",
                    "2536 AE",
                    "Renault Temis",
                    2006,
                    "Garage",
                    "État moyen",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Tracteur",
                    "TRACTEUR BALAYEUSE NECTIS 217VL",
                    "Renault Nectis",
                    null,
                    "Garage",
                    "État moyen",
                    "DISPONIBLE"
            );


            // =====================================================
            // AUTOPOMPES
            // =====================================================

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Autopompe",
                    "SIDES",
                    "Autopompe",
                    null,
                    "Pompier",
                    "État mauvais",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Autopompe",
                    "HAKA",
                    "Autopompe",
                    null,
                    "Pompier",
                    "État moyen",
                    "DISPONIBLE"
            );


            // =====================================================
            // REMORQUE
            // =====================================================

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Remorque",
                    "8869 AB",
                    "Remorque tracteur",
                    1991,
                    "Garage",
                    "Moyen",
                    "DISPONIBLE"
            );


            // =====================================================
            // BUS
            // =====================================================

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Bus",
                    "19255WWT",
                    "Bus 23 places",
                    2026,
                    "Garage",
                    "État neuf",
                    "DISPONIBLE"
            );


            // =====================================================
            // AMBULANCES
            // =====================================================

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Ambulance",
                    "0040AH",
                    "Ambulance Port",
                    2017,
                    "CEMEDI",
                    "État bon",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Ambulance",
                    "17045WWT",
                    "Ambulance",
                    2026,
                    "GARAGE",
                    "État moyen (En réparation)",
                    "MAINTENANCE"
            );


            System.out.println(
                    "Initialisation flotte SPAT terminée. "
                            + vehiculeRepository.count()
                            + " véhicule(s) / matériel(s) en base."
            );
        };
    }


    // =========================================================
    // AJOUTER UNIQUEMENT SI LE VEHICULE N'EXISTE PAS
    // =========================================================

    private void ajouterSiAbsent(
            VehiculeRepository repository,
            String categorie,
            String immatriculation,
            String modeleType,
            Integer annee,
            String affectation,
            String etatGeneralObservations,
            String statut
    ) {

        if (repository.existsByImmatriculationIgnoreCase(
                immatriculation
        )) {
            return;
        }

        Vehicule vehicule = new Vehicule();

        vehicule.setCategorie(categorie);
        vehicule.setImmatriculation(immatriculation);
        vehicule.setModeleType(modeleType);
        vehicule.setAnnee(annee);
        vehicule.setAffectation(affectation);
        vehicule.setEtatGeneralObservations(
                etatGeneralObservations
        );
        vehicule.setStatut(statut);

        repository.save(vehicule);
    }
}
