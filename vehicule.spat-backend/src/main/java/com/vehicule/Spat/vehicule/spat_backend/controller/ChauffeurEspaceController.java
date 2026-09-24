package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.CreateConsommationChauffeurRequest;
import com.vehicule.Spat.vehicule.spat_backend.dto.CreateSignalementEntretienChauffeurRequest;

import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;
import com.vehicule.Spat.vehicule.spat_backend.model.Maintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.model.SignalementEntretienChauffeur;
import com.vehicule.Spat.vehicule.spat_backend.model.SuiviEntretienPeriodique;
import com.vehicule.Spat.vehicule.spat_backend.model.TransactionCarburant;
import com.vehicule.Spat.vehicule.spat_backend.model.TypeOperationCarburant;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;

import com.vehicule.Spat.vehicule.spat_backend.repository.ChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.SignalementEntretienChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.TransactionCarburantRepository;

import com.vehicule.Spat.vehicule.spat_backend.service.EntretienPeriodiqueService;
import com.vehicule.Spat.vehicule.spat_backend.service.MaintenanceService;
import com.vehicule.Spat.vehicule.spat_backend.service.NotificationService;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/chauffeur")
public class ChauffeurEspaceController {

    public static final String PREFIXE_SIGNALEMENT_CHAUFFEUR =
            "[SIGNALEMENT_CHAUFFEUR]";

    private final ChauffeurRepository chauffeurRepository;
    private final ReservationRepository reservationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final TransactionCarburantRepository transactionCarburantRepository;
    private final SignalementEntretienChauffeurRepository signalementRepository;

    private final MaintenanceService maintenanceService;
    private final NotificationService notificationService;
    private final EntretienPeriodiqueService entretienPeriodiqueService;

    public ChauffeurEspaceController(
            ChauffeurRepository chauffeurRepository,
            ReservationRepository reservationRepository,
            UtilisateurRepository utilisateurRepository,
            TransactionCarburantRepository transactionCarburantRepository,
            SignalementEntretienChauffeurRepository signalementRepository,
            MaintenanceService maintenanceService,
            NotificationService notificationService,
            EntretienPeriodiqueService entretienPeriodiqueService
    ) {
        this.chauffeurRepository =
                chauffeurRepository;

        this.reservationRepository =
                reservationRepository;

        this.utilisateurRepository = utilisateurRepository;

        this.transactionCarburantRepository =
                transactionCarburantRepository;

        this.signalementRepository =
                signalementRepository;

        this.maintenanceService =
                maintenanceService;

        this.notificationService = notificationService;

        this.entretienPeriodiqueService =
                entretienPeriodiqueService;
    }

    // =========================================================
    // CHAUFFEUR CONNECTE
    // =========================================================

    private Chauffeur chauffeurCourant(
            Authentication authentication
    ) {

        if (authentication == null
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            return null;
        }

        String matricule =
                authentication
                        .getName()
                        .trim();

        return chauffeurRepository
                .findByMatricule(
                        matricule
                )
                .orElse(null);
    }

    // =========================================================
    // MON PROFIL CHAUFFEUR
    // =========================================================

    @GetMapping("/profil")
    public ResponseEntity<?> profil(
            Authentication authentication
    ) {

        Chauffeur chauffeur =
                chauffeurCourant(
                        authentication
                );

        if (chauffeur == null) {

            return ResponseEntity
                    .status(404)
                    .body(
                            "Aucune fiche chauffeur ne correspond au matricule de l'utilisateur connecté."
                    );
        }

        return ResponseEntity.ok(
                chauffeur
        );
    }

    // =========================================================
    // MES TICKETS
    // =========================================================

    /*
     * /missions reste uniquement comme alias technique
     * temporaire afin de ne pas casser une ancienne page.
     *
     * Le vocabulaire métier affiché est désormais TICKET.
     */
    @GetMapping({"/tickets", "/missions"})
    public ResponseEntity<?> tickets(
            Authentication authentication
    ) {

        Chauffeur chauffeur =
                chauffeurCourant(
                        authentication
                );

        if (chauffeur == null) {

            return ResponseEntity
                    .status(404)
                    .body(
                            "Aucune fiche chauffeur ne correspond au matricule de l'utilisateur connecté."
                    );
        }

        List<Reservation> tickets =
                reservationRepository
                        .findByChauffeurIdOrderByDateDebutDesc(
                                chauffeur.getId()
                        );

        return ResponseEntity.ok(
                tickets
        );
    }


