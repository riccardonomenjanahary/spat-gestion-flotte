package com.vehicule.Spat.vehicule.spat_backend.config;

import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.model.Assurance;
import com.vehicule.Spat.vehicule.spat_backend.model.Justificatif;
import com.vehicule.Spat.vehicule.spat_backend.model.StatutMaintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.TypeJustificatif;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.AssuranceRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.JustificatifRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.MaintenanceRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.StockageFichiersService;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

@Configuration
public class VehiculeDataInitializer {

    @Bean
    @Order(2)
    CommandLineRunner initialiserVehicules(
            VehiculeRepository vehiculeRepository,
            AssuranceRepository assuranceRepository,
            JustificatifRepository justificatifRepository,
            MaintenanceRepository maintenanceRepository,
            UtilisateurRepository utilisateurRepository,
            StockageFichiersService stockageFichiersService
    ) {

        return args -> {

            // =====================================================
            // VOITURES DE SERVICE
            // =====================================================

            // =====================================================
            // DISPOSITIF DGAL - VEHICULE DE PATROUILLE ET D'URGENCE
            // =====================================================

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Véhicule de patrouille et d'urgence",
                    "1205TCA",
                    "TOYOTA REVO",
                    2024,
                    "Garage / Missionnaire",
                    "Bon état",
                    "DISPONIBLE"
            );

            // =====================================================
            // DISPOSITIF DGAL - VOITURES DE SERVICE MUTUALISEES
            // =====================================================

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de service mutualisée",
                    "1218TCA",
                    "TOYOTA REVO",
                    2024,
                    "DFP, DIRCAP",
                    "Bon état (En salle de peinture)",
                    "MAINTENANCE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de service mutualisée",
                    "5174AH",
                    "TOYOTA REVO",
                    2019,
                    "SG, DG",
                    "Bon état",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de service mutualisée",
                    "5533AE",
                    "TOYOTA VIGO",
                    2007,
                    "DID, DAJ, DAGR",
                    "État moyen",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de service mutualisée",
                    "6742AJ",
                    "HILUX ATMO",
                    2024,
                    "DRH, DDI",
                    "État moyen",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de service mutualisée",
                    "6743AJ",
                    "HILUX ATMO",
                    2024,
                    "DIREX, DMC",
                    "État moyen",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Voiture de service mutualisée",
                    "5334AJ",
                    "HILUX ATMO",
                    2025,
                    "DID, DAJ, DAGR",
                    "État moyen",
                    "DISPONIBLE"
            );

