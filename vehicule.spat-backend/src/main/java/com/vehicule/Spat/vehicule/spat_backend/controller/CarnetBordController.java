package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Carnet de bord numérique et état des lieux.
 *
 * Chaque utilisation effective d'un véhicule doit être
 * enregistrée : date, conducteur, horaires de sortie et
 * de retour, destination, motif, kilométrage (ou niveau
 * de charge pour les motos).
 *
 * Un état des lieux simple avant et après utilisation est
 * également prévu.
 */
@RestController
@RequestMapping("/api/carnet-bord")
public class CarnetBordController {

    private final CarnetBordRepository carnetBordRepository;
    private final EtatLieuxRepository etatLieuxRepository;
    private final VehiculeRepository vehiculeRepository;
    private final ReservationRepository reservationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService acces;

    @org.springframework.beans.factory.annotation.Autowired
    private com.vehicule.Spat.vehicule.spat_backend.service.ReglesDispositifService regles;

    @org.springframework.beans.factory.annotation.Autowired
    private com.vehicule.Spat.vehicule.spat_backend.service.EntretienPeriodiqueService entretienPeriodiqueService;

    public CarnetBordController(
            CarnetBordRepository carnetBordRepository,
            EtatLieuxRepository etatLieuxRepository,
            VehiculeRepository vehiculeRepository,
            ReservationRepository reservationRepository,
            UtilisateurRepository utilisateurRepository,
            com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService acces
    ) {
        this.carnetBordRepository = carnetBordRepository;
        this.etatLieuxRepository = etatLieuxRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.reservationRepository = reservationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.acces = acces;
    }

    private List<CarnetBord> filtrer(List<CarnetBord> carnets) {
        Utilisateur u = acces.courant();
        return carnets.stream().filter(c -> acces.peutLireCarnet(u, c)).toList();
    }

    // =========================================================
    // CARNET DE BORD
    // =========================================================

    /**
     * Liste tous les carnets de bord.
     */
    @GetMapping
    public ResponseEntity<List<CarnetBord>> listerTous() {
        return ResponseEntity.ok(
                filtrer(carnetBordRepository.findAll())
        );
    }

    /**
     * Carnets de bord d'un véhicule.
     */
    @GetMapping("/vehicule/{vehiculeId}")
    public ResponseEntity<List<CarnetBord>> parVehicule(
            @PathVariable Long vehiculeId
    ) {
        return ResponseEntity.ok(
                filtrer(carnetBordRepository.findByVehiculeIdOrderByDateSortieDesc(vehiculeId))
        );
    }