    // =========================================================
    // CLOTURER UNE MISSION PAR SON CHAUFFEUR AFFECTE
    // =========================================================

    /**
     * Une seule transition VALIDEE -> CLOTUREE est autorisee.
     * Le verrou pessimiste du repository empêche deux clotures simultanees
     * et donc l'envoi de notifications en double.
     * Le chauffeur est identifie UNIQUEMENT avec le JWT, jamais avec
     * un identifiant transmis par le navigateur.
     */
    @PostMapping("/tickets/{id}/cloturer")
    @Transactional
    public ResponseEntity<?> cloturerMission(
            @PathVariable("id") Long id,
            Authentication authentication
    ) {
        Chauffeur chauffeur = chauffeurCourant(authentication);

        if (chauffeur == null) {
            return ResponseEntity.status(404).body(
                    "Aucune fiche chauffeur ne correspond au compte connecte."
            );
        }

        Reservation mission = reservationRepository
                .findByIdForUpdate(id)
                .orElse(null);

        if (mission == null) {
            return ResponseEntity.status(404).body("Mission introuvable.");
        }

        if (mission.getChauffeur() == null
                || !Objects.equals(mission.getChauffeur().getId(), chauffeur.getId())) {
            return ResponseEntity.status(403).body(
                    "Vous ne pouvez cloturer que les missions qui vous sont affectees."
            );
        }

        if (!"VALIDEE".equalsIgnoreCase(mission.getStatut())) {
            return ResponseEntity.status(409).body(
                    "Cette mission ne peut pas etre cloturee. Statut actuel : "
                            + mission.getStatut()
            );
        }

        if (mission.getVehicule() == null) {
            return ResponseEntity.status(409).body(
                    "Cette mission ne possede aucun vehicule affecte."
            );
        }

        mission.setStatut("CLOTUREE");
        Reservation sauvegardee = reservationRepository.saveAndFlush(mission);

        // Les notifications sont enregistrees dans la MEME transaction que
        // la cloture. Une erreur de creation fait annuler l'ensemble :
        // le chauffeur ne recoit pas un faux succes de cloture sans notification.
        String numeroTicket = "TKT-" + String.format("%05d", sauvegardee.getId());
        String immatriculation = sauvegardee.getVehicule().getImmatriculation();
        String nomComplet = (Objects.toString(chauffeur.getPrenom(), "") + " "
                + Objects.toString(chauffeur.getNom(), "")).trim();
        String chauffeurAffiche = nomComplet.isBlank()
                ? chauffeur.getMatricule() : nomComplet;

        for (Utilisateur destinataire : utilisateurRepository.findAll()) {
            if (destinataire.getRole() == null
                    || !"AGENT_FLOTTE".equalsIgnoreCase(destinataire.getRole().trim())
                    || !destinataire.isActif()) {
                continue;
            }

            notificationService.creerPourUtilisateur(
                    destinataire,
                    "MISSION_CLOTUREE",
                    "INFO",
                    "Mission cloturee par un chauffeur",
                    "Le chauffeur " + chauffeurAffiche + " a cloture " + numeroTicket
                            + " (vehicule " + immatriculation + ").",
                    "/agent-flotte",
                    sauvegardee.getId(),
                    null,
                    sauvegardee.getVehicule().getId(),
                    false // Notification dans l'application, pas d'email non demande.
            );
        }

        return ResponseEntity.ok(sauvegardee);
    }

    // =========================================================
    // ALERTES ENTRETIEN PERIODIQUE DU CHAUFFEUR
    // =========================================================

