
        package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.CreateReservationRequest;
import com.vehicule.Spat.vehicule.spat_backend.dto.CreateMissionAssistantDirectionRequest;
import com.vehicule.Spat.vehicule.spat_backend.dto.ClotureMissionAssistantDirectionRequest;
import com.vehicule.Spat.vehicule.spat_backend.dto.DecisionReservationRequest;
import com.vehicule.Spat.vehicule.spat_backend.dto.DisponibiliteReservationResponse;

import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;
import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.model.Maintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;

import com.vehicule.Spat.vehicule.spat_backend.repository.ChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.MaintenanceRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.NotificationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.SignalementEntretienChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.TransactionCarburantRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;

import com.vehicule.Spat.vehicule.spat_backend.service.ChauffeurAutoService;
import com.vehicule.Spat.vehicule.spat_backend.service.DisponibiliteReservationService;
import com.vehicule.Spat.vehicule.spat_backend.service.MaintenanceService;
import com.vehicule.Spat.vehicule.spat_backend.service.NotificationService;

import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Duration;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Comparator;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

// =========================================================
// CONTROLLER RESERVATIONS
// =========================================================

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationRepository reservationRepository;

    private final VehiculeRepository vehiculeRepository;

    private final ChauffeurRepository chauffeurRepository;

    private final ChauffeurAutoService chauffeurAutoService;

    private final UtilisateurRepository utilisateurRepository;

    private final DisponibiliteReservationService disponibiliteReservationService;

    private final MaintenanceService maintenanceService;

    private final NotificationService notificationService;
    private final com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService accesParcours;
    private final com.vehicule.Spat.vehicule.spat_backend.service.ReglesDispositifService reglesDispositifService;

    private final MaintenanceRepository maintenanceRepository;

    private final SignalementEntretienChauffeurRepository signalementEntretienRepository;

    private final TransactionCarburantRepository transactionCarburantRepository;
    private final NotificationRepository notificationRepository;


    @Autowired
    public ReservationController(
            ReservationRepository reservationRepository,
            VehiculeRepository vehiculeRepository,
            ChauffeurRepository chauffeurRepository,
            ChauffeurAutoService chauffeurAutoService,
            UtilisateurRepository utilisateurRepository,
            DisponibiliteReservationService disponibiliteReservationService,
            MaintenanceService maintenanceService,
            NotificationService notificationService,
            MaintenanceRepository maintenanceRepository,
            SignalementEntretienChauffeurRepository signalementEntretienRepository,
            TransactionCarburantRepository transactionCarburantRepository,
            NotificationRepository notificationRepository,
            com.vehicule.Spat.vehicule.spat_backend.service.ReglesDispositifService reglesDispositifService,
            com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService accesParcours
    ) {

        this.reservationRepository =
                reservationRepository;

        this.vehiculeRepository =
                vehiculeRepository;

        this.chauffeurRepository =
                chauffeurRepository;

        this.chauffeurAutoService =
                chauffeurAutoService;

        this.utilisateurRepository =
                utilisateurRepository;

        this.disponibiliteReservationService =
                disponibiliteReservationService;

        this.maintenanceService =
                maintenanceService;

        this.notificationService =
                notificationService;

        this.maintenanceRepository = maintenanceRepository;

        this.signalementEntretienRepository = signalementEntretienRepository;

        this.transactionCarburantRepository = transactionCarburantRepository;
        this.notificationRepository = notificationRepository;
        this.reglesDispositifService = reglesDispositifService;
        this.accesParcours = accesParcours;
    }

    /**
     * Constructeur de compatibilité pour les tests unitaires et intégrations
     * qui n'utilisent pas le dépôt de notifications.
     */
    public ReservationController(
            ReservationRepository reservationRepository,
            VehiculeRepository vehiculeRepository,
            ChauffeurRepository chauffeurRepository,
            ChauffeurAutoService chauffeurAutoService,
            UtilisateurRepository utilisateurRepository,
            DisponibiliteReservationService disponibiliteReservationService,
            MaintenanceService maintenanceService,
            NotificationService notificationService,
            MaintenanceRepository maintenanceRepository,
            SignalementEntretienChauffeurRepository signalementEntretienRepository,
            TransactionCarburantRepository transactionCarburantRepository,
            com.vehicule.Spat.vehicule.spat_backend.service.ReglesDispositifService reglesDispositifService,
            com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService accesParcours
    ) {
        this(reservationRepository, vehiculeRepository, chauffeurRepository,
                chauffeurAutoService, utilisateurRepository,
                disponibiliteReservationService, maintenanceService,
                notificationService, maintenanceRepository,
                signalementEntretienRepository, transactionCarburantRepository,
                null, reglesDispositifService, accesParcours);
    }


    // =========================================================
    // UTILISATEUR CONNECTE
    // =========================================================

    private Utilisateur utilisateurCourant() {

        if (SecurityContextHolder
                .getContext()
                .getAuthentication() == null) {

            return null;
        }


        String matricule =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
                        .getName();


        if (matricule == null
                || matricule.isBlank()) {

            return null;
        }


        return utilisateurRepository
                .findByMatricule(
                        matricule
                )
                .orElse(null);
    }


    // =========================================================
    // CREER UNE DEMANDE DE VEHICULE
    // =========================================================

    @PostMapping
    @Transactional
    public ResponseEntity<?> creerReservation(
            @RequestBody CreateReservationRequest request
    ) {

        // -----------------------------------------------------
        // 1. UTILISATEUR CONNECTE
        // -----------------------------------------------------

        Utilisateur utilisateurConnecte =
                utilisateurCourant();

        if (utilisateurConnecte == null) {

            return ResponseEntity
                    .status(401)
                    .body(
                            "Utilisateur introuvable ou non authentifié"
                    );
        }

        if (request == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Les informations de la mission sont obligatoires."
                    );
        }

        // Pour une mission hors ville, le retour est toujours dérivé du
        // départ et de la durée saisie en jours (convertie en minutes).
        if ("HORS_TOAMASINA".equalsIgnoreCase(request.getZoneMission())
                && request.getDateDebut() != null
                && request.getDureeEstimeeMinutes() != null
                && request.getDureeEstimeeMinutes() > 0) {
            request.setDateFin(request.getDateDebut().plusMinutes(request.getDureeEstimeeMinutes()));
        }

        // -----------------------------------------------------
        // 2. DATES
        // -----------------------------------------------------

        if (request.getDateDebut() == null
                || request.getDateFin() == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La date de départ et la date de retour sont obligatoires"
                    );
        }

        if (!request
                .getDateFin()
                .isAfter(
                        request.getDateDebut()
                )) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La date de retour doit être après la date de départ"
                    );
        }

        LocalDateTime maintenant =
                LocalDateTime.now();

        if (request
                .getDateDebut()
                .isBefore(
                        maintenant
                )) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La date de départ ne peut pas être dans le passé"
                    );
        }

        // -----------------------------------------------------
        // 3. ZONE DE MISSION
        // -----------------------------------------------------

        String zoneMission =
                request.getZoneMission() == null
                        ? ""
                        : request
                        .getZoneMission()
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        );

        if (!"VILLE_TOAMASINA".equals(zoneMission)
                && !"HORS_TOAMASINA".equals(zoneMission)) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Veuillez préciser si la mission est dans Toamasina ou hors Toamasina."
                    );
        }

        boolean missionHorsToamasina =
                "HORS_TOAMASINA".equals(
                        zoneMission
                );

        String roleDemandeur = utilisateurConnecte.getRole() == null
                ? ""
                : utilisateurConnecte.getRole().trim().replaceFirst("^ROLE_", "");
        boolean assistantDirection = "ASSISTANT_DIRECTION".equalsIgnoreCase(roleDemandeur)
                || "AGENT_PAR_INTERIM_ASSISTANT".equalsIgnoreCase(roleDemandeur);
        boolean chefDirection = "CHEF_DIRECTION".equalsIgnoreCase(roleDemandeur)
                || "AGENT_PAR_INTERIM_CHEF".equalsIgnoreCase(roleDemandeur);
        boolean agentSurete = "AGENT_SURETE".equalsIgnoreCase(roleDemandeur);
        boolean demandeurDirection = assistantDirection || chefDirection;
        boolean chefLogistique = "CHEF_SERVICE_LOGISTIQUE".equalsIgnoreCase(roleDemandeur);
        if (missionHorsToamasina && chefLogistique && (request.getChauffeurId() == null || request.getVehiculeId() == null)) {
            return ResponseEntity.badRequest().body("Veuillez sélectionner le véhicule et le chauffeur avant de créer la mission.");
        }
        if (!missionHorsToamasina && !assistantDirection && !agentSurete && !Set.of("ADMIN", "SUPER_ADMIN", "CHEF_SERVICE_LOGISTIQUE")
                .contains(roleDemandeur)) {
            return ResponseEntity.status(403).body("Les missions dans Toamasina sont réservées à l'Assistant de direction ou à l'Agent de sûreté.");
        }
        if (agentSurete && !missionHorsToamasina) {
            return ResponseEntity.badRequest().body("Une demande de sûreté doit préciser une zone de patrouille hors du circuit des missions ordinaires.");
        }

        String typeVehiculeDemande = request.getTypeVehiculeSouhaite() == null
                ? ""
                : request.getTypeVehiculeSouhaite().trim().toUpperCase(Locale.ROOT);
        if (missionHorsToamasina && "MOTO".equals(typeVehiculeDemande)) {
            return ResponseEntity.badRequest().body("Les missions hors ville doivent être effectuées en voiture.");
        }
        if (missionHorsToamasina && demandeurDirection && !"VOITURE".equals(typeVehiculeDemande)) {
            return ResponseEntity.badRequest().body("Veuillez sélectionner une voiture pour une mission hors ville.");
        }

        Vehicule vehiculeAffecteDirection = null;
        if (!missionHorsToamasina && assistantDirection) {
            if (!"MOTO".equals(typeVehiculeDemande) && !"VOITURE".equals(typeVehiculeDemande)) {
                return ResponseEntity.badRequest().body("Choisissez une moto ou une voiture.");
            }
            if (utilisateurConnecte.getDirectionId() == null) {
                return ResponseEntity.badRequest().body(
                        "Le compte Assistant de direction doit être rattaché à une direction dans l'administration."
                );
            }
            List<Vehicule> vehiculesAffectes = trouverVehiculesAffectesDirection(
                    utilisateurConnecte.getDirectionId(), typeVehiculeDemande
            );
            if (vehiculesAffectes.isEmpty()) {
                return ResponseEntity.status(409).body(contraintePlanification(
                        "Aucun véhicule de type " + typeVehiculeDemande.toLowerCase(Locale.ROOT)
                                + " n'est affecté à votre direction dans Admin > Affectation."
                ));
            }
            vehiculeAffecteDirection = vehiculesAffectes.stream()
                    .map(vehicule -> vehiculeRepository.findByIdForUpdate(vehicule.getId()).orElse(null))
                    .filter(Objects::nonNull)
                    .filter(vehicule -> disponibiliteReservationService.estVehiculeDisponiblePourPeriode(
                            vehicule.getId(), request.getDateDebut(), request.getDateFin(), null
                    ))
                    .findFirst()
                    .orElse(null);
            if (vehiculeAffecteDirection == null) {
                List<String> contraintes = vehiculesAffectes.stream()
                        .map(candidat -> (candidat.getImmatriculation() == null
                                ? "Véhicule " + candidat.getId()
                                : candidat.getImmatriculation())
                                + " : "
                                + disponibiliteReservationService.expliquerIndisponibilitePourPeriode(
                                candidat, request.getDateDebut(), request.getDateFin(), null))
                        .toList();
                return ResponseEntity.status(409).body(contraintePlanification(
                        String.join(" ; ", contraintes)
                ));
            }
        } else if (missionHorsToamasina && request.getVehiculeId() != null && (demandeurDirection || chefLogistique)) {
            vehiculeAffecteDirection = vehiculeRepository.findByIdForUpdate(request.getVehiculeId()).orElse(null);
            if (vehiculeAffecteDirection == null) {
                return ResponseEntity.badRequest().body("Le véhicule sélectionné est introuvable.");
            }
            if (!estVoiture(vehiculeAffecteDirection) || !estVehiculeMissionHorsVille(vehiculeAffecteDirection)) {
                return ResponseEntity.badRequest().body("Une mission hors ville doit utiliser 1614 WWA ou 1615 WWA.");
            }
            if (!disponibiliteReservationService.estVehiculeDisponiblePourPeriode(
                    vehiculeAffecteDirection.getId(), request.getDateDebut(), request.getDateFin(), null)) {
                return ResponseEntity.status(409).body("La voiture sélectionnée est indisponible pour cette période.");
            }
        }

        Chauffeur chauffeurAffecteDirection = null;
        // Pour une mission hors ville, le chauffeur est choisi manuellement
        // par le Chef du Service Logistique au moment de la validation N°1.
        boolean chauffeurObligatoire = (missionHorsToamasina && chefLogistique && vehiculeAffecteDirection != null) || (!missionHorsToamasina
                && demandeurDirection
                && "VOITURE".equals(typeVehiculeDemande)
                && vehiculeAffecteDirection != null);
        if (chauffeurObligatoire) {
            if (vehiculeAffecteDirection == null || request.getChauffeurId() == null) {
                return ResponseEntity.badRequest().body("Veuillez sélectionner un chauffeur pour cette mission hors ville.");
            }
            chauffeurAffecteDirection = chauffeurRepository.findByIdForUpdate(request.getChauffeurId()).orElse(null);
            if (chauffeurAffecteDirection == null
                    || (!missionHorsToamasina && !chauffeurAutoService.estCompatible(vehiculeAffecteDirection, chauffeurAffecteDirection))) {
                return ResponseEntity.badRequest().body("Le chauffeur sélectionné n'est pas compatible avec cette voiture.");
            }
            Long chauffeurIdSelectionne = chauffeurAffecteDirection.getId();
            boolean chauffeurDisponible = (missionHorsToamasina
                    ? chauffeurAutoService.trouverChauffeursDisponiblesManuellement(request.getDateDebut(), request.getDateFin(), null)
                    : chauffeurAutoService.trouverChauffeursCompatiblesDisponibles(vehiculeAffecteDirection, request.getDateDebut(), request.getDateFin(), null))
                    .stream().anyMatch(chauffeur -> chauffeur.getId().equals(chauffeurIdSelectionne));
            if (!chauffeurDisponible) {
                return ResponseEntity.status(409).body("Le chauffeur sélectionné est indisponible pour cette période. Choisissez un autre chauffeur.");
            }
        }

        // -----------------------------------------------------
        // 4. OBJET / BENEFICIAIRE / TRAJET / PASSAGERS
        // -----------------------------------------------------

        if (request.getMotif() == null
                || request.getMotif().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "L'objet de la mission est obligatoire"
                    );
        }

        if (request.getDemandeurNom() == null
                || request.getDemandeurNom().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le nom du bénéficiaire est obligatoire"
                    );
        }

        if (request.getDemandeurPrenom() == null
                || request.getDemandeurPrenom().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le prénom du bénéficiaire est obligatoire"
                    );
        }

        if (!missionHorsToamasina && (request.getDemandeurMatricule() == null
                || request.getDemandeurMatricule().isBlank())) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le matricule du bénéficiaire est obligatoire"
                    );
        }

        if (request.getDemandeurEntite() == null
                || request.getDemandeurEntite().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La Direction / Département / Service est obligatoire"
                    );
        }

        if (request.getDestination() == null
                || request.getDestination().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La destination est obligatoire"
                    );
        }

        if (request.getPointDepart() == null
                || request.getPointDepart().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le point de départ est obligatoire"
                    );
        }

        if (request.getNombrePassagers() == null
                || request.getNombrePassagers() <= 0) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le nombre de passagers doit être supérieur à 0"
                    );
        }

        // -----------------------------------------------------
        // 5. AFFECTATION DES RESSOURCES
        // -----------------------------------------------------
        //
        // Pour une mission hors ville, la demande arrive sans véhicule ni
        // chauffeur : le Chef du Service Logistique les affecte à la première
        // validation. Une affectation explicite reste vérifiée si un ancien
        // client transmet encore ces identifiants.

        // -----------------------------------------------------
        // 7. REGLE 24 H
        // Toutes les catégories et toutes les destinations.
        // -----------------------------------------------------

        boolean horsDelai24h =
                request
                                .getDateDebut()
                                .isBefore(
                                        maintenant.plusHours(24)
                                );

        boolean urgenceOperationnelle =
                Boolean.TRUE.equals(
                        request.getDemandeUrgente()
                );

        if (urgenceOperationnelle && !agentSurete) {
            return ResponseEntity.badRequest().body("Les urgences des missions ordinaires sont traitées dans Réquisitions DGAL.");
        }

        String typeDemande;

        if (agentSurete) {
            typeDemande = "PATROUILLE";
        } else if (urgenceOperationnelle) {

            typeDemande =
                    "URGENTE";

        } else if (horsDelai24h) {

            typeDemande =
                    "TARDIVE";

        } else {

            typeDemande =
                    "PLANIFIEE";
        }

        if (urgenceOperationnelle && (request.getMotifUrgence() == null || request.getMotifUrgence().isBlank())) {
            return ResponseEntity.badRequest().body("Le motif de l'urgence est obligatoire.");
        }

        if (!missionHorsToamasina && horsDelai24h && !urgenceOperationnelle) {
            return ResponseEntity.badRequest().body("Une mission en ville planifiée doit être demandée au moins 24 heures à l'avance.");
        }

        // -----------------------------------------------------
        // 8. CREATION DU TICKET
        // -----------------------------------------------------

        Reservation reservation =
                new Reservation();

        reservation.setVehicule(
                vehiculeAffecteDirection
        );

        reservation.setChauffeur(chauffeurAffecteDirection);

        reservation.setDemandeur(
                utilisateurConnecte
        );

        reservation.setZoneMission(
                zoneMission
        );

        reservation.setDateDebut(
                request.getDateDebut()
        );

        reservation.setDateFin(
                request.getDateFin()
        );

        reservation.setMotif(
                request
                        .getMotif()
                        .trim()
        );

        reservation.setDemandeUrgente(
                urgenceOperationnelle
        );

        reservation.setHorsDelai24h(
                horsDelai24h
        );

        reservation.setTypeDemande(
                typeDemande
        );
        if (agentSurete) {
            reservation.setModeCreation("AGENT_SURETE");
            reservation.setMobilisabilite("VERROUILLEE");
            reservation.setTypeVehiculeSouhaite("PATROUILLE_URGENCE");
        }

        /*
         * Toamasina :
         * FLEXIBLE jusqu'à l'heure de départ.
         *
         * Hors Toamasina :
         * PLANIFIEE immédiatement, représentée en base
         * par VERROUILLEE.
         *
         * Une urgence est également verrouillée.
         */
        if (urgenceOperationnelle
                || missionHorsToamasina) {

            reservation.setMobilisabilite(
                    "VERROUILLEE"
            );

        } else {

            reservation.setMobilisabilite(
                    "FLEXIBLE"
            );
        }

        reservation.setMotifUrgence(request.getMotifUrgence() == null || request.getMotifUrgence().isBlank()
                ? null : request.getMotifUrgence().trim());

        reservation.setDemandeurNom(
                request
                        .getDemandeurNom()
                        .trim()
        );

        reservation.setDemandeurPrenom(
                request
                        .getDemandeurPrenom()
                        .trim()
        );

        reservation.setDemandeurMatricule(request.getDemandeurMatricule() == null
                ? null : request.getDemandeurMatricule().trim());

        reservation.setDemandeurEntite(
                request
                        .getDemandeurEntite()
                        .trim()
        );

        reservation.setDemandeurTelephone(request.getDemandeurTelephone() == null
                ? null : request.getDemandeurTelephone().trim());

        reservation.setDestination(
                request
                        .getDestination()
                        .trim()
        );

        reservation.setPointDepart(
                request
                        .getPointDepart()
                        .trim()
        );

        reservation.setNombrePassagers(
                request.getNombrePassagers()
        );

        reservation.setListePassagers(
                request.getListePassagers() != null
                        &&
                        !request.getListePassagers().isBlank()

                        ? request
                        .getListePassagers()
                        .trim()

                        : null
        );

        reservation.setTypeVehiculeSouhaite(
                vehiculeAffecteDirection != null
                        ? typeVehiculeDepuisCategorie(vehiculeAffecteDirection.getCategorie())
                        : request.getTypeVehiculeSouhaite() != null
                        &&
                        !request.getTypeVehiculeSouhaite().isBlank()

                        ? request
                        .getTypeVehiculeSouhaite()
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        )

                        : null
        );

        /*
         * Par défaut, une mission nécessite un chauffeur.
         * Le champ reste compatible avec les clients existants.
         */
        reservation.setBesoinChauffeur(!"MOTO".equals(typeVehiculeDemande));
        if ("MOTO".equals(typeVehiculeDemande)) {
            reservation.setConducteurMoto(reglesDispositifService.conducteurMotoValide(
                    request.getConducteurMotoId(), utilisateurConnecte.getDirectionId()));
        }

        reservation.setObservations(
                request.getObservations() != null
                        &&
                        !request.getObservations().isBlank()

                        ? request
                        .getObservations()
                        .trim()

                        : null
        );

        /*
         * Le workflow de validation ne change pas.
         */
        reservation.setStatut(
                "EN_ATTENTE"
        );

        reservation.setDateCreation(
                maintenant
        );

        reservation.setMotifRefus(
                null
        );

        reservation.setRefusePar(
                null
        );

        reservation.setDateRefus(
                null
        );

        reservation.setValidationN1Par(
                null
        );

        reservation.setDateValidationN1(
                null
        );

        reservation.setValidationN2Par(
                null
        );

        reservation.setDateValidationN2(
                null
        );

        Reservation reservationSauvegardee =
                reservationRepository
                        .save(
                                reservation
                        );

        if (missionHorsToamasina && chefLogistique && vehiculeAffecteDirection != null) {
            ResponseEntity<?> inspection = demanderAvisEntretienReservation(reservationSauvegardee, null);
            if (!inspection.getStatusCode().is2xxSuccessful()) {
                // Annuler aussi la création : aucun ticket ne doit rester sans inspection.
                throw new org.springframework.web.server.ResponseStatusException(
                        inspection.getStatusCode(), String.valueOf(inspection.getBody()));
            }
        }

        // -----------------------------------------------------
        // 9. REDIRIGER SELON LA ZONE DE MISSION
        // -----------------------------------------------------
        //
        // Toamasina est transmise à l'Assistant de direction ;
        // les missions hors Toamasina vont au Service Logistique.
        //
        // L'échec d'une notification ou d'un email ne doit
        // jamais empêcher la création du ticket.
        //
        try {

            String ticket =
                    "TKT-"
                            + String.format(
                            "%05d",
                            reservationSauvegardee.getId()
                    );

            String beneficiaire =
                    (
                            reservationSauvegardee.getDemandeurPrenom()
                                    + " "
                                    + reservationSauvegardee.getDemandeurNom()
                    )
                            .trim();

            String destination =
                    reservationSauvegardee.getDestination() == null
                            || reservationSauvegardee.getDestination().isBlank()
                            ? "destination non renseignée"
                            : reservationSauvegardee
                            .getDestination()
                            .trim();

            String roleNotification = estCircuitAssistant(reservationSauvegardee)
                    ? "ASSISTANT_DIRECTION" : "CHEF_SERVICE_LOGISTIQUE";
            String libelleNotification = "PATROUILLE".equalsIgnoreCase(reservationSauvegardee.getTypeDemande())
                    ? "Demande de sûreté / patrouille à traiter"
                    : (!estCircuitAssistant(reservationSauvegardee)
                    ? "Nouveau ticket à traiter"
                    : "Nouvelle mission intra-Toamasina");
            String messageNotification = ticket + " — " + beneficiaire + " — destination : " + destination;
            String lienNotification = missionHorsToamasina ? "/chef-service-logistique" : "/assistant-direction";
            List<?> notificationsCreees = "ASSISTANT_DIRECTION".equals(roleNotification)
                    ? notifierAssistantsConcernes(utilisateurConnecte, reservationSauvegardee,
                            libelleNotification, messageNotification, lienNotification)
                    : notificationService.creerPourRole(
                            roleNotification,
                            "TICKET",
                            "IMPORTANT",
                            libelleNotification,
                            messageNotification,
                            lienNotification,
                            reservationSauvegardee.getId(),
                            null,
                            null,
                            true
                    );

            System.out.println(
                    "NOTIFICATION TICKET → "
                            + ticket
                            + " → "
                            + notificationsCreees.size()
                            + " notification(s) créée(s) pour " + roleNotification
            );

        } catch (Exception e) {

            System.err.println(
                    "NOTIFICATION TICKET IMPOSSIBLE → réservation "
                            + reservationSauvegardee.getId()
                            + " : "
                            + e.getMessage()
            );
        }

        return ResponseEntity.ok(
                reservationSauvegardee
        );
    }


    // =========================================================
    // MES DEMANDES
    // =========================================================

    @GetMapping("/mes")
    public ResponseEntity<?> mesReservations() {

        Utilisateur utilisateurConnecte =
                utilisateurCourant();


        if (utilisateurConnecte == null) {

            return ResponseEntity
                    .status(401)
                    .body(
                            "Utilisateur introuvable ou non authentifié"
                    );
        }


        List<Reservation> reservations =
                reservationRepository
                        .findByDemandeurIdOrderByDateCreationDesc(
                                utilisateurConnecte.getId()
                        );



        return ResponseEntity.ok(
                reservations
        );
    }


    // =========================================================
    // TOUTES LES DEMANDES
    // =========================================================

    @GetMapping
    public List<Reservation> toutesLesReservations(
            @RequestParam(required = false)
            String statut
    ) {

                List<Reservation> reservations;
                if (statut != null
                && !statut.isBlank()) {

                        reservations = reservationRepository
                    .findByStatutOrderByDateCreationDesc(
                            statut
                                    .trim()
                                    .toUpperCase(
                                            Locale.ROOT
                                    )
                        );
                } else {
                        reservations = reservationRepository.findAllByOrderByDateCreationDesc();
        }
                Utilisateur utilisateur = utilisateurCourant();
                                return "ASSISTANT_DIRECTION".equalsIgnoreCase(
                                                                utilisateur == null || utilisateur.getRole() == null ? ""
                                                                                : utilisateur.getRole().trim().replaceFirst("^ROLE_", ""))
                                ? reservations.stream().filter(this::estCircuitAssistant)
                                    .filter(r -> assistantConcerne(utilisateur, r)).toList()
                        : reservations.stream().filter(r -> accesParcours.peutLire(utilisateur, r)).toList();
    }

        @GetMapping({"/assistant-direction/toamasina", "/assistant-direction/calendrier"})
        @Transactional
        public ResponseEntity<?> missionsIntraToamasinaAssistant() {
                Utilisateur utilisateur = utilisateurCourant();
                if (!estAssistantDirection(utilisateur)) {
                        return ResponseEntity.status(403).body("Accès réservé à l'Assistant de direction.");
                }
                actualiserMissionsRapidesEnCours();
                return ResponseEntity.ok(reservationRepository.findAllByOrderByDateCreationDesc()
                                        .stream()
                                        .filter(this::estCircuitAssistant)
                                        .filter(reservation -> assistantConcerne(utilisateur, reservation))
                                        .toList());
        }

                @GetMapping("/assistant-direction/vehicule-affecte")
                public ResponseEntity<?> vehiculeAffecteAssistantDirection() {
                        Utilisateur utilisateur = utilisateurCourant();
                        if (!estAssistantDirection(utilisateur)) {
                                return ResponseEntity.status(403).body("Accès réservé à l'Assistant de direction.");
                        }
                        Map<String, Object> resultat = new java.util.LinkedHashMap<>();
                        resultat.put("directionId", utilisateur.getDirectionId());
                        resultat.put("vehicule", utilisateur.getDirectionId() == null
                                        ? null
                                        : trouverVehiculeAffecteDirection(utilisateur.getDirectionId()));
                        resultat.put("vehiculesVoiture", utilisateur.getDirectionId() == null
                                        ? List.of()
                                        : trouverVehiculesAffectesDirection(utilisateur.getDirectionId(), "VOITURE"));
                        resultat.put("vehiculesMoto", utilisateur.getDirectionId() == null
                                        ? List.of()
                                        : trouverVehiculesAffectesDirection(utilisateur.getDirectionId(), "MOTO"));
                        return ResponseEntity.ok(resultat);
                }

        @PostMapping("/assistant-direction/rapide")
        @Transactional
        public ResponseEntity<?> creerMissionRapideAssistantDirection(
                        @RequestBody CreateMissionAssistantDirectionRequest request
        ) {
                Utilisateur utilisateur = utilisateurCourant();
                if (!estAssistantDirection(utilisateur)) {
                        return ResponseEntity.status(403).body("Action réservée à l'Assistant de direction.");
                }
                if (utilisateur.getDirectionId() == null) {
                        return ResponseEntity.badRequest().body(Map.of(
                                "message", "Votre compte Assistant de direction doit être rattaché à une direction par un administrateur."));
                }
                if (request == null
                                || (!request.isDepartImmediat() && request.getHeureDepart() == null && request.getDateDebut() == null)
                                || request.getMotif() == null || request.getMotif().isBlank()) {
                        return ResponseEntity.badRequest().body("L'objet et l'heure de départ sont obligatoires.");
                }
                if (request.getDureeEstimeeMinutes() == null || request.getDureeEstimeeMinutes() <= 0
                                || request.getDureeEstimeeMinutes() > 1440) {
                        return ResponseEntity.badRequest().body("La durée estimée doit être comprise entre 1 minute et 24 heures.");
                }

                String type = request.getTypeVehicule() == null
                                ? "" : request.getTypeVehicule().trim().toUpperCase(Locale.ROOT);
                if (!"MOTO".equals(type) && !"VOITURE".equals(type)) {
                        return ResponseEntity.badRequest().body("Choisissez une moto ou une voiture.");
                }
                if (request.getNom() == null || request.getNom().isBlank()
                                || request.getPrenom() == null || request.getPrenom().isBlank()) {
                        return ResponseEntity.badRequest().body("Sélectionnez le demandeur dans la liste du personnel.");
                }

                LocalDateTime maintenant = LocalDateTime.now();
                LocalDateTime debut = request.isDepartImmediat()
                                ? maintenant.withNano(0)
                                : request.getDateDebut() != null
                                                ? request.getDateDebut()
                                                : maintenant.toLocalDate().atTime(request.getHeureDepart());
                LocalDateTime minuteCourante = maintenant.withSecond(0).withNano(0);
                if (debut.isBefore(minuteCourante)) {
                        return ResponseEntity.badRequest().body("L'heure de départ ne peut pas être dans le passé.");
                }
                // Le parcours rapide en ville est destiné aux déplacements immédiats :
                // la règle des 24 heures ne s'applique pas lorsqu'il est créé pour aujourd'hui.
                boolean datePlanifiee = debut.toLocalDate().isAfter(maintenant.toLocalDate());
                if (datePlanifiee) {
                        LocalTime heureDepart = debut.toLocalTime();
                        boolean horairesTravail = (heureDepart.compareTo(LocalTime.of(8, 0)) >= 0
                                        && heureDepart.isBefore(LocalTime.of(12, 0)))
                                        || (heureDepart.compareTo(LocalTime.of(14, 0)) >= 0
                                        && heureDepart.compareTo(LocalTime.of(18, 0)) <= 0);
                        if (!horairesTravail) {
                                return ResponseEntity.badRequest().body(
                                                "Une mission en ville planifiée doit être prévue entre 08 h et 12 h ou entre 14 h et 18 h.");
                        }
                        if (debut.isBefore(maintenant.plusHours(24))) {
                                return ResponseEntity.badRequest().body(
                                                "Une mission en ville planifiée doit être demandée au moins 24 heures à l'avance.");
                        }
                }
                boolean urgente = false;
                LocalDateTime finEstimee = debut.plusMinutes(request.getDureeEstimeeMinutes());
                List<Vehicule> vehiculesAffectes = trouverVehiculesAffectesDirection(
                                utilisateur.getDirectionId(), type
                );
                if (vehiculesAffectes.isEmpty()) {
                        return ResponseEntity.status(409).body(contraintePlanification(
                                        "Aucun véhicule de type " + type.toLowerCase(Locale.ROOT)
                                                        + " n'est affecté à votre direction dans Admin > Affectation."));
                }
                Vehicule vehicule = vehiculesAffectes.stream()
                                .map(candidat -> vehiculeRepository.findByIdForUpdate(candidat.getId()).orElse(null))
                                .filter(Objects::nonNull)
                                .filter(candidat -> disponibiliteReservationService.estVehiculeDisponiblePourPeriode(
                                                candidat.getId(), debut, finEstimee, null
                                ))
                                .findFirst()
                                .orElse(null);
                if (vehicule == null) {
                        List<String> contraintes = vehiculesAffectes.stream()
                                        .map(candidat -> (candidat.getImmatriculation() == null
                                                        ? "Véhicule " + candidat.getId()
                                                        : candidat.getImmatriculation())
                                                        + " : "
                                                        + disponibiliteReservationService.expliquerIndisponibilitePourPeriode(
                                                                        candidat, debut, finEstimee, null))
                                        .toList();
                        return ResponseEntity.status(409).body(contraintePlanification(
                                        String.join(" ; ", contraintes)));
                }

                Reservation reservation = new Reservation();
                reservation.setDemandeur(utilisateur);
                reservation.setVehicule(vehicule);
                reservation.setZoneMission("VILLE_TOAMASINA");
                reservation.setDateDebut(debut);
                // La durée estimée réserve le véhicule jusqu'au retour prévu.
                // La clôture remplacera cette date par l'heure de retour réelle.
                reservation.setDateFin(finEstimee);
                reservation.setDureeEstimeeMinutes(request.getDureeEstimeeMinutes());
                reservation.setMotif(request.getMotif().trim());
                reservation.setStatut("PLANIFIEE");
                reservation.setModeCreation("ASSISTANT_DIRECTION");
                reservation.setMobilisabilite("VERROUILLEE");
                reservation.setARegulariser(true);
                reservation.setTypeVehiculeSouhaite(type);
                if ("MOTO".equals(type)) {
                    reservation.setConducteurMoto(reglesDispositifService.conducteurMotoValide(
                            request.getConducteurMotoId(), utilisateur.getDirectionId()));
                }
                if (request.getDestination() == null || request.getDestination().isBlank())
                        return ResponseEntity.badRequest().body("La destination est obligatoire.");
                reservation.setDemandeUrgente(urgente);
                reservation.setMotifUrgence(null);
                reservation.setTypeDemande("PLANIFIEE");
                reservation.setHorsDelai24h(false);
                reservation.setObservations(request.getObservations() == null || request.getObservations().isBlank()
                                ? null : request.getObservations().trim());
                reservation.setBesoinChauffeur("VOITURE".equals(type));
                if ("VOITURE".equals(type)) {
                    Chauffeur chauffeur = chauffeurRepository.findAll().stream()
                            .filter(candidat -> disponibiliteReservationService.estChauffeurDisponiblePourPeriode(
                                    candidat.getId(), debut, finEstimee, null))
                            .sorted(Comparator.comparing(Chauffeur::getId))
                            .map(candidat -> chauffeurRepository.findByIdForUpdate(candidat.getId()).orElse(null))
                            .filter(Objects::nonNull)
                            .filter(candidat -> disponibiliteReservationService.estChauffeurDisponiblePourPeriode(
                                    candidat.getId(), debut, finEstimee, null))
                            .findFirst().orElse(null);
                    if (chauffeur == null) {
                        return ResponseEntity.status(409).body(contraintePlanification(
                                "Aucun chauffeur avec un permis valide n'est disponible sur ce créneau."));
                    }
                    reservation.setChauffeur(chauffeur);
                }
                reservation.setDemandeurNom(request.getNom().trim());
                reservation.setDemandeurPrenom(request.getPrenom().trim());
                reservation.setDemandeurMatricule(request.getMatricule() == null || request.getMatricule().isBlank()
                                ? null : request.getMatricule().trim());
                reservation.setDemandeurTelephone(null);
                reservation.setDemandeurEntite(request.getEntite() == null || request.getEntite().isBlank()
                                ? "Personnel SPAT" : request.getEntite().trim());
                reservation.setPointDepart("Toamasina");
                reservation.setDestination(request.getDestination().trim());
                reservation.setNombrePassagers(1);
                reservation.setListePassagers((request.getPrenom().trim() + " " + request.getNom().trim()).trim());

                return ResponseEntity.ok(reservationRepository.save(reservation));
        }

        @PostMapping("/{id}/assistant-direction/cloturer")
        @Transactional
        public ResponseEntity<?> cloturerMissionAssistantDirection(
                        @PathVariable Long id,
                        @RequestBody ClotureMissionAssistantDirectionRequest request
        ) {
                Utilisateur utilisateur = utilisateurCourant();
                if (!estAssistantDirection(utilisateur)) {
                        return ResponseEntity.status(403).body("Action réservée à l'Assistant de direction.");
                }
                Reservation reservation = reservationRepository.findByIdForUpdate(id).orElse(null);
                if (reservation == null) return ResponseEntity.notFound().build();
                if (!estCircuitAssistant(reservation) || !assistantConcerne(utilisateur, reservation)) {
                        return ResponseEntity.status(403).body("Cette mission n'appartient pas au planning partagé de votre Direction.");
                }
                boolean missionRapide = "ASSISTANT_DIRECTION".equalsIgnoreCase(reservation.getModeCreation());
                if (missionRapide) {
                        if (!Set.of("PLANIFIEE", "EN_COURS", "EN_ATTENTE", "VALIDEE").contains(
                                String.valueOf(reservation.getStatut()).toUpperCase(Locale.ROOT))) {
                                return ResponseEntity.status(409).body("Cette mission rapide ne peut pas être clôturée dans son état actuel.");
                        }
                } else if (!"VALIDEE".equalsIgnoreCase(reservation.getStatut())) {
                        return ResponseEntity.status(409).body("Seule une mission validée peut être clôturée.");
                }
                if (missionRapide && LocalDateTime.now().isBefore(reservation.getDateDebut())) {
                        return ResponseEntity.badRequest().body("La clôture sera disponible à partir de l'heure de départ.");
                }
                if (!missionRapide && (request == null || (request.getDateHeureRetour() == null && request.getHeureRetour() == null))) {
                        return ResponseEntity.badRequest().body("La date et l'heure de retour sont obligatoires pour clôturer la mission.");
                }

                LocalDateTime maintenantCloture = LocalDateTime.now();
                LocalDateTime retour = missionRapide
                                ? maintenantCloture
                                : request.getDateHeureRetour() != null
                                                ? request.getDateHeureRetour()
                                                : reservation.getDateDebut().toLocalDate().atTime(request.getHeureRetour());
                if (!missionRapide && request.getDateHeureRetour() == null && retour.isBefore(reservation.getDateDebut())) retour = retour.plusDays(1);
                if (!retour.isAfter(reservation.getDateDebut())) {
                        return ResponseEntity.badRequest().body("La date et l'heure de retour doivent être postérieures au départ.");
                }
                if (!missionRapide && retour.isAfter(maintenantCloture)) {
                        return ResponseEntity.badRequest().body("La clôture doit être enregistrée au moment du retour, pas à une heure future.");
                }
                long dureeMinutes = Duration.between(reservation.getDateDebut(), retour).toMinutes();
                if (dureeMinutes <= 0 || dureeMinutes > Integer.MAX_VALUE) {
                        return ResponseEntity.badRequest().body("L'heure de retour doit être postérieure à l'heure de départ.");
                }
                String incident = request == null || request.getIncident() == null ? "" : request.getIncident().trim();
                if (incident.length() > 2000) {
                        return ResponseEntity.badRequest().body("L'incident ne peut pas dépasser 2000 caractères.");
                }

                reservation.setDateFin(retour);
                reservation.setDureeUtilisationMinutes((int) dureeMinutes);
                reservation.setIncidentCloture(incident.isBlank() ? null : incident);
                reservation.setARegulariser(false);
                reservation.setStatut("CLOTUREE");
                Reservation cloturee = reservationRepository.save(reservation);

                // Informer les assistantes de direction des autres Directions
                // rattachées à ce véhicule que la voiture redevient libre.
                Vehicule vehiculeMission = cloturee.getVehicule();
                if (vehiculeMission != null) {
                        String immatriculation = vehiculeMission.getImmatriculation() == null
                                        || vehiculeMission.getImmatriculation().isBlank()
                                                        ? "Le véhicule"
                                                        : "La voiture " + vehiculeMission.getImmatriculation();
                        notificationService.creerPourDirectionsVehiculeIsole(
                                vehiculeMission,
                                utilisateur.getDirectionId(),
                                "VEHICULE_LIBERE",
                                "INFO",
                                "Voiture désormais libre",
                                immatriculation + " est désormais libre.",
                                "/assistant-direction",
                                cloturee.getId(),
                                null,
                                false);
                }
                return ResponseEntity.ok(cloturee);
        }

        private void actualiserMissionsRapidesEnCours() {
                LocalDateTime maintenant = LocalDateTime.now();
                List<Reservation> aDemarrer = reservationRepository.findAllByOrderByDateCreationDesc().stream()
                                .filter(r -> "ASSISTANT_DIRECTION".equalsIgnoreCase(r.getModeCreation()))
                                .filter(r -> "PLANIFIEE".equalsIgnoreCase(r.getStatut())
                                                && r.getDateDebut() != null
                                                && !r.getDateDebut().isAfter(maintenant))
                                .peek(r -> r.setStatut("EN_COURS"))
                                .toList();
                if (!aDemarrer.isEmpty()) reservationRepository.saveAll(aDemarrer);
        }

        @Scheduled(fixedDelay = 30000)
        @Transactional
        public void basculerAutomatiquementMissionsRapides() {
                actualiserMissionsRapidesEnCours();
        }

    @DeleteMapping("/{id}/chef-dgal")
    @Transactional
    public ResponseEntity<?> supprimerHistoriqueChefDgal(@PathVariable Long id) {
        Utilisateur utilisateur = utilisateurCourant();
        if (utilisateur == null || !Set.of("CHEF_DGAL", "ADMIN", "SUPER_ADMIN").contains(
                utilisateur.getRole() == null ? "" : utilisateur.getRole().trim().replaceFirst("^ROLE_", "").toUpperCase(Locale.ROOT))) {
            return ResponseEntity.status(403).body("Action réservée au Chef DGAL.");
        }
        Reservation reservation = reservationRepository.findById(id).orElse(null);
        if (reservation == null) return ResponseEntity.notFound().build();
        if (!Set.of("VALIDEE", "PLANIFIEE", "CLOTUREE").contains(String.valueOf(reservation.getStatut()).toUpperCase(Locale.ROOT))) {
            return ResponseEntity.status(409).body("Seuls les ordres de mission de l'historique peuvent être supprimés.");
        }
        notificationRepository.deleteByReservationId(id);
        maintenanceRepository.deleteAll(maintenanceRepository.findByReservationId(id));
        reservationRepository.delete(reservation);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/assistant-direction/historique")
        @Transactional
        public ResponseEntity<?> supprimerMissionHistoriqueAssistantDirection(@PathVariable Long id) {
                Utilisateur utilisateur = utilisateurCourant();
                if (!estAssistantDirection(utilisateur)) {
                        return ResponseEntity.status(403).body("Action réservée à l'Assistant de direction.");
                }
                Reservation reservation = reservationRepository.findByIdForUpdate(id).orElse(null);
                if (reservation == null) return ResponseEntity.notFound().build();
                if (!estIntraToamasina(reservation)) {
                        return ResponseEntity.status(403).body("Seules les missions en ville peuvent être supprimées depuis cet historique.");
                }
                if (reservation.getDemandeur() == null
                                || utilisateur.getDirectionId() == null
                                || !utilisateur.getDirectionId().equals(reservation.getDemandeur().getDirectionId())) {
                        return ResponseEntity.status(403).body("Vous ne pouvez supprimer que les missions de votre direction.");
                }
                LocalDate dateReference = "ASSISTANT_DIRECTION".equalsIgnoreCase(reservation.getModeCreation())
                                ? reservation.getDateDebut().toLocalDate()
                                : (reservation.getDateFin() != null ? reservation.getDateFin() : reservation.getDateDebut()).toLocalDate();
                boolean missionHistorisee = "CLOTUREE".equalsIgnoreCase(reservation.getStatut())
                                || dateReference.isBefore(LocalDate.now());
                if (!missionHistorisee) {
                        return ResponseEntity.status(409).body("Seules les missions déjà présentes dans l'historique peuvent être supprimées.");
                }
                if (maintenanceRepository.existsByReservationId(id)
                                || signalementEntretienRepository.existsByReservationId(id)
                                || transactionCarburantRepository.existsByReservationId(id)) {
                        return ResponseEntity.status(409).body("Cette mission est liée à des données de maintenance, de signalement ou de carburant. Ces données doivent être conservées.");
                }
                reservationRepository.delete(reservation);
                return ResponseEntity.noContent().build();
        }

        @PutMapping("/{id}/assistant-direction")
        @Transactional
        public ResponseEntity<?> modifierMissionIntraToamasina(
                        @PathVariable Long id,
                        @RequestBody CreateReservationRequest request
        ) {
                Utilisateur utilisateur = utilisateurCourant();
                if (!estAssistantDirection(utilisateur)) {
                        return ResponseEntity.status(403).body("Action réservée à l'Assistant de direction.");
                }
                Reservation reservation = reservationRepository.findByIdForUpdate(id).orElse(null);
                if (reservation == null) return ResponseEntity.notFound().build();
                if (!estIntraToamasina(reservation)) {
                        return ResponseEntity.status(403).body("Seules les missions intra-Toamasina peuvent être modifiées ici.");
                }
                if (reservation.getDemandeur() == null
                                || utilisateur.getDirectionId() == null
                                || !utilisateur.getDirectionId().equals(reservation.getDemandeur().getDirectionId())) {
                        return ResponseEntity.status(403).body("Vous ne pouvez modifier que les missions créées par votre direction.");
                }
                if (!"EN_ATTENTE".equals(reservation.getStatut())) {
                        return ResponseEntity.status(409).body("Cette mission ne peut plus être modifiée après son affectation ou son traitement.");
                }
                if (request == null || request.getDateDebut() == null || request.getDateFin() == null
                                || !request.getDateFin().isAfter(request.getDateDebut())
                                || request.getDateDebut().isBefore(LocalDateTime.now())
                                || request.getMotif() == null || request.getMotif().isBlank()
                                || request.getPointDepart() == null || request.getPointDepart().isBlank()
                                || request.getDestination() == null || request.getDestination().isBlank()) {
                        return ResponseEntity.badRequest().body("Vérifiez l'objet, le trajet et les dates de la mission.");
                }
                if (!request.getDateDebut().equals(reservation.getDateDebut())
                                && request.getDateDebut().isBefore(LocalDateTime.now().plusHours(24))) {
                        return ResponseEntity.badRequest().body("Une mission en ville planifiée doit être demandée au moins 24 heures à l'avance.");
                }
                Vehicule vehiculeMission = reservation.getVehicule() != null
                                ? reservation.getVehicule()
                                : trouverVehiculeAffecteDirection(utilisateur.getDirectionId());
                if (vehiculeMission == null) {
                        return ResponseEntity.status(409).body("Aucune moto n'est affectée à votre direction.");
                }
                if (!disponibiliteReservationService.estVehiculeDisponiblePourPeriode(
                                vehiculeMission.getId(), request.getDateDebut(), request.getDateFin(), reservation.getId())) {
                        return ResponseEntity.status(409).body(
                                        "La moto affectée à votre direction est déjà réservée ou indisponible pour cette période.");
                }
                reservation.setVehicule(vehiculeMission);
                reservation.setConducteurMoto("MOTO".equals(typeVehiculeDepuisCategorie(vehiculeMission.getCategorie()))
                        ? reglesDispositifService.conducteurMotoValide(request.getConducteurMotoId(), utilisateur.getDirectionId())
                        : null);
                reservation.setDateDebut(request.getDateDebut());
                reservation.setDateFin(request.getDateFin());
                reservation.setMotif(request.getMotif().trim());
                reservation.setPointDepart(request.getPointDepart().trim());
                reservation.setDestination(request.getDestination().trim());
                reservation.setDemandeurNom(request.getDemandeurNom());
                reservation.setDemandeurPrenom(request.getDemandeurPrenom());
                reservation.setDemandeurMatricule(request.getDemandeurMatricule());
                reservation.setDemandeurEntite(request.getDemandeurEntite());
                reservation.setDemandeurTelephone(request.getDemandeurTelephone());
                reservation.setNombrePassagers(request.getNombrePassagers());
                reservation.setListePassagers(request.getListePassagers());
                reservation.setTypeVehiculeSouhaite(typeVehiculeDepuisCategorie(vehiculeMission.getCategorie()));
                reservation.setObservations(request.getObservations());
                reservation.setMotifUrgence(request.getMotifUrgence());
                return ResponseEntity.ok(reservationRepository.save(reservation));
        }

        // Seules les assistantes (titulaires ou par intérim) de la direction du demandeur sont notifiées.
        private List<?> notifierAssistantsConcernes(Utilisateur demandeur, Reservation reservation,
                                                    String titre, String message, String lien) {
                Long directionDemandeur = demandeur == null ? null : demandeur.getDirectionId();
                List<Object> creees = new java.util.ArrayList<>();
                for (Utilisateur assistant : utilisateurRepository.findAll()) {
                        if (!assistant.isActif() || !estAssistantDirection(assistant)) continue;
                        boolean concerne = directionDemandeur != null
                                        ? directionDemandeur.equals(assistant.getDirectionId())
                                        : assistantConcerne(assistant, reservation);
                        if (!concerne) continue;
                        creees.add(notificationService.creerPourUtilisateur(assistant, "TICKET", "IMPORTANT",
                                        titre, message, lien, reservation.getId(), null, null, true));
                }
                return creees;
        }

        private boolean estAssistantDirection(Utilisateur utilisateur) {
                return utilisateur != null && utilisateur.getRole() != null
                                && ("ASSISTANT_DIRECTION".equalsIgnoreCase(
                                                utilisateur.getRole().trim().replaceFirst("^ROLE_", ""))
                                        || "AGENT_PAR_INTERIM_ASSISTANT".equalsIgnoreCase(
                                                utilisateur.getRole().trim().replaceFirst("^ROLE_", "")));
        }

        private boolean estIntraToamasina(Reservation reservation) {
                return reservation != null && "VILLE_TOAMASINA".equalsIgnoreCase(
                                String.valueOf(reservation.getZoneMission()).trim());
        }

        private Map<String, String> contraintePlanification(String cause) {
                return Map.of(
                                "message", "Planification impossible",
                                "cause", cause == null || cause.isBlank()
                                                ? "Véhicule indisponible pour la période demandée."
                                                : cause
                );
        }

        private boolean estCircuitAssistant(Reservation r) {
                if (r == null || r.getVehicule() == null) return false;
                String categorie = r.getVehicule().getCategorie();
                return com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule.estMotoElectrique(categorie)
                        || com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule.estVoitureMutualisee(categorie);
        }

        private boolean assistantConcerne(Utilisateur utilisateur, Reservation r) {
                if (utilisateur == null || utilisateur.getDirectionId() == null || r == null || r.getVehicule() == null) {
                        return false;
                }
                Vehicule vehicule = r.getVehicule();
                if (vehicule.getDirections() != null && !vehicule.getDirections().isEmpty()) {
                        return vehicule.getDirections().stream()
                                .anyMatch(d -> utilisateur.getDirectionId().equals(d.getId()));
                }
                // Repli compatible avec les véhicules historiques : tant que
                // l'affectation relationnelle n'est pas encore enregistrée,
                // le groupe de directions saisi dans Admin reste partagé.
                String type = com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule.estMotoElectrique(vehicule.getCategorie())
                                ? "MOTO" : "VOITURE";
                return trouverVehiculesAffectesDirection(utilisateur.getDirectionId(), type).stream()
                                .anyMatch(candidat -> candidat.getId().equals(vehicule.getId()));
        }

        private boolean decisionAutorisee(Utilisateur utilisateur, Reservation r) {
                if (utilisateur == null || utilisateur.getRole() == null) return false;
                if (estCircuitAssistant(r)) return estAssistantDirection(utilisateur) && assistantConcerne(utilisateur, r);
                return Set.of("CHEF_SERVICE_LOGISTIQUE", "CHEF_DGAL", "ADMIN", "SUPER_ADMIN", "AGENT_PAR_INTERIM_CHEF")
                        .contains(utilisateur.getRole().replaceFirst("^ROLE_", ""));
        }

        private Vehicule trouverVehiculeAffecteDirection(Long directionId) {
                return trouverVehiculeAffecteDirection(directionId, "MOTO");
        }

        private Vehicule trouverVehiculeAffecteDirection(Long directionId, String typeVehicule) {
                return trouverVehiculesAffectesDirection(directionId, typeVehicule).stream()
                                .findFirst()
                                .orElse(null);
        }

        private List<Vehicule> trouverVehiculesAffectesDirection(Long directionId, String typeVehicule) {
                return vehiculeRepository.findAll().stream()
                        .filter(vehicule -> "VOITURE".equals(typeVehicule)
                                ? com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule.estVoitureMutualisee(vehicule.getCategorie())
                                : vehicule.getCategorie() != null
                                        && vehicule.getCategorie().toUpperCase(Locale.ROOT).contains("MOTO"))
                        .filter(vehicule -> com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService.estAffecteDirection(directionId, vehicule))
                        .sorted(Comparator.comparing(Vehicule::getId))
                        .toList();
        }

        private boolean estVoiture(Vehicule vehicule) {
                if (vehicule == null) return false;
                String categorie = vehicule.getCategorie();
                if (com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule.estVehiculeMission(categorie)
                        || com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule.estVehiculePatrouille(categorie)
                        || com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule.estVoitureMutualisee(categorie)) return true;
                String caracteristiques = String.join(" ",
                                vehicule.getCategorie() == null ? "" : vehicule.getCategorie(),
                                vehicule.getTypeVehicule() == null ? "" : vehicule.getTypeVehicule(),
                                vehicule.getModeleType() == null ? "" : vehicule.getModeleType())
                        .toUpperCase(Locale.ROOT);
                return caracteristiques.contains("VOITURE")
                        || caracteristiques.contains("BERLINE")
                        || caracteristiques.contains("SEDAN")
                        || caracteristiques.contains("PICKUP")
                        || caracteristiques.contains("4X4")
                        || caracteristiques.contains("4WD")
                        || caracteristiques.contains("SUV")
                        || caracteristiques.matches(".*\\bCAR\\b.*");
        }

        private boolean estMoto(Vehicule vehicule) {
                return vehicule != null
                        && com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule
                        .estMotoElectrique(vehicule.getCategorie());
        }

        private boolean estVehiculeMissionHorsVille(Vehicule vehicule) {
                if (vehicule == null || vehicule.getImmatriculation() == null) return false;
                String immatriculation = vehicule.getImmatriculation()
                        .replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
                // L'inventaire existe avec ou sans le zéro initial.
                return Set.of("1614WWA", "1615WWA", "01614WWA", "01615WWA").contains(immatriculation);
        }

        private String typeVehiculeDepuisCategorie(String categorie) {
                return categorie != null && categorie.toUpperCase(Locale.ROOT).contains("MOTO")
                        ? "MOTO"
                        : "VOITURE";
        }



    // =========================================================
    // PLANNING DES VEHICULES SUR LES DATES DU TICKET
    // =========================================================
    // Endpoint de lecture additionnel : ne change ni le format de
    // /{id}/disponibilites, ni la creation, ni la validation.

    @GetMapping("/{id}/planning-vehicules")
    public ResponseEntity<?> planningVehiculesPourTicket(
            @PathVariable Long id
    ) {
        Reservation dossier = reservationRepository.findById(id).orElse(null);
        if (dossier == null) return ResponseEntity.notFound().build();
        accesParcours.exigerLecture(dossier);
        try {
            return ResponseEntity.ok(
                    disponibiliteReservationService
                            .calculerPlanningVehicules(id)
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


    // =========================================================
    // DISPONIBILITES
    // =========================================================

    @GetMapping("/disponibilites-vehicules")
    public ResponseEntity<?> disponibilitesVehiculesPourCreation(
            @RequestParam LocalDateTime dateDebut,
            @RequestParam LocalDateTime dateFin,
            @RequestParam(required = false) Long reservationId
    ) {
        if (dateFin == null || !dateFin.isAfter(dateDebut)) {
            return ResponseEntity.badRequest().body("La date de retour doit être après la date de départ.");
        }

        Utilisateur lecteur = accesParcours.courant();
        Set<String> statutsOccupants = Set.of("EN_ATTENTE", "EN_ATTENTE_AVIS_DID", "VALIDEE_N1", "VALIDEE", "PLANIFIEE", "CLOTUREE");
        List<Reservation> missions = reservationRepository.findAllByOrderByDateCreationDesc();
        List<Map<String, Object>> resultat = new ArrayList<>();

        for (Vehicule vehicule : vehiculeRepository.findAll()) {
            if (!accesParcours.peutLireVehicule(lecteur, vehicule)) continue;
            // L'Assistant doit aussi voir la disponibilité des motos affectées
            // à sa direction, avec les mêmes règles que les voitures.
            if (!estVoiture(vehicule) && !estMoto(vehicule)) continue;

            Reservation conflit = missions.stream()
                    .filter(mission -> reservationId == null || !reservationId.equals(mission.getId()))
                    .filter(mission -> mission.getVehicule() != null
                            && vehicule.getId().equals(mission.getVehicule().getId()))
                    .filter(mission -> mission.getStatut() != null
                            && statutsOccupants.contains(mission.getStatut().trim().toUpperCase(Locale.ROOT)))
                    .filter(mission -> mission.getDateDebut() != null && mission.getDateDebut().isBefore(dateFin))
                    .filter(mission -> (mission.getModeCreation() != null
                            && "ASSISTANT_DIRECTION".equalsIgnoreCase(mission.getModeCreation())
                            && "EN_ATTENTE".equalsIgnoreCase(mission.getStatut()))
                            || mission.getDateFin() != null && mission.getDateFin().isAfter(dateDebut))
                    .findFirst()
                    .orElse(null);

            String statutVehicule = vehicule.getStatut() == null ? "" : vehicule.getStatut().trim().toUpperCase(Locale.ROOT);
            boolean indisponibleTechniquement = vehicule.getStatut() == null
                    || Set.of("MAINTENANCE", "EN_MAINTENANCE", "EN_PANNE", "INDISPONIBLE", "REQUISITIONNE", "HORS_SERVICE", "TRANSFERE", "REFORME")
                    .contains(statutVehicule);
            Map<String, Object> ligne = new LinkedHashMap<>();
            ligne.put("id", vehicule.getId());
            ligne.put("immatriculation", vehicule.getImmatriculation());
            ligne.put("disponible", !indisponibleTechniquement && conflit == null);
            ligne.put("raison", indisponibleTechniquement
                    ? raisonIndisponibiliteStatut(statutVehicule)
                    : conflit == null ? null : "Déjà réservé sur cette période");
            ligne.put("reservationId", conflit == null ? null : conflit.getId());
            ligne.put("direction", conflit == null ? null : conflit.getDemandeurEntite());
            ligne.put("dateDebut", conflit == null ? null : conflit.getDateDebut());
            ligne.put("dateFin", conflit == null ? null : conflit.getDateFin());
            resultat.add(ligne);
        }
        return ResponseEntity.ok(resultat);
    }

    private String raisonIndisponibiliteStatut(String statut) {
        if ("REQUISITIONNE".equals(statut)) {
            return "Véhicule réquisitionné par le DGAL";
        }
        if (Set.of("MAINTENANCE", "EN_MAINTENANCE", "EN_PANNE").contains(statut)) {
            return "Véhicule en panne ou maintenance : indisponible jusqu'à confirmation du Chef Logistique";
        }
        return "Véhicule indisponible : statut opérationnel " + (statut == null || statut.isBlank() ? "non renseigné" : statut);
    }

    @GetMapping("/{id}/disponibilites")
    public ResponseEntity<?> disponibilitesReservation(
            @PathVariable Long id
    ) {
        Reservation dossier = reservationRepository.findById(id).orElse(null);
        if (dossier == null) return ResponseEntity.notFound().build();
        accesParcours.exigerLecture(dossier);

        if (!reservationRepository
                .existsById(
                        id
                )) {

            return ResponseEntity
                    .notFound()
                    .build();
        }


        try {

            DisponibiliteReservationResponse disponibilites =
                    disponibiliteReservationService
                            .calculerDisponibilites(
                                    id
                            );


            return ResponseEntity.ok(
                    disponibilites
            );

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            e.getMessage()
                    );

        } catch (Exception e) {

            e.printStackTrace();


            return ResponseEntity
                    .internalServerError()
                    .body(
                            "Impossible de calculer les disponibilités pour cette demande"
                    );
        }
    }


    // Affectation automatique utilisée à chaque choix d'un véhicule.
    // =========================================================
    // NOUVEAU VEHICULE APRES AVIS DID DEFAVORABLE
    // Toujours le même ticket; chaque contrôle reste en historique.
    // =========================================================
    @PostMapping("/{id}/relancer-avis-did")
    @Transactional
    public ResponseEntity<?> relancerAvisDid(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> request
    ) {
        Utilisateur auteur = utilisateurCourant();
        if (auteur == null) {
            return ResponseEntity.status(401).body("Utilisateur non authentifié.");
        }
        if (auteur.getRole() == null || !"CHEF_SERVICE_LOGISTIQUE".equalsIgnoreCase(
                auteur.getRole().trim().replaceFirst("^ROLE_", ""))) {
            return ResponseEntity.status(403).body("Action réservée au Chef du Service Logistique.");
        }

        // Le rôle est aussi protégé dans SecurityConfig (pas seulement l'interface).
        Reservation reservation = reservationRepository.findByIdForUpdate(id).orElse(null);
        if (reservation == null) {
            return ResponseEntity.notFound().build();
        }
        if (!"EN_ATTENTE_AVIS_DID".equalsIgnoreCase(reservation.getStatut())) {
            return ResponseEntity.status(409).body("Le ticket n'est pas dans le circuit DID.");
        }
        if (reservation.getVehicule() == null) {
            return ResponseEntity.status(409).body("Aucun véhicule actuellement associé au ticket.");
        }

        Maintenance precedent = dernierControleDidDuTicket(id);
        if (precedent == null || precedent.getVehicule() == null ||
                !precedent.getVehicule().getId().equals(reservation.getVehicule().getId()) ||
                !avisDidDefavorable(precedent)) {
            return ResponseEntity.status(409).body(
                    "Un avis DID défavorable sur le véhicule actuel est requis avant de le remplacer.");
        }

        Long nouvelId = lireIdentifiant(request, "vehiculeId");
        if (nouvelId == null || nouvelId.equals(reservation.getVehicule().getId())) {
            return ResponseEntity.badRequest().body("Choisissez un véhicule différent de celui refusé.");
        }
        // Un véhicule déjà déclaré défavorable pour CE ticket ne doit pas être proposé à nouveau.
        boolean dejaEcarte = controlesDidDuTicket(id).stream()
                .anyMatch(m -> avisDidDefavorable(m) && m.getVehicule() != null &&
                        nouvelId.equals(m.getVehicule().getId()));
        if (dejaEcarte) {
            return ResponseEntity.status(409).body("Ce véhicule a déjà reçu un avis défavorable pour ce ticket.");
        }

        Vehicule nouveau = vehiculeRepository.findByIdForUpdate(nouvelId).orElse(null);
        if (nouveau == null) {
            return ResponseEntity.badRequest().body("Véhicule de remplacement introuvable.");
        }
        if (!estIntraToamasina(reservation) && (!estVoiture(nouveau) || !estVehiculeMissionHorsVille(nouveau))) {
            return ResponseEntity.badRequest().body("Une mission hors ville doit être affectée à une voiture.");
        }
        if (!disponibiliteReservationService.estVehiculeDisponiblePourPeriode(
                nouveau.getId(), reservation.getDateDebut(), reservation.getDateFin(), reservation.getId())) {
            return ResponseEntity.status(409).body("Véhicule déjà réservé ou indisponible pour la période du ticket.");
        }

        Chauffeur chauffeur = null;
        if (Boolean.TRUE.equals(reservation.getBesoinChauffeur())) {
            Long chauffeurId = lireIdentifiant(request, "chauffeurId");
            if (chauffeurId == null) {
                return ResponseEntity.badRequest().body("Veuillez sélectionner un chauffeur pour ce véhicule.");
            }
            chauffeur = chauffeurRepository.findByIdForUpdate(chauffeurId).orElse(null);
            if (chauffeur == null || (estIntraToamasina(reservation) && !chauffeurAutoService.estCompatible(nouveau, chauffeur))) {
                return ResponseEntity.badRequest().body("Le chauffeur sélectionné n'est pas compatible avec ce véhicule.");
            }
            if (!disponibiliteReservationService.estChauffeurDisponiblePourPeriode(
                    chauffeur.getId(), reservation.getDateDebut(), reservation.getDateFin(), reservation.getId())) {
                return ResponseEntity.status(409).body(
                        "Le chauffeur sélectionné n'est plus disponible pour la période du ticket.");
            }
        }

        Vehicule vehiculeRefuse = reservation.getVehicule();
        // L'ancien avis demeure associé à l'ancien véhicule; la réservation
        // réserve maintenant le nouveau véhicule et son chauffeur pour ces dates.
        reservation.setVehicule(nouveau);
        reservation.setChauffeur(chauffeur);
        reservation.setStatut("EN_ATTENTE_AVIS_DID");
        reservationRepository.save(reservation);

        Maintenance nouveauControle = new Maintenance();
        nouveauControle.setReservation(reservation);
        nouveauControle.setVehicule(nouveau);
        nouveauControle.setNatureIntervention("Contrôle visuel avant mission");
        Maintenance sauvegarde = maintenanceService.creer(nouveauControle);

        // La demande d'entretien de l'ancien véhicule est signalée au DID.
        // L'ouverture de la liste déroulante seule n'envoie rien.
        try {
            String numeroTicket = "TKT-" + String.format("%05d", reservation.getId());
            var notificationsCreees = notificationService.creerPourRole(
                    "MECANICIEN_DID", "ENTRETIEN", "IMPORTANT",
                    "Demande d'entretien acceptée pour le ticket " + numeroTicket,
                    "Demande d'entretien acceptée pour le ticket " + numeroTicket
                            + " : véhicule " + vehiculeRefuse.getImmatriculation()
                            + " (avis défavorable). Nouveau contrôle demandé pour le véhicule "
                            + nouveau.getImmatriculation() + ".",
                    "/mecanicien-did", reservation.getId(), null, nouveau.getId(), true
            );
            System.out.println("Relance DID ticket " + numeroTicket
                    + " : " + notificationsCreees.size() + " notification(s) mécanicien créées.");
        } catch (Exception erreurNotification) {
            System.err.println("Relance DID créée; notification à vérifier : "
                    + erreurNotification.getMessage());
        }
        return ResponseEntity.ok(sauvegarde);
    }

    private String lienEspaceDemandeur(Reservation reservation) {
        String role = reservation.getDemandeur() == null || reservation.getDemandeur().getRole() == null
                ? "" : reservation.getDemandeur().getRole().replaceFirst("^ROLE_", "");
        return switch (role) {
            case "CHEF_SERVICE_LOGISTIQUE" -> "/chef-service-logistique";
            case "ASSISTANT_DIRECTION", "AGENT_PAR_INTERIM_ASSISTANT" -> "/assistant-direction";
            default -> "/chef-direction";
        };
    }

    private Long lireIdentifiant(Map<String, Object> corps, String cle) {
        if (corps == null || corps.get(cle) == null) return null;
        try {
            Long valeur = Long.valueOf(String.valueOf(corps.get(cle)).trim());
            return valeur > 0 ? valeur : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private boolean avisDidDefavorable(Maintenance controle) {
        return controle != null && (
                "DEFAVORABLE".equalsIgnoreCase(controle.getDecisionDID()) ||
                        "AVIS_DEFAVORABLE_DID".equalsIgnoreCase(String.valueOf(controle.getStatut()))
        );
    }

    private boolean avisDidFavorable(Maintenance controle) {
        if (controle == null || avisDidDefavorable(controle)) {
            return false;
        }
        String decision = controle.getDecisionDID();
        return "FAVORABLE".equalsIgnoreCase(decision) ||
                "EN_ATTENTE_VALIDATION_N1".equalsIgnoreCase(String.valueOf(controle.getStatut()));
    }

    private List<Maintenance> controlesDidDuTicket(Long id) {
        return maintenanceService.listerToutes().stream()
                .filter(m -> m.getReservation() != null && id.equals(m.getReservation().getId()))
                .filter(m -> m.getNatureIntervention() != null &&
                        m.getNatureIntervention().toLowerCase(Locale.ROOT).contains("contrôle visuel avant mission"))
                .sorted(Comparator.comparing(Maintenance::getDateCreation,
                                Comparator.nullsFirst(Comparator.naturalOrder())).reversed()
                        .thenComparing(m -> String.valueOf(m.getId()), Comparator.reverseOrder()))
                .toList();
    }

    private Maintenance dernierControleDidDuTicket(Long id) {
        return controlesDidDuTicket(id).stream().findFirst().orElse(null);
    }

    // =========================================================
    // DEMANDE AVIS ENTRETIEN VEHICULE - DID
    // =========================================================

    @PostMapping("/{id}/demande-avis-entretien")
    @Transactional
    public ResponseEntity<?> demanderAvisEntretien(
            @PathVariable Long id,
            @RequestBody(required = false)
            Map<String, Object> request
    ) {

        Reservation reservation =
                reservationRepository
                        .findByIdForUpdate(
                                id
                        )
                        .orElse(null);


        if (reservation == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        return demanderAvisEntretienReservation(reservation, request);
    }

    private ResponseEntity<?> demanderAvisEntretienReservation(Reservation reservation, Map<String, Object> request) {
        if (estCircuitAssistant(reservation) && !estAssistantDirection(utilisateurCourant())) {
            return ResponseEntity.status(403).body(
                    "Les missions dans Toamasina sont réservées à l'Assistant de direction."
            );
        }

        if (!"EN_ATTENTE".equalsIgnoreCase(
                reservation.getStatut()
        )) {

            return ResponseEntity
                    .status(409)
                    .body(
                            "Cette demande ne peut plus être envoyée au DID. "
                                    + "Statut actuel : "
                                    + reservation.getStatut()
                    );
        }


        Long vehiculeId =
                null;


        if (request != null) {

            Object valeurVehicule =
                    request.get(
                            "vehiculeId"
                    );


            if (valeurVehicule instanceof Number) {

                vehiculeId =
                        ((Number) valeurVehicule)
                                .longValue();

            } else if (valeurVehicule instanceof String) {

                String texte =
                        ((String) valeurVehicule)
                                .trim();


                if (!texte.isBlank()) {

                    try {

                        vehiculeId =
                                Long.parseLong(
                                        texte
                                );

                    } catch (NumberFormatException ignored) {

                        return ResponseEntity
                                .badRequest()
                                .body(
                                        "L'identifiant du véhicule est invalide."
                                );
                    }
                }
            }
        }


        if (vehiculeId == null
                && reservation.getVehicule() != null) {

            vehiculeId =
                    reservation
                            .getVehicule()
                            .getId();
        }


        if (vehiculeId == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Veuillez sélectionner un véhicule avant de demander l'avis DID."
                    );
        }


        Vehicule vehicule =
                vehiculeRepository
                        .findByIdForUpdate(
                                vehiculeId
                        )
                        .orElse(null);


        if (vehicule == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le véhicule sélectionné n'existe pas."
                    );
        }

        if (!estIntraToamasina(reservation) && (!estVoiture(vehicule) || !estVehiculeMissionHorsVille(vehicule))) {
            return ResponseEntity.badRequest().body("Une mission hors ville doit être affectée à une voiture.");
        }


        boolean vehiculeDisponible =
                disponibiliteReservationService
                        .estVehiculeDisponiblePourPeriode(
                                vehicule.getId(),
                                reservation.getDateDebut(),
                                reservation.getDateFin(),
                                reservation.getId()
                        );


        if (!vehiculeDisponible) {

            return ResponseEntity
                    .status(409)
                    .body(
                            "Le véhicule sélectionné n'est pas disponible "
                                    + "pour la période demandée."
                    );
        }

        reservation.setVehicule(
                vehicule
        );

        // Le Chef Logistique choisit le chauffeur avant l'inspection DID.
        // On conserve ce choix sur la réservation afin qu'il soit repris
        // après le retour du mécanicien pour la validation N°1.
        Long chauffeurId = lireIdentifiant(request, "chauffeurId");
        String chauffeurMatricule = request == null || request.get("chauffeurMatricule") == null
                ? null : String.valueOf(request.get("chauffeurMatricule")).trim();
        if (chauffeurId != null || (chauffeurMatricule != null && !chauffeurMatricule.isBlank())) {
            Chauffeur chauffeur = chauffeurId == null ? null : chauffeurRepository.findById(chauffeurId).orElse(null);
            if (chauffeur == null && chauffeurMatricule != null && !chauffeurMatricule.isBlank()) {
                chauffeur = chauffeurRepository.findByMatricule(chauffeurMatricule).orElse(null);
            }
            if (chauffeur == null) {
                return ResponseEntity.badRequest().body("Le chauffeur sélectionné est introuvable.");
            }
            reservation.setChauffeur(chauffeur);
        }


        reservationRepository.save(
                reservation
        );


        Maintenance maintenance =
                new Maintenance();


        maintenance.setReservation(
                reservation
        );


        maintenance.setVehicule(
                vehicule
        );


        maintenance.setNatureIntervention(
                "Contrôle visuel avant mission"
        );


        Maintenance sauvegarde =
                maintenanceService
                        .creer(
                                maintenance
                        );


        reservation.setStatut(
                "EN_ATTENTE_AVIS_DID"
        );


        reservationRepository.save(
                reservation
        );


        // -----------------------------------------------------
        // NOTIFIER LE MECANICIEN DID
        // -----------------------------------------------------
        //
        // L'alerte alimente le centre commun et le popup DID de la page
        // mécanicien, avec le même identifiant de mission et de véhicule.
        //
        // Une panne d'email / notification ne doit jamais
        // bloquer la demande d'avis DID.
        //
        try {

            String ticket =
                    "TKT-"
                            + String.format(
                            "%05d",
                            reservation.getId()
                    );

            String immatriculation =
                    vehicule.getImmatriculation() == null
                            || vehicule.getImmatriculation().isBlank()
                            ? "véhicule non renseigné"
                            : vehicule.getImmatriculation().trim();

            var notificationsDID =
                    notificationService.creerPourRole(
                            "MECANICIEN_DID",
                            "AVIS_DID",
                            "IMPORTANT",
                            "Inspection visuelle à réaliser",
                            ticket
                                    + " — "
                                    + immatriculation
                                    + " demande une inspection visuelle pour une mission. Ouvrez la fiche de contrôle avant de transmettre votre avis DID.",
                            "/mecanicien-did",
                            reservation.getId(),
                            null,
                            vehicule.getId(),
                            true
                    );

            System.out.println(
                    "NOTIFICATION DID → "
                            + ticket
                            + " → "
                            + notificationsDID.size()
                            + " notification(s) créée(s) pour MECANICIEN_DID"
            );

        } catch (Exception e) {

            System.err.println(
                    "NOTIFICATION DID IMPOSSIBLE → réservation "
                            + reservation.getId()
                            + " : "
                            + e.getMessage()
            );
        }


        return ResponseEntity.ok(
                sauvegarde
        );
    }

    /**
     * Inspection visuelle de retour pour une mission hors ville. Le Chef
     * Logistique déclenche ce second passage dans la même fiche DID après le
     * retour du véhicule; la mission reste ouverte jusqu'à l'avis favorable.
     */
    @PostMapping("/{id}/demande-avis-arrivee")
    @Transactional
    public ResponseEntity<?> demanderAvisArrivee(@PathVariable Long id) {
        Utilisateur auteur = utilisateurCourant();
        String role = auteur == null || auteur.getRole() == null ? ""
                : auteur.getRole().trim().replaceFirst("^ROLE_", "");
        if (!"CHEF_SERVICE_LOGISTIQUE".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body("Action réservée au Chef du Service Logistique.");
        }
        Reservation reservation = reservationRepository.findByIdForUpdate(id).orElse(null);
        if (reservation == null) return ResponseEntity.notFound().build();
        if (!Set.of("VALIDEE", "PLANIFIEE", "EN_COURS", "VALIDEE_N1").contains(String.valueOf(reservation.getStatut()).toUpperCase(Locale.ROOT))) {
            return ResponseEntity.status(409).body("La mission doit être validée avant l'inspection d'arrivée.");
        }
        if (reservation.getDateFin() == null
                || LocalDateTime.now().isBefore(reservation.getDateFin().minusHours(24))) {
            return ResponseEntity.status(409).body("La clôture et l'inspection d'arrivée ne sont disponibles que dans les 24 dernières heures de la mission.");
        }
        if (reservation.getVehicule() == null) return ResponseEntity.status(409).body("Aucun véhicule n'est affecté à la mission.");
        Maintenance controleExistant = maintenanceService.listerToutes().stream()
                .filter(m -> m.getReservation() != null && id.equals(m.getReservation().getId())
                        && m.getNatureIntervention() != null
                        && m.getNatureIntervention().toLowerCase(Locale.ROOT).contains("après mission")
                        && m.getStatut() == com.vehicule.Spat.vehicule.spat_backend.model.StatutMaintenance.EN_ATTENTE_AVIS_DID)
                .findFirst()
                .orElse(null);
        if (controleExistant != null) {
            return ResponseEntity.ok(controleExistant);
        }

        Maintenance controle = new Maintenance();
        controle.setReservation(reservation);
        controle.setVehicule(reservation.getVehicule());
        controle.setNatureIntervention("Contrôle visuel après mission");

        Maintenance precedent = maintenanceService.listerToutes().stream()
                .filter(m -> m.getReservation() != null && id.equals(m.getReservation().getId()))
                .filter(m -> m.getFicheControle() != null && !m.getFicheControle().isBlank())
                .max(Comparator.comparing(Maintenance::getDateCreation, Comparator.nullsFirst(Comparator.naturalOrder())))
                .orElse(null);
        if (precedent != null) {
            controle.setFicheControle(precedent.getFicheControle());
        }

        Maintenance sauvegarde = maintenanceService.creer(controle);
        reservation.setStatut("EN_ATTENTE_AVIS_DID");
        reservationRepository.save(reservation);
        try {
            notificationService.creerPourRole("MECANICIEN_DID", "AVIS_DID", "IMPORTANT",
                    "Inspection visuelle d'arrivée à réaliser",
                    "TKT-" + String.format("%05d", id) + " — " + reservation.getVehicule().getImmatriculation()
                            + " demande l'inspection visuelle d'arrivée. Ouvrez la fiche de contrôle et renseignez la section arrivée.",
                    "/mecanicien-did", id, null, reservation.getVehicule().getId(), true);
        } catch (Exception e) {
            System.err.println("Inspection d'arrivée créée; notification DID impossible : " + e.getMessage());
        }
        return ResponseEntity.ok(sauvegarde);
    }

    /** Clôture définitive après avis DID favorable sur l'inspection d'arrivée. */
    @PostMapping("/{id}/cloturer-apres-avis-did")
    @Transactional
    public ResponseEntity<?> cloturerApresAvisDid(@PathVariable Long id) {
        Utilisateur auteur = utilisateurCourant();
        String role = auteur == null || auteur.getRole() == null ? ""
                : auteur.getRole().trim().replaceFirst("^ROLE_", "");
        if (!"CHEF_SERVICE_LOGISTIQUE".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body("Action réservée au Chef du Service Logistique.");
        }
        Reservation reservation = reservationRepository.findByIdForUpdate(id).orElse(null);
        if (reservation == null) return ResponseEntity.notFound().build();
        Maintenance controle = maintenanceService.listerToutes().stream()
                .filter(m -> m.getReservation() != null && id.equals(m.getReservation().getId()))
                .filter(m -> m.getNatureIntervention() != null
                        && m.getNatureIntervention().toLowerCase(Locale.ROOT).contains("après mission"))
                .max(Comparator.comparing(Maintenance::getDateCreation, Comparator.nullsFirst(Comparator.naturalOrder())))
                .orElse(null);
        if (controle == null || !"FAVORABLE".equalsIgnoreCase(controle.getDecisionDID())) {
            return ResponseEntity.status(409).body("La clôture attend l'avis DID favorable de l'inspection d'arrivée.");
        }
        reservation.setStatut("CLOTUREE");
        if (reservation.getDateFin() == null || reservation.getDateFin().isAfter(LocalDateTime.now())) {
            reservation.setDateFin(LocalDateTime.now());
        }
        Reservation sauvegardee = reservationRepository.save(reservation);
        try {
            notificationService.creerPourRole("ASSISTANT_DIRECTION", "MISSION_CLOTUREE", "SUCCES",
                    "Mission hors ville clôturée", "Le ticket TKT-" + String.format("%05d", id)
                            + " a été clôturé après l'inspection d'arrivée DID.", "/assistant-direction", id, null,
                    reservation.getVehicule() == null ? null : reservation.getVehicule().getId(), true);
        } catch (Exception ignored) { }
        return ResponseEntity.ok(sauvegardee);
    }

    // =========================================================
    // DECISION CHEF SERVICE LOGISTIQUE
    // =========================================================

    @Transactional
    @PutMapping("/{id}/decision")
    public ResponseEntity<?> deciderReservation(
            @PathVariable Long id,
            @RequestBody DecisionReservationRequest request
    ) {

        Utilisateur utilisateurDecision =
                utilisateurCourant();


        if (utilisateurDecision == null) {

            return ResponseEntity
                    .status(401)
                    .body(
                            "Utilisateur introuvable ou non authentifié"
                    );
        }


        if (request == null
                || request.getStatut() == null
                || request.getStatut().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le statut de décision est obligatoire"
                    );
        }


        String nouveauStatut =
                request
                        .getStatut()
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        );


        if (!"VALIDEE_N1".equals(
                nouveauStatut
        )
                && !"REFUSEE".equals(
                nouveauStatut
        )) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Statut invalide. Les valeurs autorisées sont VALIDEE_N1 ou REFUSEE."
                    );
        }


        Reservation reservation =
                reservationRepository
                        .findByIdForUpdate(
                                id
                        )
                        .orElse(null);


        if (reservation == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        if (!decisionAutorisee(utilisateurDecision, reservation)) {
            return ResponseEntity.status(403).body("Décision réservée au circuit de validation de la catégorie du véhicule.");
        }


        if (!"EN_ATTENTE".equalsIgnoreCase(
                reservation.getStatut()
        )
                &&
                !"EN_ATTENTE_AVIS_DID".equalsIgnoreCase(
                        reservation.getStatut()
                )) {

            return ResponseEntity
                    .status(409)
                    .body(
                            "Cette demande a déjà été traitée. "
                                    + "Statut actuel : "
                                    + reservation.getStatut()
                    );
        }


        // =====================================================
        // REFUS
        // =====================================================

        if ("REFUSEE".equals(
                nouveauStatut
        )) {

            if (request.getMotifRefus() == null
                    || request.getMotifRefus().isBlank()) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                "Le motif du refus est obligatoire"
                        );
            }


            reservation.setVehicule(
                    null
            );


            reservation.setChauffeur(
                    null
            );


            reservation.setStatut(
                    "REFUSEE"
            );


            reservation.setMotifRefus(
                    request
                            .getMotifRefus()
                            .trim()
            );


            reservation.setRefusePar(
                    utilisateurDecision
            );


            reservation.setDateRefus(
                    LocalDateTime.now()
            );


            reservation.setValidationN1Par(
                    null
            );

            reservation.setDateValidationN1(
                    null
            );


            reservation.setValidationN2Par(
                    null
            );

            reservation.setDateValidationN2(
                    null
            );


            Reservation reservationSauvegardee =
                    reservationRepository
                            .save(
                                    reservation
                            );


            return ResponseEntity.ok(
                    reservationSauvegardee
            );
        }


        // =====================================================
        // VALIDATION NIVEAU 1
        // =====================================================

        if (request.getVehiculeId() == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Un véhicule doit être sélectionné pour la validation niveau 1"
                    );
        }


        Vehicule vehicule =
                vehiculeRepository
                        .findByIdForUpdate(
                                request.getVehiculeId()
                        )
                        .orElse(null);


        if (vehicule == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Véhicule introuvable"
                    );
        }

        if ("PATROUILLE".equalsIgnoreCase(reservation.getTypeDemande()) && !com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule.estVehiculePatrouille(vehicule.getCategorie())) {
            return ResponseEntity.badRequest().body("Cette demande de sûreté doit utiliser exclusivement le véhicule de patrouille 1205 TCA.");
        }
        if (!estIntraToamasina(reservation) && !"PATROUILLE".equalsIgnoreCase(reservation.getTypeDemande()) && (!estVoiture(vehicule) || !estVehiculeMissionHorsVille(vehicule))) {
            return ResponseEntity.badRequest().body("Une mission hors ville doit utiliser le véhicule 1614 WWA ou 1615 WWA.");
        }


        boolean vehiculeDisponible =
                disponibiliteReservationService
                        .estVehiculeDisponiblePourPeriode(
                                vehicule.getId(),
                                reservation.getDateDebut(),
                                reservation.getDateFin(),
                                reservation.getId()
                        );


        if (!vehiculeDisponible) {

            return ResponseEntity
                    .status(409)
                    .body(
                            "Ce véhicule n'est plus disponible pour la période demandée. "
                                    + "Veuillez actualiser les disponibilités."
                    );
        }


        // Ne jamais valider une version antérieure du contrôle ou un véhicule
        // refusé : seule la DERNIÈRE décision DID du ticket fait foi.
        Maintenance dernierControle = dernierControleDidDuTicket(reservation.getId());
        // L'ordre de mission signé appartient à la validation N°2 du Chef DGAL.
        // La validation N°1 affecte le véhicule et le chauffeur après l'avis DID.
        if (Boolean.TRUE.equals(reservation.getBesoinChauffeur())) {
            Long chauffeurId = request.getChauffeurId();
            if (chauffeurId == null) {
                return ResponseEntity.badRequest().body("Un chauffeur doit être choisi par le Chef du Service Logistique avant la validation N°1.");
            }
            Chauffeur chauffeur = chauffeurRepository.findByIdForUpdate(chauffeurId).orElse(null);
            if (chauffeur == null) {
                return ResponseEntity.badRequest().body("Chauffeur introuvable.");
            }
            if (chauffeur.getNumeroPermis() == null || chauffeur.getNumeroPermis().isBlank()
                    || chauffeur.getDateExpirationPermis() == null
                    || chauffeur.getDateExpirationPermis().isBefore(reservation.getDateFin().toLocalDate())) {
                return ResponseEntity.status(409).body("Le permis du chauffeur choisi doit être renseigné et valide jusqu'à la fin de la mission.");
            }
            if (!disponibiliteReservationService.estChauffeurDisponiblePourPeriode(
                    chauffeur.getId(), reservation.getDateDebut(), reservation.getDateFin(), reservation.getId())) {
                return ResponseEntity.status(409).body("Le chauffeur choisi est indisponible pour cette période.");
            }
            reservation.setChauffeur(chauffeur);
        } else {
            reservation.setChauffeur(null);
        }
        if (dernierControle == null || dernierControle.getVehicule() == null ||
                !vehicule.getId().equals(dernierControle.getVehicule().getId()) ||
                !avisDidFavorable(dernierControle)) {
            return ResponseEntity.status(409).body(
                    "Validation N°1 impossible : le véhicule choisi doit avoir reçu le dernier avis DID favorable du ticket.");
        }

        reservation.setVehicule(
                vehicule
        );


        reservation.setStatut(
                "VALIDEE_N1"
        );


        reservation.setValidationN1Par(
                utilisateurDecision
        );


        reservation.setDateValidationN1(
                LocalDateTime.now()
        );


        reservation.setValidationN2Par(
                null
        );


        reservation.setDateValidationN2(
                null
        );


        reservation.setMotifRefus(
                null
        );


        reservation.setRefusePar(
                null
        );


        reservation.setDateRefus(
                null
        );


        Reservation reservationSauvegardee =
                reservationRepository
                        .save(
                                reservation
                        );

        // -----------------------------------------------------
        // NOTIFICATION NIVEAU 1 -> CHEF DGAL
        // Une seule notification par utilisateur actif au moment
        // de la validation N1 ; aucun envoi au simple chargement de page.
        // -----------------------------------------------------
        try {
            Long ticketId = reservationSauvegardee.getId();
            Long vehiculeId = reservationSauvegardee.getVehicule() != null
                    ? reservationSauvegardee.getVehicule().getId()
                    : null;
            String numeroTicket = "TKT-" + String.format("%05d", ticketId);

            boolean missionToamasina = estCircuitAssistant(reservationSauvegardee);
            String roleNiveau2 = missionToamasina ? "ASSISTANT_DIRECTION" : "CHEF_DGAL";
            String espaceNiveau2 = missionToamasina ? "/assistant-direction" : "/chef-dgal";
            var notificationsDgal = notificationService.creerPourRole(
                    roleNiveau2,
                    "TICKET",
                    "IMPORTANT",
                    "Ticket à valider au niveau 2",
                    "Le ticket " + numeroTicket
                            + " a été validé au niveau 1 et attend votre validation au niveau 2.",
                    espaceNiveau2,
                    ticketId,
                    null,
                    vehiculeId,
                    true
            );
            System.out.println("NOTIFICATION " + roleNiveau2 + " -> " + numeroTicket
                    + " : " + notificationsDgal.size() + " destinataire(s)");
        } catch (Exception erreurNotification) {
            // Préserver le traitement métier si l'envoi est indisponible.
            System.err.println("Validation N1 enregistrée ; notification DGAL impossible : "
                    + erreurNotification.getMessage());
        }

        return ResponseEntity.ok(
                reservationSauvegardee
        );
    }


    // =========================================================
    // VALIDATION NIVEAU 2 - CHEF DGAL
    // =========================================================

    @Transactional
    @PutMapping("/{id}/validation-n2")
    public ResponseEntity<?> validerNiveau2(
            @PathVariable Long id
    ) {

        Utilisateur utilisateurDecision =
                utilisateurCourant();


        if (utilisateurDecision == null) {

            return ResponseEntity
                    .status(401)
                    .body(
                            "Utilisateur introuvable ou non authentifié"
                    );
        }


        Reservation reservation =
                reservationRepository
                        .findByIdForUpdate(
                                id
                        )
                        .orElse(null);


        if (reservation == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        if (!decisionAutorisee(utilisateurDecision, reservation)) {
            return ResponseEntity.status(403).body("Décision réservée au circuit de validation de la catégorie du véhicule.");
        }


        if (!"VALIDEE_N1".equalsIgnoreCase(
                reservation.getStatut()
        )) {

            return ResponseEntity
                    .status(409)
                    .body(
                            "Validation niveau 2 impossible. "
                                    + "La demande doit être au statut VALIDEE_N1. "
                                    + "Statut actuel : "
                                    + reservation.getStatut()
                    );
        }


        if (reservation.getVehicule() == null) {

            return ResponseEntity
                    .status(409)
                    .body(
                            "Validation niveau 2 impossible : "
                                    + "aucun véhicule n'est affecté à cette demande."
                    );
        }


        if (Boolean.TRUE.equals(
                reservation.getBesoinChauffeur()
        )
                &&
                reservation.getChauffeur() == null) {

            return ResponseEntity
                    .status(409)
                    .body(
                            "Validation niveau 2 impossible : "
                                    + "un chauffeur est requis mais aucun chauffeur n'est affecté."
                    );
        }


        if (reservation.getValidationN1Par() == null
                || reservation.getDateValidationN1() == null) {

            return ResponseEntity
                    .status(409)
                    .body(
                            "Validation niveau 2 impossible : "
                                    + "la traçabilité de la validation niveau 1 est incomplète."
                    );
        }


        if (!reservation.getDateDebut().isAfter(LocalDateTime.now()))
            return ResponseEntity.status(409).body("La validation doit précéder le départ de la mission.");
        vehiculeRepository.findByIdForUpdate(reservation.getVehicule().getId());
        if (reservation.getChauffeur() != null) chauffeurRepository.findByIdForUpdate(reservation.getChauffeur().getId());
        String erreurDispositif = reglesDispositifService.verifier(reservation);
        if (erreurDispositif != null) return ResponseEntity.status(409).body(erreurDispositif);
        
        // Vérification spécifique : ordre de mission obligatoire pour véhicules de mission
        if (reservation.getVehicule() != null && !reglesDispositifService.ordreMissionValide(reservation, reservation.getVehicule())) {
            return ResponseEntity.status(409).body("Un ordre de mission signé et validé est obligatoire pour tout véhicule de mission. Veuillez le déposer dans la section Justificatifs.");
        }

        reservation.setStatut(estIntraToamasina(reservation) ? "VALIDEE" : "PLANIFIEE");


        reservation.setValidationN2Par(
                utilisateurDecision
        );


        reservation.setDateValidationN2(
                LocalDateTime.now()
        );


        Reservation reservationSauvegardee =
                reservationRepository
                        .save(
                                reservation
                        );

        // La validation N2 clôt le circuit de planification : le demandeur
        // reçoit immédiatement la notification et peut récupérer l'ordre de
        // mission depuis son espace.
        try {
            String matriculeDemandeur = reservationSauvegardee.getDemandeurMatricule();
            if (matriculeDemandeur != null && !matriculeDemandeur.isBlank()) {
                notificationService.creerPourMatriculeIsole(
                        matriculeDemandeur, "MISSION_PLANIFIEE", "IMPORTANT",
                        "Mission planifiée",
                        "Le ticket TKT-" + String.format("%05d", id)
                                + " est planifié après les deux validations. L'ordre de mission est disponible au téléchargement.",
                        lienEspaceDemandeur(reservationSauvegardee), id, null,
                        reservationSauvegardee.getVehicule() == null ? null : reservationSauvegardee.getVehicule().getId(), true);
            }
        } catch (Exception e) {
            System.err.println("Validation N2 enregistrée ; notification du demandeur impossible : " + e.getMessage());
        }


        return ResponseEntity.ok(
                reservationSauvegardee
        );
    }

    @PostMapping("/{id}/urgence-chef-logistique")
    @Transactional
    public ResponseEntity<?> declarerUrgenceChefLogistique(@PathVariable Long id,
                                                             @RequestBody Map<String, String> body) {
        Utilisateur chef = utilisateurCourant();
        String role = chef == null || chef.getRole() == null ? "" : chef.getRole().trim().replaceFirst("^ROLE_", "");
        if (!"CHEF_SERVICE_LOGISTIQUE".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body("Action réservée au Chef du Service Logistique.");
        }
        Reservation reservation = reservationRepository.findByIdForUpdate(id).orElse(null);
        if (reservation == null) return ResponseEntity.notFound().build();
        if (Set.of("CLOTUREE", "REFUSEE", "A_REPROGRAMMER").contains(String.valueOf(reservation.getStatut()).toUpperCase(Locale.ROOT))) {
            return ResponseEntity.status(409).body("Cette mission ne peut plus être suspendue.");
        }
        String motif = body == null ? null : body.get("motifUrgence");
        String sousCategorie = body == null ? null : body.get("sousCategorie");
        if (motif == null || motif.isBlank()) return ResponseEntity.badRequest().body("Le motif de l'urgence est obligatoire.");
        if (sousCategorie == null || sousCategorie.isBlank()) return ResponseEntity.badRequest().body("La sous-catégorie de l'urgence est obligatoire.");
        reservation.setDemandeUrgente(true);
        reservation.setMotifUrgence(motif.trim());
        reservation.setTypeDemande("URGENTE");
        reservation.setStatut("A_REPROGRAMMER");
        String observations = reservation.getObservations() == null ? "" : reservation.getObservations().trim();
        reservation.setObservations((observations.isBlank() ? "" : observations + " · ")
                + "Urgence déclarée par le Chef Logistique (" + sousCategorie.trim() + ") : " + motif.trim());
        Reservation sauvegardee = reservationRepository.save(reservation);
        try {
            notificationService.creerPourRole(
                    "AGENT_FLOTTE", "URGENCE_MISSION", "URGENT",
                    "Mission suspendue pour urgence",
                    "Le ticket TKT-" + String.format("%05d", id) + " est suspendu. Motif : " + motif.trim(),
                    "/agent-flotte", id, null,
                    sauvegardee.getVehicule() == null ? null : sauvegardee.getVehicule().getId(), true);
        } catch (Exception ignored) {
            // La suspension métier reste enregistrée même si la notification échoue.
        }
        return ResponseEntity.ok(sauvegardee);
    }

    @PostMapping("/{id}/cloturer-urgence")
    @Transactional
    public ResponseEntity<?> cloturerMissionSuspendue(@PathVariable Long id) {
        Utilisateur auteur = utilisateurCourant();
        String role = auteur == null || auteur.getRole() == null ? ""
                : auteur.getRole().trim().replaceFirst("^ROLE_", "");
        if (!"CHEF_SERVICE_LOGISTIQUE".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body("Action réservée au Chef du Service Logistique.");
        }
        Reservation reservation = reservationRepository.findByIdForUpdate(id).orElse(null);
        if (reservation == null) return ResponseEntity.notFound().build();
        if (!"A_REPROGRAMMER".equalsIgnoreCase(reservation.getStatut())) {
            return ResponseEntity.status(409).body("Seule une mission suspendue pour urgence peut être clôturée.");
        }
        reservation.setStatut("CLOTUREE");
        reservation.setDateFin(LocalDateTime.now());
        Reservation sauvegardee = reservationRepository.save(reservation);
        try {
            notificationService.creerPourMatriculeIsole(reservation.getDemandeurMatricule(), "MISSION_CLOTUREE", "IMPORTANT",
                    "Mission urgente clôturée", "Le ticket TKT-" + String.format("%05d", id) + " a été clôturé par le Chef Logistique.",
                    lienEspaceDemandeur(reservation), id, null, reservation.getVehicule() == null ? null : reservation.getVehicule().getId(), true);
        } catch (Exception ignored) { }
        return ResponseEntity.ok(sauvegardee);
    }

    /**
     * Récupère les missions actives des véhicules mutualisés partagés
     * avec d'autres directions.
     * 
     * Permet aux assistants/chefs de direction de voir quand les véhicules
     * qu'ils partagent sont utilisés par d'autres directions.
     * 
     * @return Liste des missions actives avec info de disponibilité future
     */
    @GetMapping("/vehicules-partages/missions-actives")
    public ResponseEntity<?> missionsActivesVehiculesPartages() {
        try {
            Utilisateur auteur = utilisateurCourant();
            if (auteur == null || auteur.getDirectionId() == null) {
                return ResponseEntity.status(403).body(Map.of("erreur", "Direction non identifiée"));
            }

            Long directionId = auteur.getDirectionId();

            // Récupérer tous les véhicules mutualisés de cette direction
            List<Vehicule> vehiculesMutualises = vehiculeRepository.findAll().stream()
                    .filter(v -> "Voiture de service mutualisée".equalsIgnoreCase(v.getCategorie()))
                    .filter(v -> v.getDirections() != null && v.getDirections().stream()
                            .anyMatch(d -> d.getId().equals(directionId)))
                    .toList();

            if (vehiculesMutualises.isEmpty()) {
                return ResponseEntity.ok(List.of());
            }

            List<Long> vehiculeIds = vehiculesMutualises.stream().map(Vehicule::getId).toList();

            // Récupérer les missions en cours ou à venir de ces véhicules
            LocalDateTime maintenant = LocalDateTime.now();
            LocalDateTime limite = maintenant.plusDays(7); // Missions des 7 prochains jours

            List<Reservation> missionsActives = reservationRepository.findAll().stream()
                    .filter(r -> r.getVehicule() != null && vehiculeIds.contains(r.getVehicule().getId()))
                    .filter(r -> Set.of("VALIDEE", "PLANIFIEE", "EN_COURS").contains(r.getStatut()))
                    .filter(r -> r.getDateFin() == null || r.getDateFin().isAfter(maintenant))
                    .filter(r -> r.getDateDebut() != null && r.getDateDebut().isBefore(limite))
                    .sorted(Comparator.comparing(Reservation::getDateDebut))
                    .toList();

            // Construire la réponse avec informations enrichies
            List<Map<String, Object>> resultat = new ArrayList<>();

            for (Reservation mission : missionsActives) {
                Map<String, Object> info = new LinkedHashMap<>();
                info.put("missionId", mission.getId());
                info.put("vehiculeImmatriculation", mission.getVehicule().getImmatriculation());
                info.put("vehiculeId", mission.getVehicule().getId());
                info.put("dateDebut", mission.getDateDebut());
                info.put("dateFin", mission.getDateFin());
                info.put("destination", mission.getDestination());
                info.put("statut", mission.getStatut());
                
                // Direction qui utilise actuellement le véhicule
                String directionUtilisatrice = mission.getDemandeurEntite();
                if (directionUtilisatrice == null || directionUtilisatrice.isBlank()) {
                    directionUtilisatrice = "Autre direction";
                }
                info.put("directionUtilisatrice", directionUtilisatrice);
                
                // Calculer quand le véhicule sera libre
                boolean enCours = mission.getDateDebut().isBefore(maintenant) 
                        && (mission.getDateFin() == null || mission.getDateFin().isAfter(maintenant));
                
                info.put("enCours", enCours);
                info.put("libreLe", mission.getDateFin());
                
                // Message de disponibilité
                if (mission.getDateFin() != null) {
                    String message = String.format(
                        "Voiture %s en mission (%s) et sera prévue libre le %s à %s",
                        mission.getVehicule().getImmatriculation(),
                        directionUtilisatrice,
                        mission.getDateFin().toLocalDate().toString(),
                        mission.getDateFin().toLocalTime().toString()
                    );
                    info.put("message", message);
                } else {
                    info.put("message", String.format(
                        "Voiture %s en mission (%s), date de fin non définie",
                        mission.getVehicule().getImmatriculation(),
                        directionUtilisatrice
                    ));
                }

                resultat.add(info);
            }

            return ResponseEntity.ok(resultat);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "erreur", "Impossible de récupérer les missions actives",
                    "details", e.getMessage()
            ));
        }
    }
}