    /**
     * Récupérer le dernier kilométrage connu d'un véhicule.
     * 
     * Sources de données (par ordre de priorité) :
     * 1. GPS en temps réel (si véhicule équipé GPS)
     * 2. Dernier kilometrageRetour du carnet de bord clôturé
     * 3. KilometrageDepart du carnet en cours
     * 
     * @param vehiculeId ID du véhicule
     * @return Informations sur le dernier kilométrage avec la source de données
     */
    @GetMapping("/vehicule/{vehiculeId}/dernier-kilometrage")
    public ResponseEntity<?> dernierKilometrage(
            @PathVariable Long vehiculeId
    ) {
        try {
            Vehicule vehicule = vehiculeRepository.findById(vehiculeId)
                    .orElseThrow(() -> new RuntimeException("Véhicule introuvable"));
            
            // Vérifie si c'est une moto électrique (pas de kilométrage)
            if (com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule.estMotoElectrique(vehicule.getCategorie())) {
                return ResponseEntity.ok(Map.of(
                        "estMotoElectrique", true,
                        "equipeeGPS", Boolean.TRUE.equals(vehicule.getGpsEquipe()),
                        "message", "Les motos électriques utilisent le niveau de charge, pas le kilométrage"
                ));
            }

            boolean equipeeGPS = Boolean.TRUE.equals(vehicule.getGpsEquipe()) && vehicule.getGpsDeviceId() != null;

            // TODO FUTUR : Si équipée GPS, interroger le service GPS pour obtenir
            // le kilométrage en temps réel depuis le dernier relevé GPS
            // Exemple :
            // if (equipeeGPS && gpsService != null) {
            //     Long kmGPS = gpsService.getDernierKilometrageGPS(vehicule.getGpsDeviceId());
            //     if (kmGPS != null) {
            //         return ResponseEntity.ok(Map.of(
            //             "estMotoElectrique", false,
            //             "equipeeGPS", true,
            //             "dernierKilometrage", kmGPS,
            //             "source", "GPS",
            //             "dateReference", LocalDateTime.now(),
            //             "message", "Kilométrage récupéré depuis le traceur GPS en temps réel"
            //         ));
            //     }
            // }

            List<CarnetBord> carnets = carnetBordRepository.findByVehiculeIdOrderByDateSortieDesc(vehiculeId);
            Double kilometrageCarnet = null;
            LocalDateTime dateCarnet = null;
            String sourceCarnet = null;
            String messageCarnet = null;
            CarnetBord carnetReference = null;
            // La liste est triée par départ décroissant. Compare la date de
            // sortie/retour plutôt que le statut seul afin de retenir la valeur
            // réellement la plus récente pour ce véhicule.
            for (CarnetBord carnet : carnets) {
                Double kilometrage = null;
                LocalDateTime dateReference = null;
                String source = null;
                String message = null;
                if ("EN_COURS".equalsIgnoreCase(carnet.getStatut()) && carnet.getKilometrageDepart() != null) {
                    kilometrage = carnet.getKilometrageDepart().doubleValue();
                    dateReference = carnet.getDateSortie();
                    source = "EN_COURS";
                    message = "Kilométrage de départ du trajet en cours";
                } else if ("CLOTURE".equalsIgnoreCase(carnet.getStatut()) && carnet.getKilometrageRetour() != null) {
                    kilometrage = carnet.getKilometrageRetour().doubleValue();
                    dateReference = carnet.getDateRetour();
                    source = equipeeGPS ? "MANUEL_GPS_DISPONIBLE" : "MANUEL";
                    message = "Kilométrage récupéré du dernier trajet enregistré";
                }
                if (kilometrage != null && (dateCarnet == null || dateReference == null || dateReference.isAfter(dateCarnet))) {
                    kilometrageCarnet = kilometrage;
                    dateCarnet = dateReference;
                    sourceCarnet = source;
                    messageCarnet = message;
                    carnetReference = carnet;
                }
            }

            com.vehicule.Spat.vehicule.spat_backend.model.SuiviEntretienPeriodique suivi =
                    entretienPeriodiqueService == null ? null : entretienPeriodiqueService.trouverParVehicule(vehiculeId);
            if (suivi != null && suivi.getDernierKilometrageConnu() != null
                    && (dateCarnet == null || suivi.getDateMiseAJour() == null
                    || !suivi.getDateMiseAJour().isBefore(dateCarnet))) {
                return ResponseEntity.ok(Map.of(
                        "estMotoElectrique", false,
                        "equipeeGPS", equipeeGPS,
                        "dernierKilometrage", suivi.getDernierKilometrageConnu(),
                        "source", "SUIVI_ENTRETIEN_PERIODIQUE",
                        "dateReference", suivi.getDateMiseAJour(),
                        "message", "Kilométrage du suivi d'entretien périodique"
                ));
            }

            if (kilometrageCarnet != null) {
                return ResponseEntity.ok(Map.of(
                        "estMotoElectrique", false,
                        "equipeeGPS", equipeeGPS,
                        "dernierKilometrage", kilometrageCarnet,
                        "source", sourceCarnet,
                        "dateReference", dateCarnet,
                        "carnetId", carnetReference.getId(),
                        "message", messageCarnet
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "estMotoElectrique", false,
                    "equipeeGPS", equipeeGPS,
                    "dernierKilometrage", (Object) null,
                    "source", carnets.isEmpty() ? "AUCUN_HISTORIQUE" : "AUCUNE_DONNEE",
                    "message", carnets.isEmpty() ? "Aucun historique de déplacement pour ce véhicule" : "Aucun kilométrage enregistré pour ce véhicule"
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    Map.of("erreur", e.getMessage())
            );
        }
    }

    /**
     * Carnets de bord en cours (véhicules sortis).
     */
    @GetMapping("/en-cours")
    public ResponseEntity<List<CarnetBord>> enCours() {
        return ResponseEntity.ok(
                filtrer(carnetBordRepository.findByStatut("EN_COURS"))
        );
    }

    /**
     * Créer une entrée de carnet de bord (sortie du véhicule).
     */
    @PostMapping
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> creerSortie(@RequestBody Map<String, Object> body) {
        try {
            if (body.get("reservationId") == null)
                return ResponseEntity.badRequest().body(Map.of("erreur", "Un ticket validé est obligatoire."));
            Reservation mission = reservationRepository.findById(Long.valueOf(body.get("reservationId").toString()))
                    .orElseThrow(() -> new IllegalArgumentException("Ticket introuvable"));
            acces.exigerLecture(mission);
            if (!Set.of("VALIDEE", "PLANIFIEE").contains(mission.getStatut()))
                return ResponseEntity.status(409).body(Map.of("erreur", "La mission doit être validée avant la sortie."));
            Long vehiculeId = Long.parseLong(body.get("vehiculeId").toString());
            Vehicule vehicule = vehiculeRepository.findByIdForUpdate(vehiculeId)
                    .orElseThrow(() -> new RuntimeException("Véhicule introuvable"));
            if (mission.getVehicule() == null || !vehiculeId.equals(mission.getVehicule().getId()))
                return ResponseEntity.status(409).body(Map.of("erreur", "Le véhicule doit être celui du ticket validé."));
            if (!carnetBordRepository.findEnCoursByVehicule(vehiculeId).isEmpty())
                return ResponseEntity.status(409).body(Map.of("erreur", "Un carnet est déjà ouvert pour ce véhicule."));
            String erreurRegle = regles == null ? null : regles.verifier(mission);
            if (erreurRegle != null) return ResponseEntity.status(409).body(Map.of("erreur", erreurRegle));

            CarnetBord carnet = new CarnetBord();
            carnet.setVehicule(vehicule);
            carnet.setConducteurNom(mission.getConducteurMoto() != null ? mission.getConducteurMoto().getNomComplet()
                    : mission.getChauffeur() != null ? mission.getChauffeur().getNom() : mission.getDemandeurNom());
            carnet.setConducteurMatricule(mission.getConducteurMoto() != null ? mission.getConducteurMoto().getMatricule()
                    : mission.getChauffeur() != null ? mission.getChauffeur().getMatricule() : mission.getDemandeurMatricule());
            carnet.setDateSortie(LocalDateTime.parse((String) body.get("dateSortie")));
            if (carnet.getDateSortie().isAfter(LocalDateTime.now()) || carnet.getDateSortie().isBefore(mission.getDateDebut())
                    || !carnet.getDateSortie().isBefore(mission.getDateFin()))
                return ResponseEntity.badRequest().body(Map.of("erreur", "La sortie doit respecter la période autorisée et ne peut être future."));
            carnet.setDestination(mission.getDestination());
            carnet.setMotif(mission.getMotif());

            if (body.containsKey("kilometrageDepart") && body.get("kilometrageDepart") != null) {
                carnet.setKilometrageDepart(Long.parseLong(body.get("kilometrageDepart").toString()));
            }
            if (body.containsKey("niveauChargeDepart") && body.get("niveauChargeDepart") != null) {
                carnet.setNiveauChargeDepart(Integer.parseInt(body.get("niveauChargeDepart").toString()));
            }
            if (body.containsKey("reservationId") && body.get("reservationId") != null) {
                Long reservationId = Long.parseLong(body.get("reservationId").toString());
                reservationRepository.findById(reservationId).ifPresent(carnet::setReservation);
            }
            carnet.setSaisiPar(acces.courant());
            if (com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule.estMotoElectrique(vehicule.getCategorie())) {
                if (carnet.getNiveauChargeDepart() == null || carnet.getNiveauChargeDepart() < 0 || carnet.getNiveauChargeDepart() > 100)
                    return ResponseEntity.badRequest().body(Map.of("erreur", "Le niveau de charge doit être compris entre 0 et 100 %."));
            } else if (carnet.getKilometrageDepart() == null || carnet.getKilometrageDepart() < 0)
                return ResponseEntity.badRequest().body(Map.of("erreur", "Le kilométrage de départ est obligatoire et positif."));

            carnet.setStatut("EN_COURS");
            String erreurEtat = verifierEtat(body.get("etatAvant"));
            if (erreurEtat != null) return ResponseEntity.badRequest().body(Map.of("erreur", erreurEtat));
            CarnetBord saved = carnetBordRepository.save(carnet);
            enregistrerEtat(saved, "AVANT", body.get("etatAvant"));
            vehicule.setStatut("EN_MISSION");
            vehiculeRepository.save(vehicule);
            return ResponseEntity.ok(saved);

        } catch (org.springframework.web.server.ResponseStatusException e) { throw e;
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    Map.of("erreur", e.getMessage())
            );
        }
    }

    /**
     * Enregistrer le retour (clôture du carnet de bord).
     */
    @PutMapping("/{id}/retour")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> enregistrerRetour(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        try {
            CarnetBord carnet = carnetBordRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Entrée introuvable"));
            acces.exigerLectureCarnet(carnet);
            if (!"EN_COURS".equals(carnet.getStatut())) return ResponseEntity.status(409).body(Map.of("erreur", "Ce carnet est déjà clôturé."));
            CarnetBord copie = new CarnetBord();
            org.springframework.beans.BeanUtils.copyProperties(carnet, copie); carnet = copie;

            carnet.setDateRetour(LocalDateTime.parse((String) body.get("dateRetour")));

            if (body.containsKey("kilometrageRetour") && body.get("kilometrageRetour") != null) {
                carnet.setKilometrageRetour(Long.parseLong(body.get("kilometrageRetour").toString()));
            }
            if (body.containsKey("niveauChargeRetour") && body.get("niveauChargeRetour") != null) {
                carnet.setNiveauChargeRetour(Integer.parseInt(body.get("niveauChargeRetour").toString()));
            }

            if (carnet.getDateRetour().isBefore(carnet.getDateSortie()) || carnet.getDateRetour().isAfter(LocalDateTime.now()))
                return ResponseEntity.badRequest().body(Map.of("erreur", "Heure de retour invalide."));
            if (com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule.estMotoElectrique(carnet.getVehicule().getCategorie())) {
                if (carnet.getNiveauChargeRetour() == null || carnet.getNiveauChargeRetour() < 0 || carnet.getNiveauChargeRetour() > 100)
                    return ResponseEntity.badRequest().body(Map.of("erreur", "Charge de retour invalide (0 à 100 %)."));
            } else if (carnet.getKilometrageRetour() == null || carnet.getKilometrageDepart() == null
                    || carnet.getKilometrageRetour() < carnet.getKilometrageDepart())
                return ResponseEntity.badRequest().body(Map.of("erreur", "Le kilométrage de retour doit être supérieur ou égal au départ."));
            String erreurEtat = verifierEtat(body.get("etatApres"));
            if (erreurEtat != null) return ResponseEntity.badRequest().body(Map.of("erreur", erreurEtat));
                if (entretienPeriodiqueService != null && carnet.getKilometrageRetour() != null
                    && !com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule
                        .estMotoElectrique(carnet.getVehicule().getCategorie())) {
                entretienPeriodiqueService.enregistrerKilometrage(
                    carnet.getVehicule(), carnet.getKilometrageRetour().doubleValue());
                }
            enregistrerEtat(carnet, "APRES", body.get("etatApres"));
            carnet.setStatut("CLOTURE");
            carnetBordRepository.save(carnet);
            if (carnet.getVehicule().getId() != null) {
                Vehicule retourVehicule = vehiculeRepository.findByIdForUpdate(carnet.getVehicule().getId()).orElse(null);
                if (retourVehicule != null && "EN_MISSION".equals(retourVehicule.getStatut())) {
                    retourVehicule.setStatut("DISPONIBLE");
                    vehiculeRepository.save(retourVehicule);
                }
            }
            if (carnet.getReservation() != null) {
                Reservation mission = carnet.getReservation();
                mission.setStatut("CLOTUREE"); mission.setDateFin(carnet.getDateRetour());
                mission.setDureeUtilisationMinutes((int) java.time.Duration.between(carnet.getDateSortie(), carnet.getDateRetour()).toMinutes());
                reservationRepository.save(mission);
            }
            return ResponseEntity.ok(carnet);

        } catch (org.springframework.web.server.ResponseStatusException e) { throw e;
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    Map.of("erreur", e.getMessage())
            );
        }
    }