    /**
     * Retourne uniquement les entretiens périodiques arrivés à échéance
     * pour les véhicules présents dans les tickets du chauffeur connecté.
     *
     * IMPORTANT :
     * - ce n'est PAS une demande d'entretien créée par le chauffeur ;
     * - l'alerte est générée automatiquement par le suivi des 5 000 km ;
     * - le même dossier Maintenance est visible par le Chef du Service
     *   Logistique et le mécanicien DID.
     */
    @GetMapping("/alertes-entretien-periodique")
    @Transactional(readOnly = true)
    public ResponseEntity<?> alertesEntretienPeriodique(
            Authentication authentication
    ) {

        Chauffeur chauffeur =
                chauffeurCourant(
                        authentication
                );

        if (chauffeur == null) {

            return ResponseEntity
                    .status(404)
                    .body(
                            "Aucune fiche chauffeur ne correspond au matricule de l'utilisateur connecté."
                    );
        }

        List<Reservation> tickets =
                reservationRepository
                        .findByChauffeurIdOrderByDateDebutDesc(
                                chauffeur.getId()
                        );

        Map<Long, Vehicule> vehicules =
                new LinkedHashMap<>();

        for (Reservation ticket : tickets) {

            if (ticket != null
                    && ticket.getVehicule() != null
                    && ticket.getVehicule().getId() != null) {

                vehicules.put(
                        ticket.getVehicule().getId(),
                        ticket.getVehicule()
                );
            }
        }

        List<Map<String, Object>> alertes =
                vehicules
                        .values()
                        .stream()
                        .map(
                                vehicule ->
                                        entretienPeriodiqueService
                                                .trouverParVehicule(
                                                        vehicule.getId()
                                                )
                        )
                        .filter(
                                suivi ->
                                        suivi != null
                        )
                        .map(
                                entretienPeriodiqueService::resume
                        )
                        .filter(
                                resume -> {

                                    Object valeurStatut =
                                            resume.get(
                                                    "statut"
                                            );

                                    String statut =
                                            valeurStatut != null
                                                    ? valeurStatut
                                                    .toString()
                                                    .trim()
                                                    .toUpperCase(
                                                            Locale.ROOT
                                                    )
                                                    : "";

                                    return "A_FAIRE".equals(
                                            statut
                                    )
                                            || "ENTRETIEN_OUVERT".equals(
                                            statut
                                    );
                                }
                        )
                        .toList();

        return ResponseEntity.ok(
                alertes
        );
    }

    // =========================================================
    // MES CONSOMMATIONS
    // =========================================================

    @GetMapping("/consommations")
    public ResponseEntity<?> consommations(
            Authentication authentication
    ) {

        Chauffeur chauffeur =
                chauffeurCourant(
                        authentication
                );

        if (chauffeur == null) {

            return ResponseEntity
                    .status(404)
                    .body(
                            "Aucune fiche chauffeur ne correspond au matricule de l'utilisateur connecté."
                    );
        }

        List<TransactionCarburant> consommations =
                transactionCarburantRepository
                        .findByChauffeurIdOrderByDateOperationDesc(
                                chauffeur.getId()
                        );

        return ResponseEntity.ok(
                consommations
        );
    }

    // =========================================================
    // DECLARER UNE CONSOMMATION
    // =========================================================

    @PostMapping("/consommations")
    @Transactional
    public ResponseEntity<?> declarerConsommation(
            @RequestBody CreateConsommationChauffeurRequest request,
            Authentication authentication
    ) {

        Chauffeur chauffeur =
                chauffeurCourant(
                        authentication
                );

        if (chauffeur == null) {

            return ResponseEntity
                    .status(404)
                    .body(
                            "Aucune fiche chauffeur ne correspond au matricule de l'utilisateur connecté."
                    );
        }

        if (request == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Les informations de consommation sont obligatoires."
                    );
        }

