package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Affectation;
import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.AffectationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.ChauffeurAutoService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vehicules")
public class VehiculeController {

    private final VehiculeRepository vehiculeRepository;
    private final AffectationRepository affectationRepository;
    private final ReservationRepository reservationRepository;
    private final ChauffeurRepository chauffeurRepository;
    private final ChauffeurAutoService chauffeurAutoService;

    public VehiculeController(
            VehiculeRepository vehiculeRepository,
            AffectationRepository affectationRepository,
            ReservationRepository reservationRepository,
            ChauffeurRepository chauffeurRepository,
            ChauffeurAutoService chauffeurAutoService
    ) {
        this.vehiculeRepository = vehiculeRepository;
        this.affectationRepository = affectationRepository;
        this.reservationRepository = reservationRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.chauffeurAutoService = chauffeurAutoService;
    }

    // =========================================================
    // LISTER TOUS LES VEHICULES / MATERIELS
    // =========================================================

    @GetMapping
    public List<Vehicule> lister() {
        return vehiculeRepository.findAll();
    }

    // =========================================================
    // OBTENIR UN VEHICULE
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> obtenir(
            @PathVariable Long id
    ) {

        return vehiculeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build()
                );
    }

    // =========================================================
    // CREER UN VEHICULE / MATERIEL ROULANT
    // =========================================================

    @PostMapping
    public ResponseEntity<?> creer(
            @RequestBody Vehicule vehicule
    ) {

        // -----------------------------------------------------
        // CATEGORIE
        // -----------------------------------------------------

        if (vehicule.getCategorie() == null
                || vehicule.getCategorie().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(
                            Map.of(
                                    "erreur",
                                    "La catégorie est obligatoire."
                            )
                    );
        }

        // -----------------------------------------------------
        // IMMATRICULATION / IDENTIFIANT
        // -----------------------------------------------------

        if (vehicule.getImmatriculation() == null
                || vehicule.getImmatriculation().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(
                            Map.of(
                                    "erreur",
                                    "L'immatriculation ou l'identifiant du matériel est obligatoire."
                            )
                    );
        }

        // -----------------------------------------------------
        // MODELE / TYPE
        // -----------------------------------------------------

        if (vehicule.getModeleType() == null
                || vehicule.getModeleType().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(
                            Map.of(
                                    "erreur",
                                    "Le modèle / type est obligatoire."
                            )
                    );
        }

        // -----------------------------------------------------
        // AFFECTATION
        // -----------------------------------------------------

        if (vehicule.getAffectation() == null
                || vehicule.getAffectation().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(
                            Map.of(
                                    "erreur",
                                    "L'affectation est obligatoire."
                            )
                    );
        }

        // -----------------------------------------------------
        // ETAT GENERAL / OBSERVATIONS
        // -----------------------------------------------------

        if (vehicule.getEtatGeneralObservations() == null
                || vehicule
                .getEtatGeneralObservations()
                .isBlank()) {

            return ResponseEntity.badRequest()
                    .body(
                            Map.of(
                                    "erreur",
                                    "L'état général / observations est obligatoire."
                            )
                    );
        }

        // -----------------------------------------------------
        // NETTOYAGE
        // -----------------------------------------------------

        String immatriculation =
                vehicule
                        .getImmatriculation()
                        .trim();

        // -----------------------------------------------------
        // CONTROLE DOUBLON
        // -----------------------------------------------------

        boolean existeDeja =
                vehiculeRepository
                        .findAll()
                        .stream()
                        .anyMatch(
                                v ->
                                        v.getImmatriculation() != null
                                                && v
                                                .getImmatriculation()
                                                .equalsIgnoreCase(
                                                        immatriculation
                                                )
                        );

        if (existeDeja) {

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(
                            Map.of(
                                    "erreur",
                                    "Un véhicule ou matériel avec cette immatriculation / cet identifiant existe déjà."
                            )
                    );
        }

        // -----------------------------------------------------
        // ANNEE
        // -----------------------------------------------------

        if (vehicule.getAnnee() != null) {

            int anneeActuelle =
                    java.time.Year
                            .now()
                            .getValue();

            if (vehicule.getAnnee() < 1900
                    || vehicule.getAnnee()
                    > anneeActuelle + 1) {

                return ResponseEntity.badRequest()
                        .body(
                                Map.of(
                                        "erreur",
                                        "L'année du véhicule est invalide."
                                )
                        );
            }
        }

        // -----------------------------------------------------
        // NORMALISATION DES DONNEES
        // -----------------------------------------------------

        vehicule.setImmatriculation(
                immatriculation
        );

        vehicule.setCategorie(
                vehicule
                        .getCategorie()
                        .trim()
        );

        vehicule.setModeleType(
                vehicule
                        .getModeleType()
                        .trim()
        );

        vehicule.setAffectation(
                vehicule
                        .getAffectation()
                        .trim()
        );

        vehicule.setEtatGeneralObservations(
                vehicule
                        .getEtatGeneralObservations()
                        .trim()
        );

        // -----------------------------------------------------
        // STATUT PAR DEFAUT
        // -----------------------------------------------------

        if (vehicule.getStatut() == null
                || vehicule.getStatut().isBlank()) {

            vehicule.setStatut(
                    "DISPONIBLE"
            );
        }

        Vehicule sauvegarde =
                vehiculeRepository
                        .save(vehicule);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(sauvegarde);
    }

    // =========================================================
    // MODIFIER UN VEHICULE / MATERIEL
    // =========================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> modifier(
            @PathVariable Long id,
            @RequestBody Vehicule donnees
    ) {

        // -----------------------------------------------------
        // VALIDATIONS
        // -----------------------------------------------------

        if (donnees.getCategorie() == null
                || donnees.getCategorie().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(
                            Map.of(
                                    "erreur",
                                    "La catégorie est obligatoire."
                            )
                    );
        }

        if (donnees.getImmatriculation() == null
                || donnees.getImmatriculation().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(
                            Map.of(
                                    "erreur",
                                    "L'immatriculation ou l'identifiant du matériel est obligatoire."
                            )
                    );
        }

        if (donnees.getModeleType() == null
                || donnees.getModeleType().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(
                            Map.of(
                                    "erreur",
                                    "Le modèle / type est obligatoire."
                            )
                    );
        }

        if (donnees.getAffectation() == null
                || donnees.getAffectation().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(
                            Map.of(
                                    "erreur",
                                    "L'affectation est obligatoire."
                            )
                    );
        }

        if (donnees.getEtatGeneralObservations() == null
                || donnees
                .getEtatGeneralObservations()
                .isBlank()) {

            return ResponseEntity.badRequest()
                    .body(
                            Map.of(
                                    "erreur",
                                    "L'état général / observations est obligatoire."
                            )
                    );
        }

        // -----------------------------------------------------
        // ANNEE
        // -----------------------------------------------------

        if (donnees.getAnnee() != null) {

            int anneeActuelle =
                    java.time.Year
                            .now()
                            .getValue();

            if (donnees.getAnnee() < 1900
                    || donnees.getAnnee()
                    > anneeActuelle + 1) {

                return ResponseEntity.badRequest()
                        .body(
                                Map.of(
                                        "erreur",
                                        "L'année du véhicule est invalide."
                                )
                        );
            }
        }

        return vehiculeRepository
                .findById(id)
                .map(vehicule -> {

                    String nouvelleImmatriculation =
                            donnees
                                    .getImmatriculation()
                                    .trim();

                    // -----------------------------------------
                    // CONTROLE DOUBLON
                    // -----------------------------------------

                    boolean existeDeja =
                            vehiculeRepository
                                    .findAll()
                                    .stream()
                                    .anyMatch(
                                            v ->
                                                    !v.getId().equals(id)
                                                            && v.getImmatriculation() != null
                                                            && v
                                                            .getImmatriculation()
                                                            .equalsIgnoreCase(
                                                                    nouvelleImmatriculation
                                                            )
                                    );

                    if (existeDeja) {

                        return ResponseEntity
                                .status(HttpStatus.CONFLICT)
                                .body(
                                        Map.of(
                                                "erreur",
                                                "Un autre véhicule ou matériel utilise déjà cette immatriculation / cet identifiant."
                                        )
                                );
                    }

                    // -----------------------------------------
                    // MISE A JOUR
                    // -----------------------------------------

                    vehicule.setCategorie(
                            donnees
                                    .getCategorie()
                                    .trim()
                    );

                    vehicule.setImmatriculation(
                            nouvelleImmatriculation
                    );

                    vehicule.setModeleType(
                            donnees
                                    .getModeleType()
                                    .trim()
                    );

                    vehicule.setAnnee(
                            donnees.getAnnee()
                    );

                    vehicule.setAffectation(
                            donnees
                                    .getAffectation()
                                    .trim()
                    );

                    vehicule.setEtatGeneralObservations(
                            donnees
                                    .getEtatGeneralObservations()
                                    .trim()
                    );

                    if (donnees.getStatut() == null
                            || donnees
                            .getStatut()
                            .isBlank()) {

                        vehicule.setStatut(
                                "DISPONIBLE"
                        );

                    } else {

                        vehicule.setStatut(
                                donnees
                                        .getStatut()
                                        .trim()
                        );
                    }

                    Vehicule sauvegarde =
                            vehiculeRepository
                                    .save(vehicule);

                    return ResponseEntity.ok(
                            sauvegarde
                    );
                })
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build()
                );
    }


    // =========================================================
    // CHAUFFEURS COMPATIBLES SELON LE REFERENTIEL SPAT
    // =========================================================

    @GetMapping("/{id}/chauffeurs-compatibles")
    @Transactional(readOnly = true)
    public ResponseEntity<?> chauffeursCompatibles(
            @PathVariable Long id
    ) {

        Vehicule vehicule =
                vehiculeRepository
                        .findById(id)
                        .orElse(null);

        if (vehicule == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        List<Map<String, Object>> response =
                chauffeurAutoService
                        .trouverChauffeursCompatibles(
                                vehicule
                        )
                        .stream()
                        .map(
                                this::chauffeurVersMap
                        )
                        .toList();

        return ResponseEntity.ok(
                response
        );
    }


    // =========================================================
    // CHOIX AUTOMATIQUE D'UN CHAUFFEUR
    // =========================================================

    /**
     * Utilisé par le formulaire Chef de Direction.
     *
     * Si les dates sont fournies, le chauffeur choisi doit
     * également être disponible pendant toute la mission.
     */
    @GetMapping("/{id}/chauffeur-auto")
    @Transactional(readOnly = true)
    public ResponseEntity<?> chauffeurAutomatique(
            @PathVariable Long id,

            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE_TIME
            )
            LocalDateTime dateDebut,

            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE_TIME
            )
            LocalDateTime dateFin
    ) {

        Vehicule vehicule =
                vehiculeRepository
                        .findById(id)
                        .orElse(null);

        if (vehicule == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        Chauffeur chauffeur =
                chauffeurAutoService
                        .choisirChauffeurAutomatiquement(
                                vehicule,
                                dateDebut,
                                dateFin,
                                null
                        );

        if (chauffeur == null) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            Map.of(
                                    "message",
                                    "Aucun chauffeur compatible et disponible n'a été trouvé pour ce véhicule."
                            )
                    );
        }

        return ResponseEntity.ok(
                chauffeurVersMap(
                        chauffeur
                )
        );
    }


    // =========================================================
    // COMPATIBILITE AVEC L'ANCIEN ENDPOINT
    // =========================================================

    /**
     * Ancien endpoint conservé pour ne casser aucune page.
     *
     * Il utilise maintenant la règle automatique par
     * affectation de service au lieu d'exiger une ligne
     * Affectation ACTIVE permanente.
     */
    @GetMapping("/{id}/chauffeur-actif")
    @Transactional(readOnly = true)
    public ResponseEntity<?> chauffeurActifDuVehicule(
            @PathVariable Long id
    ) {

        Vehicule vehicule =
                vehiculeRepository
                        .findById(id)
                        .orElse(null);

        if (vehicule == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        Chauffeur chauffeur =
                chauffeurAutoService
                        .choisirChauffeurAutomatiquement(
                                vehicule,
                                null,
                                null,
                                null
                        );

        if (chauffeur == null) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            Map.of(
                                    "message",
                                    "Aucun chauffeur compatible n'a été trouvé pour ce véhicule."
                            )
                    );
        }

        return ResponseEntity.ok(
                chauffeurVersMap(
                        chauffeur
                )
        );
    }


    // =========================================================
    // CONVERSION CHAUFFEUR -> JSON LEGER
    // =========================================================

    private Map<String, Object> chauffeurVersMap(
            Chauffeur chauffeur
    ) {

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "id",
                chauffeur.getId()
        );

        response.put(
                "matricule",
                chauffeur.getMatricule()
        );

        response.put(
                "nom",
                chauffeur.getNom()
        );

        response.put(
                "prenom",
                chauffeur.getPrenom()
        );

        response.put(
                "telephone",
                chauffeur.getTelephone()
        );

        response.put(
                "affectationService",
                chauffeur.getAffectationService()
        );

        response.put(
                "statut",
                chauffeur.getStatut()
        );

        return response;
    }


    // =========================================================
    // SUPPRIMER UN VEHICULE
    // =========================================================

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> supprimer(
            @PathVariable Long id
    ) {

        if (!vehiculeRepository.existsById(id)) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        // -----------------------------------------------------
        // LIBERER LES CHAUFFEURS EVENTUELLEMENT AFFECTES
        // -----------------------------------------------------

        List<Affectation> affectations =
                affectationRepository
                        .findByVehiculeId(id);

        for (Affectation affectation : affectations) {

            if ("ACTIVE".equals(
                    affectation.getStatut()
            )
                    && affectation.getChauffeur() != null) {

                Chauffeur chauffeur =
                        affectation.getChauffeur();

                chauffeur.setStatut(
                        "DISPONIBLE"
                );

                chauffeurRepository.save(
                        chauffeur
                );
            }
        }

        // -----------------------------------------------------
        // SUPPRESSION DES RELATIONS
        // -----------------------------------------------------

        affectationRepository
                .deleteByVehiculeId(id);

        reservationRepository
                .deleteByVehiculeId(id);

        // -----------------------------------------------------
        // SUPPRESSION DU VEHICULE
        // -----------------------------------------------------

        vehiculeRepository
                .deleteById(id);

        return ResponseEntity
                .noContent()
                .build();
    }
}