    // =========================================================
    // ETAT DES LIEUX
    // =========================================================

    private String verifierEtat(Object valeur) {
        // Compatibilité avec les anciennes intégrations : l'interface actuelle
        // envoie toujours l'état complet et le serveur enregistre un état
        // minimal si un ancien client ne le transmet pas encore.
        if (!(valeur instanceof Map<?, ?> etat)) return null;
        if (!Set.of("BON", "CORRECT", "MAUVAIS").contains(Objects.toString(etat.get("etatApparent"), "")))
            return "L'état apparent est obligatoire.";
        if (Objects.toString(etat.get("niveauCarburantCharge"), "").isBlank()) return "Le niveau de carburant ou de charge est obligatoire.";
        if (Boolean.TRUE.equals(etat.get("anomalieSignalee")) && Objects.toString(etat.get("descriptionAnomalie"), "").isBlank()) return "Décrivez l'anomalie.";
        return null;
    }

    private void enregistrerEtat(CarnetBord carnet, String moment, Object valeur) {
        Map<?, ?> donnees = valeur instanceof Map<?, ?> map ? map : Map.of(
                "etatApparent", "BON", "niveauCarburantCharge", "PLEIN",
                "equipementsOk", true, "anomalieSignalee", false);
        EtatLieux etat = new EtatLieux(); etat.setCarnetBord(carnet); etat.setVehicule(carnet.getVehicule());
        etat.setMoment(moment); etat.setEtatApparent(Objects.toString(donnees.get("etatApparent"), ""));
        etat.setNiveauCarburantCharge(Objects.toString(donnees.get("niveauCarburantCharge"), ""));
        etat.setEquipementsOk(Boolean.TRUE.equals(donnees.get("equipementsOk")));
        etat.setDetailEquipements(Objects.toString(donnees.get("detailEquipements"), ""));
        etat.setAnomalieSignalee(Boolean.TRUE.equals(donnees.get("anomalieSignalee")));
        etat.setDescriptionAnomalie(Objects.toString(donnees.get("descriptionAnomalie"), ""));
        etat.setRealisePar(acces.courant()); etatLieuxRepository.save(etat);
    }

