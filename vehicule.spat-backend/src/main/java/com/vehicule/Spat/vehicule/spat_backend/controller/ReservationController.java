
        package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.CreateReservationRequest;
import com.vehicule.Spat.vehicule.spat_backend.dto.DecisionReservationRequest;
import com.vehicule.Spat.vehicule.spat_backend.dto.DisponibiliteReservationResponse;

import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;
import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.model.Maintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;

import com.vehicule.Spat.vehicule.spat_backend.repository.ChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;

import com.vehicule.Spat.vehicule.spat_backend.service.ChauffeurAutoService;
import com.vehicule.Spat.vehicule.spat_backend.service.DisponibiliteReservationService;
import com.vehicule.Spat.vehicule.spat_backend.service.MaintenanceService;
import com.vehicule.Spat.vehicule.spat_backend.service.NotificationService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Comparator;
import java.util.Locale;
import java.util.Map;

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


    public ReservationController(
            ReservationRepository reservationRepository,
            VehiculeRepository vehiculeRepository,
            ChauffeurRepository chauffeurRepository,
            ChauffeurAutoService chauffeurAutoService,
            UtilisateurRepository utilisateurRepository,
            DisponibiliteReservationService disponibiliteReservationService,
            MaintenanceService maintenanceService,
            NotificationService notificationService
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

        if (request.getDemandeurMatricule() == null
                || request.getDemandeurMatricule().isBlank()) {

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

        if (request.getDemandeurTelephone() == null
                || request.getDemandeurTelephone().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le téléphone du bénéficiaire est obligatoire"
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
        // IMPORTANT :
        // Le demandeur ne choisit ni véhicule ni chauffeur.
        //
        // La disponibilité et l'affectation sont réalisées
        // ensuite par le Chef du Service Logistique via
        // le circuit de décision / validation niveau 1.
        //
        // vehiculeId éventuellement reçu est volontairement
        // ignoré ici pour préserver la règle métier.

        // -----------------------------------------------------
        // 7. REGLE 24 H
        // UNIQUEMENT HORS TOAMASINA
        // -----------------------------------------------------

        boolean horsDelai24h =
                missionHorsToamasina
                        &&
                        request
                                .getDateDebut()
                                .isBefore(
                                        maintenant.plusHours(24)
                                );

        boolean urgenceOperationnelle =
                Boolean.TRUE.equals(
                        request.getDemandeUrgente()
                );

        String typeDemande;

        if (urgenceOperationnelle) {

            typeDemande =
                    "URGENTE";

        } else if (horsDelai24h) {

            typeDemande =
                    "TARDIVE";

        } else {

            typeDemande =
                    "PLANIFIEE";
        }

        if (!"PLANIFIEE".equals(typeDemande)
                &&
                (
                        request.getMotifUrgence() == null
                                ||
                                request.getMotifUrgence().isBlank()
                )) {

            if (urgenceOperationnelle) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                "Le motif de l'urgence est obligatoire."
                        );

            } else {

                return ResponseEntity
                        .badRequest()
                        .body(
                                "La mission hors Toamasina est créée à moins de 24 heures du départ. "
                                        + "Veuillez justifier cette demande tardive."
                        );
            }
        }

        // -----------------------------------------------------
        // 8. CREATION DU TICKET
        // -----------------------------------------------------

        Reservation reservation =
                new Reservation();

        /*
         * IMPORTANT :
         * aucune ressource n'est affectée à ce stade.
         *
         * Le Chef du Service Logistique vérifiera ensuite
         * les disponibilités et choisira le véhicule ainsi
         * que le chauffeur.
         */
        reservation.setVehicule(
                null
        );

        reservation.setChauffeur(
                null
        );

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

        reservation.setMotifUrgence(
                !"PLANIFIEE".equals(
                        typeDemande
                )
                        ? request
                        .getMotifUrgence()
                        .trim()
                        : null
        );

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

        reservation.setDemandeurMatricule(
                request
                        .getDemandeurMatricule()
                        .trim()
        );

        reservation.setDemandeurEntite(
                request
                        .getDemandeurEntite()
                        .trim()
        );

        reservation.setDemandeurTelephone(
                request
                        .getDemandeurTelephone()
                        .trim()
        );

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
                request.getTypeVehiculeSouhaite() != null
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
        reservation.setBesoinChauffeur(
                request.getBesoinChauffeur() == null
                        ? true
                        : request.getBesoinChauffeur()
        );

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

        // -----------------------------------------------------
        // 9. NOTIFIER LE CHEF DU SERVICE LOGISTIQUE
        // -----------------------------------------------------
        //
        // Une seule création métier = une notification pour
        // chaque utilisateur actif ayant le rôle
        // CHEF_SERVICE_LOGISTIQUE.
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

            var notificationsCreees =
                    notificationService.creerPourRole(
                            "CHEF_SERVICE_LOGISTIQUE",
                            "TICKET",
                            "IMPORTANT",
                            "Nouveau ticket à traiter",
                            ticket
                                    + " — "
                                    + beneficiaire
                                    + " — destination : "
                                    + destination,
                            "/chef-service-logistique",
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
                            + " notification(s) créée(s) pour CHEF_SERVICE_LOGISTIQUE"
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

        if (statut != null
                && !statut.isBlank()) {

            return reservationRepository
                    .findByStatutOrderByDateCreationDesc(
                            statut
                                    .trim()
                                    .toUpperCase(
                                            Locale.ROOT
                                    )
                    );
        }


        return reservationRepository
                .findAllByOrderByDateCreationDesc();
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

    @GetMapping("/{id}/disponibilites")
    public ResponseEntity<?> disponibilitesReservation(
            @PathVariable Long id
    ) {

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
    // Le chauffeur transmis par l'interface et l'ancien chauffeur du ticket
    // ne sont jamais des choix imposés au système.
    private Chauffeur choisirChauffeurCompatiblePourTicket(Reservation ticket, Vehicule vehicule) {
        // Verifier les candidats les uns apres les autres : un premier candidat devenu
        // indisponible ne doit pas faire echouer la recherche d'un suivant eligible.
        for (Chauffeur candidat : chauffeurAutoService.trouverChauffeursCompatiblesDisponibles(
                vehicule, ticket.getDateDebut(), ticket.getDateFin(), ticket.getId())) {
            Chauffeur verrouille = chauffeurRepository.findByIdForUpdate(candidat.getId()).orElse(null);
            if (verrouille != null
                    && chauffeurAutoService.estCompatible(vehicule, verrouille)
                    && disponibiliteReservationService.estChauffeurDisponiblePourPeriode(
                    verrouille.getId(), ticket.getDateDebut(), ticket.getDateFin(), ticket.getId())) {
                return verrouille;
            }
        }
        return null;
    }

    private String expliquerAffectationImpossible(Reservation ticket, Vehicule vehicule) {
        return chauffeurAutoService.expliquerAbsenceDeChauffeur(
                vehicule, ticket.getDateDebut(), ticket.getDateFin(), ticket.getId());
    }

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
        if (!disponibiliteReservationService.estVehiculeDisponiblePourPeriode(
                nouveau.getId(), reservation.getDateDebut(), reservation.getDateFin(), reservation.getId())) {
            return ResponseEntity.status(409).body("Véhicule déjà réservé ou indisponible pour la période du ticket.");
        }

        Chauffeur chauffeur = null;
        if (Boolean.TRUE.equals(reservation.getBesoinChauffeur())) {
            chauffeur = choisirChauffeurCompatiblePourTicket(reservation, nouveau);
            if (chauffeur == null) {
                return ResponseEntity.status(409).body(
                        expliquerAffectationImpossible(reservation, nouveau));
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


        // À chaque premier choix, le backend désigne lui-même le chauffeur.
        // L'identifiant chauffeur éventuellement envoyé par un ancien frontend est ignoré.
        Chauffeur chauffeur = null;
        if (Boolean.TRUE.equals(reservation.getBesoinChauffeur())) {
            chauffeur = choisirChauffeurCompatiblePourTicket(reservation, vehicule);
            if (chauffeur == null) {
                return ResponseEntity.status(409).body(
                        expliquerAffectationImpossible(reservation, vehicule));
            }
        }

        reservation.setVehicule(
                vehicule
        );


        reservation.setChauffeur(
                chauffeur
        );


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
        // L'alerte n'est plus affichée dans une boîte locale
        // sur la page du mécanicien : elle passe par le centre
        // de notifications commun (cloche + badge + email).
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
                            "Nouvel avis DID à traiter",
                            ticket
                                    + " — "
                                    + immatriculation
                                    + " — contrôle technique requis avant validation.",
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
        if (dernierControle == null || dernierControle.getVehicule() == null ||
                !vehicule.getId().equals(dernierControle.getVehicule().getId()) ||
                avisDidDefavorable(dernierControle) ||
                !"FAVORABLE".equalsIgnoreCase(dernierControle.getDecisionDID())) {
            return ResponseEntity.status(409).body(
                    "Validation N°1 impossible : le véhicule choisi doit avoir reçu le dernier avis DID favorable du ticket.");
        }

        Chauffeur chauffeur = null;
        if (Boolean.TRUE.equals(reservation.getBesoinChauffeur())) {
            // Le chauffeur est normalement déjà enregistré au choix du véhicule.
            // Ne jamais reprendre un ancien chauffeur incompatible ou un id fourni par le navigateur.
            boolean memeVehicule = reservation.getVehicule() != null &&
                    vehicule.getId().equals(reservation.getVehicule().getId());
            Chauffeur dejaAffecte = memeVehicule ? reservation.getChauffeur() : null;
            if (dejaAffecte != null &&
                    chauffeurAutoService.estCompatible(vehicule, dejaAffecte) &&
                    disponibiliteReservationService.estChauffeurDisponiblePourPeriode(
                            dejaAffecte.getId(), reservation.getDateDebut(),
                            reservation.getDateFin(), reservation.getId())) {
                chauffeur = dejaAffecte;
            } else {
                chauffeur = choisirChauffeurCompatiblePourTicket(reservation, vehicule);
            }
            if (chauffeur == null) {
                return ResponseEntity.status(409).body(
                        expliquerAffectationImpossible(reservation, vehicule));
            }
        }

        reservation.setVehicule(
                vehicule
        );


        reservation.setChauffeur(
                chauffeur
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

            var notificationsDgal = notificationService.creerPourRole(
                    "CHEF_DGAL",
                    "TICKET",
                    "IMPORTANT",
                    "Ticket à valider au niveau 2",
                    "Le ticket " + numeroTicket
                            + " a été validé au niveau 1 et attend votre validation au niveau 2.",
                    "/chef-dgal",
                    ticketId,
                    null,
                    vehiculeId,
                    true
            );
            System.out.println("NOTIFICATION CHEF_DGAL -> " + numeroTicket
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


        reservation.setStatut(
                "VALIDEE"
        );


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


        return ResponseEntity.ok(
                reservationSauvegardee
        );
    }
}