            // =====================================================
            // DISPOSITIF DGAL - VEHICULES DE MISSION
            // =====================================================

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Véhicule de mission",
                    "01614WWA",
                    "TOYOTA PICK-UP",
                    2026,
                    "Garage",
                    "État neuf",
                    "DISPONIBLE"
            );

            ajouterSiAbsent(
                    vehiculeRepository,
                    "Véhicule de mission",
                    "01615WWA",
                    "TOYOTA PICK-UP",
                    2026,
                    "Garage",
                    "État neuf",
                    "DISPONIBLE"
            );

            // Jeu de données de test local : les véhicules DGAL demandés
            // sont disponibles et possèdent des documents valides.
            preparerVehiculesTest(
                    vehiculeRepository,
                    assuranceRepository,
                    justificatifRepository,
                    maintenanceRepository,
                    utilisateurRepository,
                    stockageFichiersService
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
            // MOTOS ÉLECTRIQUES HORWIN
            // =====================================================

            String[] immatriculationsMotos = {
                    "47101WWT",
                    "47102WWT",
                    "47103WWT",
                    "47104WWT",
                    "47105WWT",
                    "47106WWT",
                    "47107WWT",
                    "47108WWT",
                    "14403WWT",
                    "14404WWT"
            };

            for (String immatriculation : immatriculationsMotos) {
                ajouterSiAbsent(
                        vehiculeRepository,
                        "Moto électrique",
                        immatriculation,
                        "HORWIN",
                        2026,
                        "Garage",
                        "État neuf",
                        "DISPONIBLE"
                );
            }

                        // Les affectations officielles du dispositif DGAL sont
                        // synchronisées uniquement si le véhicule est encore
                        // affecté au garage (ou sans affectation), pour préserver
                        // les choix faits ensuite dans Admin > Véhicules.
                        affecterMotoSiNonConfiguree(vehiculeRepository, "47102WWT", "DFP");
                        affecterMotoSiNonConfiguree(vehiculeRepository, "47103WWT", "DDI");
                        affecterMotoSiNonConfiguree(vehiculeRepository, "47104WWT", "DIRCAP");
                        affecterMotoSiNonConfiguree(vehiculeRepository, "47105WWT", "DAJ");
                        affecterMotoSiNonConfiguree(vehiculeRepository, "47107WWT", "DIREX");
                        affecterMotoSiNonConfiguree(vehiculeRepository, "14404WWT", "DRH");
                        affecterMotoSiNonConfiguree(vehiculeRepository, "47101WWT", "SG");
                        affecterMotoSiNonConfiguree(vehiculeRepository, "47106WWT", "DMC");
                        affecterMotoSiNonConfiguree(vehiculeRepository, "47108WWT", "DAGR");
                        affecterMotoSiNonConfiguree(vehiculeRepository, "14403WWT", "DID");


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


            // =====================================================
            // CONFIGURATION DES 10 TRACEURS GPS
            // =====================================================

            // 0040 - AMBULANCE TOYOTA HIACE
            configurerGps(
                    vehiculeRepository,
                    "0040AH",
                    3756L
            );

            // 1205 TCA - TOYOTA HILUX
            configurerGps(
                    vehiculeRepository,
                    "1205TCA",
                    3760L
            );

            // 1218 TCA - TOYOTA HILUX
            configurerGps(
                    vehiculeRepository,
                    "1218TCA",
                    3761L
            );

            // 19255 WWT - TOYOTA COASTER
            configurerGps(
                    vehiculeRepository,
                    "19255WWT",
                    3765L
            );

            // 5174 AH - TOYOTA HILUX
            configurerGps(
                    vehiculeRepository,
                    "5174AH",
                    3763L
            );

            // 5334 AJ - TOYOTA HILUX
            configurerGps(
                    vehiculeRepository,
                    "5334AJ",
                    3758L
            );

            // 5533 AE - TOYOTA HILUX
            configurerGps(
                    vehiculeRepository,
                    "5533AE",
                    3762L
            );

            // 6742 AJ - TOYOTA HILUX
            configurerGps(
                    vehiculeRepository,
                    "6742AJ",
                    3759L
            );

            // 6743 AJ - TOYOTA HILUX
            configurerGps(
                    vehiculeRepository,
                    "6743AJ",
                    3764L
            );

            // 9774 AE - CAMION RENAULT BLEU
            configurerGps(
                    vehiculeRepository,
                    "9774 AE",
                    3851L
            );


            // =====================================================
            // FIN INITIALISATION
            // =====================================================

            System.out.println(
                    "Initialisation flotte SPAT terminée. "
                            + vehiculeRepository.count()
                            + " véhicule(s) / matériel(s) en base."
            );
        };
    }

    private void preparerVehiculesTest(
            VehiculeRepository vehiculeRepository,
            AssuranceRepository assuranceRepository,
            JustificatifRepository justificatifRepository,
            MaintenanceRepository maintenanceRepository,
            UtilisateurRepository utilisateurRepository,
            StockageFichiersService stockageFichiersService
    ) {
        List<String> immatriculations = List.of(
                "01614WWA", "01615WWA", "5174AH", "6743AJ", "1218TCA",
                "6742AJ", "5533AE", "5334AJ", "47103WWT"
        );
        LocalDate expiration = LocalDate.now().plusYears(2);

        for (String immatriculation : immatriculations) {
            vehiculeRepository.findByImmatriculationIgnoreCase(immatriculation).ifPresent(vehicule -> {
                vehicule.setStatut("DISPONIBLE");
                if (immatriculation.equalsIgnoreCase("01614WWA") || immatriculation.equalsIgnoreCase("01615WWA")) {
                    vehicule.setAffectation("Service Logistique DGAL");
                }
                vehicule.setDateExpirationVisiteTechnique(expiration);
                vehicule.setDateProchainEntretien(LocalDate.now().plusMonths(6));
                vehicule.setModeDetention("PROPRIETE");
                vehiculeRepository.save(vehicule);

                if (immatriculation.equalsIgnoreCase("47103WWT")) {
                    maintenanceRepository
                            .findByVehiculeIdAndOrigineDemandeIsNotNullAndStatutIn(
                                    vehicule.getId(),
                                    List.of(
                                            StatutMaintenance.EN_ATTENTE_VALIDATION_ENTRETIEN,
                                            StatutMaintenance.ENTRETIEN_AUTORISE,
                                            StatutMaintenance.ENTRETIEN_TERMINE,
                                            StatutMaintenance.EN_COURS,
                                            StatutMaintenance.PLANIFIEE
                                    )
                            )
                            .forEach(maintenance -> {
                                maintenance.setStatut(StatutMaintenance.ENTRETIEN_ANNULE);
                                maintenance.setDateCloture(java.time.LocalDateTime.now());
                                maintenanceRepository.save(maintenance);
                            });
                }

                if (assuranceRepository.findByVehiculeIdOrderByDateExpirationDesc(vehicule.getId()).stream().noneMatch(a ->
                        a.getDateExpiration() != null && !a.getDateExpiration().isBefore(expiration))) {
                    Assurance assurance = new Assurance();
                    assurance.setVehicule(vehicule);
                    assurance.setNumeroPolice("TEST-DGAL-" + immatriculation);
                    assurance.setDateDebut(LocalDate.now().minusMonths(1));
                    assurance.setDateExpiration(expiration);
                    assurance.setAssureur("Assureur de test SPAT");
                    assurance.setTypeCouverture("Tous risques - données de test");
                    assurance.setObservation("Document de test pour recette locale");
                    assurance.setDocumentPolice("assurance-test-dgal.pdf");
                    assuranceRepository.save(assurance);
                }

                utilisateurRepository.findByRole("ADMIN").stream().findFirst().ifPresent(admin -> {
                    creerJustificatifTest(justificatifRepository, stockageFichiersService, vehicule, admin,
                            TypeJustificatif.CARTE_GRISE, "Carte grise de test - " + immatriculation + ".pdf");
                    creerJustificatifTest(justificatifRepository, stockageFichiersService, vehicule, admin,
                            TypeJustificatif.VISITE_TECHNIQUE, "Visite technique de test - " + immatriculation + ".pdf");
                    creerJustificatifTest(justificatifRepository, stockageFichiersService, vehicule, admin,
                            TypeJustificatif.ASSURANCE, "Assurance de test - " + immatriculation + ".pdf");
                });
            });
        }
    }

    private void creerJustificatifTest(
            JustificatifRepository justificatifRepository,
            StockageFichiersService stockageFichiersService,
            Vehicule vehicule,
            Utilisateur admin,
            TypeJustificatif type,
            String nomFichier
    ) {
        boolean existe = justificatifRepository.findByVehiculeOrderByDateDepotDesc(vehicule).stream()
                .anyMatch(j -> j.getType() == type && Boolean.TRUE.equals(j.getValide()));
        if (existe) return;

        String nomStocke = "test-" + vehicule.getId() + "-" + type.name().toLowerCase() + ".pdf";
        try {
            Path fichier = stockageFichiersService.resoudreChemin(nomStocke);
            Files.createDirectories(fichier.getParent());
            if (!Files.exists(fichier)) {
                Files.writeString(fichier, "%PDF-1.4\n% Document de test SPAT\n%%EOF\n");
            }
            Justificatif justificatif = new Justificatif();
            justificatif.setType(type);
            justificatif.setNomFichier(nomFichier);
            justificatif.setNomStocke(nomStocke);
            justificatif.setTailleOctets(Files.size(fichier));
            justificatif.setContentType("application/pdf");
            justificatif.setVehicule(vehicule);
            justificatif.setDeposePar(admin);
            justificatif.setValide(true);
            justificatif.setLibelle("Document de test pour recette locale");
            justificatifRepository.save(justificatif);
        } catch (IOException e) {
            throw new IllegalStateException("Impossible de préparer le document de test " + nomFichier, e);
        }
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

        // Aucun GPS par défaut
        vehicule.setGpsEquipe(false);
        vehicule.setGpsDeviceId(null);

        repository.save(vehicule);
    }

        private void affecterMotoSiNonConfiguree(
                        VehiculeRepository repository,
                        String immatriculation,
                        String affectation
        ) {
                repository.findByImmatriculationIgnoreCase(immatriculation).ifPresent(vehicule -> {
                        String affectationActuelle = vehicule.getAffectation();
                        if (affectationActuelle == null || affectationActuelle.isBlank()
                                        || "GARAGE".equalsIgnoreCase(affectationActuelle.trim())) {
                                vehicule.setAffectation(affectation);
                                repository.save(vehicule);
                        }
                });
        }


    // =========================================================
    // CONFIGURATION GPS
    // =========================================================

    /**
     * Associe un identifiant gps-gps.online
     * à un véhicule déjà existant dans SPAT.
     *
     * La méthode est réexécutée au démarrage,
     * mais ne recrée pas le véhicule.
     */
    private void configurerGps(
            VehiculeRepository repository,
            String immatriculation,
            Long gpsDeviceId
    ) {

        repository
                .findByImmatriculationIgnoreCase(
                        immatriculation
                )
                .ifPresentOrElse(

                        vehicule -> {

                            boolean gpsDejaCorrect =
                                    Boolean.TRUE.equals(
                                            vehicule.getGpsEquipe()
                                    )
                                            &&
                                            gpsDeviceId.equals(
                                                    vehicule.getGpsDeviceId()
                                            );

                            if (gpsDejaCorrect) {
                                return;
                            }

                            vehicule.setGpsEquipe(true);
                            vehicule.setGpsDeviceId(
                                    gpsDeviceId
                            );

                            repository.save(vehicule);

                            System.out.println(
                                    "GPS configuré : "
                                            + immatriculation
                                            + " -> ID "
                                            + gpsDeviceId
                            );
                        },

                        () -> System.err.println(
                                "Impossible de configurer le GPS : "
                                        + "véhicule introuvable : "
                                        + immatriculation
                        )
                );
    }
}