    /**
     * Liste les états des lieux d'un carnet de bord.
     */
    @GetMapping("/{carnetId}/etat-lieux")
    public ResponseEntity<List<EtatLieux>> etatLieuxParCarnet(
            @PathVariable Long carnetId
    ) {
        CarnetBord carnet = carnetBordRepository.findById(carnetId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND));
        acces.exigerLectureCarnet(carnet);
        return ResponseEntity.ok(
                etatLieuxRepository.findByCarnetBordId(carnetId)
        );
    }

    /**
     * Créer un état des lieux (AVANT ou APRES).
     */
    @PostMapping("/{carnetId}/etat-lieux")
    public ResponseEntity<?> creerEtatLieux(
            @PathVariable Long carnetId,
            @RequestBody Map<String, Object> body
    ) {
        try {
            CarnetBord carnet = carnetBordRepository.findById(carnetId)
                    .orElseThrow(() -> new RuntimeException("Carnet introuvable"));
            acces.exigerLectureCarnet(carnet);
            if (!Set.of("AVANT", "APRES").contains(Objects.toString(body.get("moment"), "")))
                return ResponseEntity.badRequest().body(Map.of("erreur", "Précisez AVANT ou APRES."));
            if (!Set.of("BON", "CORRECT", "MAUVAIS").contains(Objects.toString(body.get("etatApparent"), "")))
                return ResponseEntity.badRequest().body(Map.of("erreur", "L'état apparent est obligatoire (BON, CORRECT, MAUVAIS)."));
            if (Boolean.TRUE.equals(body.get("anomalieSignalee")) && Objects.toString(body.get("descriptionAnomalie"), "").isBlank())
                return ResponseEntity.badRequest().body(Map.of("erreur", "Décrivez l'anomalie constatée."));
            if (etatLieuxRepository.findByCarnetBordId(carnetId).stream().anyMatch(e -> e.getMoment().equals(body.get("moment"))))
                return ResponseEntity.status(409).body(Map.of("erreur", "Cet état des lieux a déjà été enregistré."));

            EtatLieux etat = new EtatLieux();
            etat.setCarnetBord(carnet);
            etat.setVehicule(carnet.getVehicule());
            etat.setMoment((String) body.get("moment")); // AVANT ou APRES
            etat.setEtatApparent((String) body.get("etatApparent"));
            etat.setNiveauCarburantCharge((String) body.get("niveauCarburantCharge"));

            if (body.containsKey("equipementsOk")) {
                etat.setEquipementsOk(Boolean.parseBoolean(body.get("equipementsOk").toString()));
            }
            etat.setDetailEquipements((String) body.get("detailEquipements"));

            if (body.containsKey("anomalieSignalee")) {
                etat.setAnomalieSignalee(Boolean.parseBoolean(body.get("anomalieSignalee").toString()));
            }
            etat.setDescriptionAnomalie((String) body.get("descriptionAnomalie"));

            etat.setRealisePar(acces.courant());

            EtatLieux saved = etatLieuxRepository.save(etat);
            return ResponseEntity.ok(saved);

        } catch (org.springframework.web.server.ResponseStatusException e) { throw e;
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    Map.of("erreur", e.getMessage())
            );
        }
    }
}
