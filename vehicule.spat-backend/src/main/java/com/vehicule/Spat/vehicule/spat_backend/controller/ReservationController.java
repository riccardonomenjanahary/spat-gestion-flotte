package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.CreateReservationRequest;
import com.vehicule.Spat.vehicule.spat_backend.dto.DecisionReservationRequest;
import com.vehicule.Spat.vehicule.spat_backend.dto.DisponibiliteReservationResponse;

import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;
import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;

import com.vehicule.Spat.vehicule.spat_backend.repository.ChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;

import com.vehicule.Spat.vehicule.spat_backend.service.DisponibiliteReservationService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

// =========================================================
// CONTROLLER RESERVATIONS
// =========================================================

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationRepository reservationRepository;

    private final VehiculeRepository vehiculeRepository;

    private final ChauffeurRepository chauffeurRepository;

    private final UtilisateurRepository utilisateurRepository;

    private final DisponibiliteReservationService disponibiliteReservationService;

    // =====================================================
    // CONSTRUCTEUR
    // =====================================================

    public ReservationController(
            ReservationRepository reservationRepository,
            VehiculeRepository vehiculeRepository,
            ChauffeurRepository chauffeurRepository,
            UtilisateurRepository utilisateurRepository,
            DisponibiliteReservationService disponibiliteReservationService
    ) {
        this.reservationRepository = reservationRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.disponibiliteReservationService =
                disponibiliteReservationService;
    }

    // =========================================================
    // UTILISATEUR CONNECTE
    // =========================================================

    /**
     * Spring Security utilise actuellement
     * le matricule comme identifiant utilisateur.
     */
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

        if (matricule == null || matricule.isBlank()) {
            return null;
        }

        return utilisateurRepository
                .findByMatricule(matricule)
                .orElse(null);
    }

    // =========================================================
    // CREER UNE DEMANDE DE VEHICULE
    // =========================================================

    @PostMapping
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

        // -----------------------------------------------------
        // 3. OBJET DE LA MISSION
        // -----------------------------------------------------

        if (request.getMotif() == null
                || request.getMotif().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "L'objet de la mission est obligatoire"
                    );
        }

        // -----------------------------------------------------
        // 4. BENEFICIAIRE
        // -----------------------------------------------------

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

        // -----------------------------------------------------
        // 5. MISSION
        // -----------------------------------------------------

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

        // -----------------------------------------------------
        // 6. PASSAGERS
        // -----------------------------------------------------

        if (request.getNombrePassagers() == null
                || request.getNombrePassagers() <= 0) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le nombre de passagers doit être supérieur à 0"
                    );
        }

        // -----------------------------------------------------
        // 7. CHAUFFEUR
        // -----------------------------------------------------

        if (request.getBesoinChauffeur() == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Veuillez préciser si un chauffeur est nécessaire"
                    );
        }

        // -----------------------------------------------------
        // 8. COHERENCE DES DATES
        // -----------------------------------------------------

        if (!request
                .getDateFin()
                .isAfter(request.getDateDebut())) {

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
                .isBefore(maintenant)) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La date de départ ne peut pas être dans le passé"
                    );
        }

        // =====================================================
        // RG-01 : DEMANDE AU MOINS 24H A L'AVANCE
        // =====================================================

        boolean demandeUrgente =
                request
                        .getDateDebut()
                        .isBefore(
                                maintenant.plusHours(24)
                        );

        if (demandeUrgente
                && (
                request.getMotifUrgence() == null
                        || request.getMotifUrgence().isBlank()
        )) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La demande est soumise à moins de 24 heures du départ. "
                                    + "Un motif d'urgence est obligatoire."
                    );
        }

        // =====================================================
        // CREATION
        // =====================================================

        Reservation reservation =
                new Reservation();

        // Aucun véhicule ni chauffeur à la création.
        reservation.setVehicule(null);
        reservation.setChauffeur(null);

        reservation.setDemandeur(
                utilisateurConnecte
        );

        reservation.setDateDebut(
                request.getDateDebut()
        );

        reservation.setDateFin(
                request.getDateFin()
        );

        reservation.setMotif(
                request.getMotif().trim()
        );

        reservation.setDemandeUrgente(
                demandeUrgente
        );

        reservation.setMotifUrgence(
                demandeUrgente
                        ? request
                        .getMotifUrgence()
                        .trim()
                        : null
        );

        // -----------------------------------------------------
        // BENEFICIAIRE
        // -----------------------------------------------------

        reservation.setDemandeurNom(
                request.getDemandeurNom().trim()
        );

        reservation.setDemandeurPrenom(
                request.getDemandeurPrenom().trim()
        );

        reservation.setDemandeurMatricule(
                request.getDemandeurMatricule().trim()
        );

        reservation.setDemandeurEntite(
                request.getDemandeurEntite().trim()
        );

        reservation.setDemandeurTelephone(
                request.getDemandeurTelephone().trim()
        );

        // -----------------------------------------------------
        // MISSION
        // -----------------------------------------------------

        reservation.setDestination(
                request.getDestination().trim()
        );

        reservation.setPointDepart(
                request.getPointDepart().trim()
        );

        reservation.setNombrePassagers(
                request.getNombrePassagers()
        );

        reservation.setListePassagers(
                request.getListePassagers() != null
                        && !request.getListePassagers().isBlank()
                        ? request.getListePassagers().trim()
                        : null
        );

        // -----------------------------------------------------
        // TYPE DE VEHICULE SOUHAITE
        // -----------------------------------------------------

        reservation.setTypeVehiculeSouhaite(
                request.getTypeVehiculeSouhaite() != null
                        && !request.getTypeVehiculeSouhaite().isBlank()
                        ? request
                        .getTypeVehiculeSouhaite()
                        .trim()
                        .toUpperCase(Locale.ROOT)
                        : null
        );

        reservation.setBesoinChauffeur(
                request.getBesoinChauffeur()
        );

        reservation.setObservations(
                request.getObservations() != null
                        && !request.getObservations().isBlank()
                        ? request.getObservations().trim()
                        : null
        );

        // -----------------------------------------------------
        // STATUT INITIAL
        // -----------------------------------------------------

        reservation.setStatut(
                "EN_ATTENTE"
        );

        reservation.setDateCreation(
                LocalDateTime.now()
        );

        // Champs de décision encore vides.
        reservation.setMotifRefus(null);
        reservation.setRefusePar(null);
        reservation.setDateRefus(null);

        reservation.setValidationN1Par(null);
        reservation.setDateValidationN1(null);

        reservation.setValidationN2Par(null);
        reservation.setDateValidationN2(null);

        Reservation reservationSauvegardee =
                reservationRepository.save(
                        reservation
                );

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
                                    .toUpperCase(Locale.ROOT)
                    );
        }

        return reservationRepository
                .findAllByOrderByDateCreationDesc();
    }

    // =========================================================
    // DISPONIBILITES
    // =========================================================

    @GetMapping("/{id}/disponibilites")
    public ResponseEntity<?> disponibilitesReservation(
            @PathVariable Long id
    ) {

        if (!reservationRepository.existsById(id)) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        try {

            DisponibiliteReservationResponse disponibilites =
                    disponibiliteReservationService
                            .calculerDisponibilites(id);

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

    // =========================================================
    // DECISION CHEF SERVICE LOGISTIQUE
    // =========================================================

    /**
     * VALIDATION NIVEAU 1
     *
     * PUT /api/reservations/{id}/decision
     *
     * {
     *   "statut": "VALIDEE_N1",
     *   "vehiculeId": 5,
     *   "chauffeurId": 8
     * }
     *
     *
     * REFUS
     *
     * {
     *   "statut": "REFUSEE",
     *   "motifRefus": "Motif du refus"
     * }
     */
    @Transactional
    @PutMapping("/{id}/decision")
    public ResponseEntity<?> deciderReservation(
            @PathVariable Long id,
            @RequestBody DecisionReservationRequest request
    ) {

        // -----------------------------------------------------
        // 1. UTILISATEUR QUI PREND LA DECISION
        // -----------------------------------------------------

        Utilisateur utilisateurDecision =
                utilisateurCourant();

        if (utilisateurDecision == null) {

            return ResponseEntity
                    .status(401)
                    .body(
                            "Utilisateur introuvable ou non authentifié"
                    );
        }

        // -----------------------------------------------------
        // 2. BODY
        // -----------------------------------------------------

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
                        .toUpperCase(Locale.ROOT);

        // -----------------------------------------------------
        // 3. STATUT AUTORISE
        // -----------------------------------------------------

        if (!"VALIDEE_N1".equals(nouveauStatut)
                && !"REFUSEE".equals(nouveauStatut)) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Statut invalide. Les valeurs autorisées sont VALIDEE_N1 ou REFUSEE."
                    );
        }

        // -----------------------------------------------------
        // 4. VERROU SUR LA RESERVATION
        // -----------------------------------------------------

        Reservation reservation =
                reservationRepository
                        .findByIdForUpdate(id)
                        .orElse(null);

        if (reservation == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        // -----------------------------------------------------
        // 5. UNE DEMANDE DEJA TRAITEE NE PEUT PLUS ETRE MODIFIEE
        // -----------------------------------------------------

        if (!"EN_ATTENTE".equalsIgnoreCase(
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

        if ("REFUSEE".equals(nouveauStatut)) {

            if (request.getMotifRefus() == null
                    || request.getMotifRefus().isBlank()) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                "Le motif du refus est obligatoire"
                        );
            }

            reservation.setVehicule(null);
            reservation.setChauffeur(null);

            reservation.setStatut(
                    "REFUSEE"
            );

            reservation.setMotifRefus(
                    request.getMotifRefus().trim()
            );

            reservation.setRefusePar(
                    utilisateurDecision
            );

            reservation.setDateRefus(
                    LocalDateTime.now()
            );

            // Nettoyage défensif des informations N1 et N2.
            reservation.setValidationN1Par(null);
            reservation.setDateValidationN1(null);
            reservation.setValidationN2Par(null);
            reservation.setDateValidationN2(null);

            Reservation reservationSauvegardee =
                    reservationRepository.save(
                            reservation
                    );

            return ResponseEntity.ok(
                    reservationSauvegardee
            );
        }

        // =====================================================
        // VALIDATION NIVEAU 1
        // =====================================================

        // -----------------------------------------------------
        // 6. VEHICULE OBLIGATOIRE
        // -----------------------------------------------------

        if (request.getVehiculeId() == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Un véhicule doit être sélectionné pour la validation niveau 1"
                    );
        }

        // -----------------------------------------------------
        // 7. VERROU VEHICULE
        // -----------------------------------------------------

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

        // -----------------------------------------------------
        // 8. RECONTROLE VEHICULE
        // -----------------------------------------------------

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

        // =====================================================
        // CHAUFFEUR
        // =====================================================

        Chauffeur chauffeur = null;

        boolean chauffeurNecessaire =
                Boolean.TRUE.equals(
                        reservation.getBesoinChauffeur()
                );

        if (chauffeurNecessaire) {

            // -------------------------------------------------
            // 9. CHAUFFEUR OBLIGATOIRE
            // -------------------------------------------------

            if (request.getChauffeurId() == null) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                "Un chauffeur doit être sélectionné pour cette demande"
                        );
            }

            // -------------------------------------------------
            // 10. VERROU CHAUFFEUR
            // -------------------------------------------------

            chauffeur =
                    chauffeurRepository
                            .findByIdForUpdate(
                                    request.getChauffeurId()
                            )
                            .orElse(null);

            if (chauffeur == null) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                "Chauffeur introuvable"
                        );
            }

            // -------------------------------------------------
            // 11. RECONTROLE CHAUFFEUR
            // -------------------------------------------------

            boolean chauffeurDisponible =
                    disponibiliteReservationService
                            .estChauffeurDisponiblePourPeriode(
                                    chauffeur.getId(),
                                    reservation.getDateDebut(),
                                    reservation.getDateFin(),
                                    reservation.getId()
                            );

            if (!chauffeurDisponible) {

                return ResponseEntity
                        .status(409)
                        .body(
                                "Ce chauffeur n'est plus disponible pour la période demandée. "
                                        + "Veuillez actualiser les disponibilités."
                        );
            }
        }

        // =====================================================
        // 12. VALIDATION N1
        // =====================================================

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

        // Aucune validation niveau 2 à ce stade.
        reservation.setValidationN2Par(null);
        reservation.setDateValidationN2(null);

        // Nettoyage défensif des données de refus.
        reservation.setMotifRefus(null);
        reservation.setRefusePar(null);
        reservation.setDateRefus(null);

        // =====================================================
        // 13. SAUVEGARDE
        // =====================================================

        Reservation reservationSauvegardee =
                reservationRepository.save(
                        reservation
                );

        return ResponseEntity.ok(
                reservationSauvegardee
        );
    }


    // =========================================================
    // VALIDATION NIVEAU 2 - CHEF DGAL
    // =========================================================

    /**
     * PUT /api/reservations/{id}/validation-n2
     *
     * Aucun véhicule ni chauffeur n'est modifié ici :
     * l'affectation a déjà été faite et tracée au niveau 1.
     *
     * Seule une demande VALIDEE_N1 peut passer à VALIDEE.
     */
    @Transactional
    @PutMapping("/{id}/validation-n2")
    public ResponseEntity<?> validerNiveau2(
            @PathVariable Long id
    ) {

        // -----------------------------------------------------
        // 1. UTILISATEUR CONNECTE
        // -----------------------------------------------------

        Utilisateur utilisateurDecision =
                utilisateurCourant();

        if (utilisateurDecision == null) {

            return ResponseEntity
                    .status(401)
                    .body(
                            "Utilisateur introuvable ou non authentifié"
                    );
        }

        // -----------------------------------------------------
        // 2. VERROU SUR LA RESERVATION
        // -----------------------------------------------------

        Reservation reservation =
                reservationRepository
                        .findByIdForUpdate(id)
                        .orElse(null);

        if (reservation == null) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        // -----------------------------------------------------
        // 3. VALIDATION N1 OBLIGATOIRE
        // -----------------------------------------------------

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

        // -----------------------------------------------------
        // 4. COHERENCE DE L'AFFECTATION N1
        // -----------------------------------------------------

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
        ) && reservation.getChauffeur() == null) {

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

        // -----------------------------------------------------
        // 5. VALIDATION NIVEAU 2
        // -----------------------------------------------------

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
                reservationRepository.save(
                        reservation
                );

        return ResponseEntity.ok(
                reservationSauvegardee
        );
    }

}