        if (request.getReservationId() == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le ticket est obligatoire."
                    );
        }

        if (request.getQuantiteLitres() == null
                || request.getQuantiteLitres() <= 0) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La quantité doit être supérieure à 0."
                    );
        }

        if (request.getDateOperation() == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La date de consommation est obligatoire."
                    );
        }

        if (request.getPrixUnitaire() != null
                && request.getPrixUnitaire() < 0) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le prix unitaire ne peut pas être négatif."
                    );
        }

        /*
         * Le dernier kilométrage compteur est désormais obligatoire :
         * il alimente automatiquement le suivi périodique
         * tous les 5 000 km.
         */
        if (request.getKilometrage() == null
                || request.getKilometrage() < 0) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le dernier kilométrage compteur est obligatoire."
                    );
        }

        if (request.getJustificatif() == null
                || request.getJustificatif().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La référence du justificatif est obligatoire."
                    );
        }

        Reservation reservation =
                reservationRepository
                        .findById(
                                request.getReservationId()
                        )
                        .orElse(null);

        if (reservation == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Ticket introuvable."
                    );
        }

        if (reservation.getChauffeur() == null
                || !chauffeur
                .getId()
                .equals(
                        reservation
                                .getChauffeur()
                                .getId()
                )) {

            return ResponseEntity
                    .status(403)
                    .body(
                            "Ce ticket n'est pas affecté au chauffeur connecté."
                    );
        }

        if (!"VALIDEE".equalsIgnoreCase(
                reservation.getStatut()
        )) {

            return ResponseEntity
                    .status(409)
                    .body(
                            "La consommation ne peut être déclarée que pour un ticket validé. "
                                    + "Statut actuel : "
                                    + reservation.getStatut()
                    );
        }

        if (reservation.getVehicule() == null) {

            return ResponseEntity
                    .status(409)
                    .body(
                            "Aucun véhicule n'est affecté à ce ticket."
                    );
        }

        LocalDate dateDebut =
                reservation
                        .getDateDebut()
                        .toLocalDate();

        LocalDate dateFin =
                reservation
                        .getDateFin()
                        .toLocalDate();

        if (request
                .getDateOperation()
                .isBefore(
                        dateDebut
                )
                || request
                .getDateOperation()
                .isAfter(
                        dateFin
                )) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La date de consommation doit être comprise dans la période du ticket."
                    );
        }

        /*
         * Avant d'enregistrer la consommation, on contrôle
         * et met à jour le kilométrage périodique.
         *
         * Si le seuil des 5 000 km est atteint, un dossier
         * Maintenance est créé automatiquement et devient
         * visible par le DID et le Chef Service Logistique.
         */
        try {

            entretienPeriodiqueService
                    .enregistrerKilometrage(
                            reservation.getVehicule(),
                            request.getKilometrage().doubleValue()
                    );

        } catch (IllegalArgumentException e) {
            // Propager l'exception: le service transactionnel a pu marquer
            // la transaction pour annulation. Ne pas retourner simplement 400.
            System.err.println("CONSOMMATION : kilométrage rejeté : " + e.getMessage());
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Kilométrage refusé : " + e.getMessage(),
                    e
            );
        }

        TransactionCarburant transaction =
                new TransactionCarburant();

        transaction.setVehicule(
                reservation.getVehicule()
        );

        transaction.setChauffeur(
                chauffeur
        );

        transaction.setReservation(
                reservation
        );

        transaction.setType(
                TypeOperationCarburant.CONSOMMATION
        );

        transaction.setQuantiteLitres(
                request.getQuantiteLitres()
        );

        transaction.setDateOperation(
                request.getDateOperation()
        );

        transaction.setPrixUnitaire(
                request.getPrixUnitaire()
        );

        if (request.getPrixUnitaire() != null) {

            transaction.setMontantTotal(
                    request.getQuantiteLitres()
                            * request.getPrixUnitaire()
            );

        } else {

            transaction.setMontantTotal(
                    null
            );
        }

        transaction.setKilometrage(
                request.getKilometrage()
        );

        transaction.setStation(
                nettoyer(
                        request.getStation()
                )
        );

        transaction.setJustificatif(
                request
                        .getJustificatif()
                        .trim()
        );

        transaction.setObservation(
                nettoyer(
                        request.getObservation()
                )
        );

        /*
         * Le nom technique "mission" est conservé dans la base
         * pour compatibilité, mais la valeur affichée est un TKT.
         */
        transaction.setMission(
                construireLibelleTicket(
                        reservation
                )
        );

        if (chauffeur.getEmail() != null
                && !chauffeur.getEmail().isBlank()) {

            transaction.setAgentEmail(
                    chauffeur
                            .getEmail()
                            .trim()
            );

        } else {

            transaction.setAgentEmail(
                    authentication.getName()
            );
        }

        TransactionCarburant sauvegardee =
                transactionCarburantRepository
                        .save(
                                transaction
                        );

        /*
         * La consommation est directement consultable dans /api/carburant
         * par le Chef du Service Logistique. Une notification en cloche
         * est egalement creee automatiquement apres l'enregistrement.
         * L'echec de la cloche ne doit pas annuler la declaration.
         */
        try {
            String numeroTicket = "TKT-" + String.format("%05d", reservation.getId());
            String immatriculation = reservation.getVehicule().getImmatriculation();
            var notifications = notificationService.creerPourRole(
                    "CHEF_SERVICE_LOGISTIQUE",
                    "CONSOMMATION_CARBURANT",
                    "INFO",
                    "Nouvelle consommation carburant",
                    "Le chauffeur " + chauffeur.getMatricule()
                            + " a declare " + request.getQuantiteLitres() + " L pour le ticket "
                            + numeroTicket + " (vehicule " + immatriculation + ").",
                    "/chef-service-logistique",
                    reservation.getId(),
                    null,
                    reservation.getVehicule().getId(),
                    true
            );
            System.out.println("CONSOMMATION " + numeroTicket + " -> "
                    + notifications.size() + " notification(s) au Chef du Service Logistique.");
        } catch (Exception e) {
            System.err.println("Consommation enregistree, notification logistique impossible : "
                    + e.getMessage());
        }

        return ResponseEntity.ok(
                sauvegardee
        );
    }

    // =========================================================
    // MES SIGNALEMENTS ENTRETIEN
    // =========================================================

    @GetMapping("/signalements-entretien")
    @Transactional(readOnly = true)
    public ResponseEntity<?> mesSignalementsEntretien(
            Authentication authentication
    ) {

        Chauffeur chauffeur =
                chauffeurCourant(
                        authentication
                );

        if (chauffeur == null) {

            return ResponseEntity
                    .status(404)
                    .body(
                            "Aucune fiche chauffeur ne correspond au matricule de l'utilisateur connecté."
                    );
        }

        List<Map<String, Object>> response =
                signalementRepository
                        .findByChauffeurIdOrderByDateSignalementDesc(
                                chauffeur.getId()
                        )
                        .stream()
                        .map(
                                this::signalementVersMap
                        )
                        .toList();

        return ResponseEntity.ok(
                response
        );
    }

    // =========================================================
    // SIGNALER UN ENTRETIEN CONSTATE PAR LE CHAUFFEUR
    // =========================================================

    @PostMapping("/signalements-entretien")
    @Transactional
    public ResponseEntity<?> signalerEntretien(
            @RequestBody CreateSignalementEntretienChauffeurRequest request,
            Authentication authentication
    ) {

        Chauffeur chauffeur =
                chauffeurCourant(
                        authentication
                );

        if (chauffeur == null) {

            return ResponseEntity
                    .status(404)
                    .body(
                            "Aucune fiche chauffeur ne correspond au matricule de l'utilisateur connecté."
                    );
        }

        if (request == null
                || request.getReservationId() == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le ticket concerné est obligatoire."
                    );
        }

        Reservation ticket =
                reservationRepository
                        .findById(
                                request.getReservationId()
                        )
                        .orElse(null);

        if (ticket == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Ticket introuvable."
                    );
        }

        if (ticket.getChauffeur() == null
                || !chauffeur
                .getId()
                .equals(
                        ticket
                                .getChauffeur()
                                .getId()
                )) {

            return ResponseEntity
                    .status(403)
                    .body(
                            "Ce ticket n'est pas affecté au chauffeur connecté."
                    );
        }

        if (!"VALIDEE".equalsIgnoreCase(
                ticket.getStatut()
        )) {

            return ResponseEntity
                    .status(409)
                    .body(
                            "Un signalement chauffeur doit être rattaché à un ticket validé."
                    );
        }

        Vehicule vehicule =
                ticket.getVehicule();

        if (vehicule == null) {

            return ResponseEntity
                    .status(409)
                    .body(
                            "Aucun véhicule n'est affecté à ce ticket."
                    );
        }

        if (request.getVehiculeId() != null
                && !request
                .getVehiculeId()
                .equals(
                        vehicule.getId()
                )) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le véhicule transmis ne correspond pas au véhicule du ticket."
                    );
        }

        String typeProbleme =
                normaliserTypeProbleme(
                        request.getTypeProbleme()
                );

        if (typeProbleme == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le type de problème est obligatoire."
                    );
        }

        String description =
                nettoyer(
                        request.getDescriptionSignalement()
                );

        if (description == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La description de l'anomalie est obligatoire."
                    );
        }

        String niveau =
                normaliserNiveau(
                        request.getNiveauUrgence()
                );

        if (niveau == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le niveau doit être NORMAL, IMPORTANT ou URGENT."
                    );
        }

        if (request.getKilometrageSignale() != null
                && request.getKilometrageSignale() < 0) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le kilométrage signalé est invalide."
                    );
        }

        /*
         * Si le chauffeur renseigne le compteur pendant son
         * signalement, cette valeur alimente également le
         * suivi périodique des 5 000 km.
         */
        if (request.getKilometrageSignale() != null) {

            try {

                entretienPeriodiqueService
                        .enregistrerKilometrage(
                                vehicule,
                                request.getKilometrageSignale()
                        );

            } catch (IllegalArgumentException e) {
                // Propager l'exception: le service transactionnel a pu marquer
                // la transaction pour annulation. Ne pas retourner simplement 400.
                System.err.println("SIGNALEMENT ENTRETIEN : kilométrage rejeté : " + e.getMessage());
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Kilométrage refusé : " + e.getMessage(),
                        e
                );
            }
        }

        Maintenance maintenance =
                new Maintenance();

        maintenance.setReservation(
                ticket
        );

        maintenance.setVehicule(
                vehicule
        );

        maintenance.setNatureIntervention(
                construireNatureSignalement(
                        ticket,
                        typeProbleme,
                        niveau,
                        request.getKilometrageSignale(),
                        description
                )
        );

        /*
         * MaintenanceService.creer() utilise le circuit
         * Maintenance déjà en place :
         * EN_ATTENTE_VALIDATION_ENTRETIEN -> Chef -> mécanicien DID.
         */
        Maintenance maintenanceSauvegardee =
                maintenanceService.creerDemandeEntretien(
                        maintenance,
                        "CHAUFFEUR",
                        authentication.getName()
                );

        SignalementEntretienChauffeur signalement =
                new SignalementEntretienChauffeur();

        signalement.setMaintenance(
                maintenanceSauvegardee
        );

        signalement.setReservation(
                ticket
        );

        signalement.setVehicule(
                vehicule
        );

        signalement.setChauffeur(
                chauffeur
        );

        signalement.setTypeProbleme(
                typeProbleme
        );

        signalement.setDescriptionSignalement(
                description
        );

        signalement.setNiveauUrgence(
                niveau
        );

        signalement.setKilometrageSignale(
                request.getKilometrageSignale()
        );

        SignalementEntretienChauffeur sauvegarde =
                signalementRepository
                        .save(
                                signalement
                        );

        return ResponseEntity.ok(
                signalementVersMap(
                        sauvegarde
                )
        );
    }

    // =========================================================
    // OUTILS
    // =========================================================

    private Map<String, Object> signalementVersMap(
            SignalementEntretienChauffeur signalement
    ) {

        Map<String, Object> response =
                new LinkedHashMap<>();

        response.put(
                "id",
                signalement.getId()
        );

        response.put(
                "typeProbleme",
                signalement.getTypeProbleme()
        );

        response.put(
                "descriptionSignalement",
                signalement.getDescriptionSignalement()
        );

        response.put(
                "niveauUrgence",
                signalement.getNiveauUrgence()
        );

        response.put(
                "kilometrageSignale",
                signalement.getKilometrageSignale()
        );

        response.put(
                "dateSignalement",
                signalement.getDateSignalement()
        );

        Maintenance maintenance =
                signalement.getMaintenance();

        response.put(
                "statut",
                maintenance != null
                        ? String.valueOf(
                        maintenance.getStatut()
                )
                        : "EN_ATTENTE_VALIDATION_ENTRETIEN"
        );

        if (maintenance != null) {

            response.put(
                    "maintenanceId",
                    maintenance.getId()
            );
        }

        Reservation ticket =
                signalement.getReservation();

        Map<String, Object> ticketMap =
                new LinkedHashMap<>();

        if (ticket != null) {

            ticketMap.put(
                    "id",
                    ticket.getId()
            );

            ticketMap.put(
                    "motif",
                    ticket.getMotif()
            );

            ticketMap.put(
                    "destination",
                    ticket.getDestination()
            );

            ticketMap.put(
                    "statut",
                    ticket.getStatut()
            );
        }

        response.put(
                "reservation",
                ticketMap
        );

        Vehicule vehicule =
                signalement.getVehicule();

        Map<String, Object> vehiculeMap =
                new LinkedHashMap<>();

        if (vehicule != null) {

            vehiculeMap.put(
                    "id",
                    vehicule.getId()
            );

            vehiculeMap.put(
                    "immatriculation",
                    vehicule.getImmatriculation()
            );

            vehiculeMap.put(
                    "modeleType",
                    vehicule.getModeleType()
            );

            vehiculeMap.put(
                    "categorie",
                    vehicule.getCategorie()
            );
        }

        response.put(
                "vehicule",
                vehiculeMap
        );

        return response;
    }

    private String construireNatureSignalement(
            Reservation ticket,
            String typeProbleme,
            String niveau,
            Double kilometrage,
            String description
    ) {

        StringBuilder nature =
                new StringBuilder();

        nature
                .append(
                        PREFIXE_SIGNALEMENT_CHAUFFEUR
                )
                .append(
                        " "
                )
                .append(
                        typeProbleme
                )
                .append(
                        " | niveau : "
                )
                .append(
                        niveau
                )
                .append(
                        " | "
                )
                .append(
                        numeroTicket(
                                ticket
                        )
                );

        if (kilometrage != null) {

            nature
                    .append(
                            " | compteur : "
                    )
                    .append(
                            kilometrage.longValue()
                    )
                    .append(
                            " km"
                    );
        }

        nature
                .append(
                        " | "
                )
                .append(
                        description
                );

        return nature.toString();
    }

    private String normaliserTypeProbleme(
            String valeur
    ) {

        String nettoye =
                nettoyer(
                        valeur
                );

        if (nettoye == null) {
            return null;
        }

        return nettoye
                .toUpperCase(
                        Locale.ROOT
                );
    }

    private String normaliserNiveau(
            String valeur
    ) {

        String niveau =
                valeur == null
                        ? "NORMAL"
                        : valeur
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        );

        if (!List.of(
                "NORMAL",
                "IMPORTANT",
                "URGENT"
        ).contains(
                niveau
        )) {

            return null;
        }

        return niveau;
    }

    private String nettoyer(
            String valeur
    ) {

        if (valeur == null
                || valeur.isBlank()) {

            return null;
        }

        return valeur.trim();
    }

    private String numeroTicket(
            Reservation reservation
    ) {

        return "TKT-"
                + String.format(
                "%05d",
                reservation.getId()
        );
    }

    private String construireLibelleTicket(
            Reservation reservation
    ) {

        String numero =
                numeroTicket(
                        reservation
                );

        String motif =
                reservation.getMotif() != null
                        ? reservation
                        .getMotif()
                        .trim()
                        : "";

        String destination =
                reservation.getDestination() != null
                        ? reservation
                        .getDestination()
                        .trim()
                        : "";

        String details =
                motif;

        if (!destination.isBlank()) {

            details =
                    details.isBlank()
                            ? destination
                            : details
                            + " - "
                            + destination;
        }

        return details.isBlank()
                ? numero
                : numero
                + " - "
                + details;
    }
}
