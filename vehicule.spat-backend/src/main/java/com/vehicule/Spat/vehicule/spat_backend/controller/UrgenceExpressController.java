package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.CreateUrgenceExpressRequest;

import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;

import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;

import org.springframework.http.ResponseEntity;

import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Locale;

// =========================================================
// CONTROLLER MISSIONS URGENTES EXPRESS
// =========================================================

@RestController
@RequestMapping("/api/reservations")
public class UrgenceExpressController {

    private final ReservationRepository reservationRepository;

    private final UtilisateurRepository utilisateurRepository;


    public UrgenceExpressController(
            ReservationRepository reservationRepository,
            UtilisateurRepository utilisateurRepository
    ) {

        this.reservationRepository =
                reservationRepository;

        this.utilisateurRepository =
                utilisateurRepository;
    }

    // =====================================================
    // UTILISATEUR CONNECTE
    // =====================================================

    /**
     * Spring Security utilise actuellement
     * le matricule comme identifiant.
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

    // =====================================================
    // CREATION TICKET EXPRESS
    // =====================================================

    /**
     * POST /api/reservations/urgence-express
     *
     * Exemple :
     *
     * {
     *   "demandePar": "Direction Générale",
     *   "motif": "Récupérer le pilote à l'aéroport",
     *   "pointDepart": "SPAT",
     *   "destination": "Aéroport de Toamasina",
     *   "dateFin": "2026-09-15T15:00:00",
     *   "nombrePassagers": 1,
     *   "besoinChauffeur": true
     * }
     *
     * Si dateDebut est absente :
     * départ immédiat.
     */
    @PostMapping("/urgence-express")
    @Transactional
    public ResponseEntity<?> creerUrgenceExpress(
            @RequestBody CreateUrgenceExpressRequest request
    ) {

        // -------------------------------------------------
        // 1. UTILISATEUR CONNECTE
        // -------------------------------------------------

        Utilisateur utilisateurConnecte =
                utilisateurCourant();


        if (utilisateurConnecte == null) {

            return ResponseEntity
                    .status(401)
                    .body(
                            "Utilisateur introuvable ou non authentifié."
                    );
        }

        // -------------------------------------------------
        // 2. VERIFICATION DU BODY
        // -------------------------------------------------

        if (request == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Les informations de la mission urgente sont obligatoires."
                    );
        }

        // -------------------------------------------------
        // 3. ORIGINE DE LA DEMANDE
        // -------------------------------------------------

        if (request.getDemandePar() == null
                || request.getDemandePar().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Veuillez préciser qui demande la mission urgente."
                    );
        }

        // -------------------------------------------------
        // 4. MOTIF
        // -------------------------------------------------

        if (request.getMotif() == null
                || request.getMotif().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le motif de la mission urgente est obligatoire."
                    );
        }

        // -------------------------------------------------
        // 5. POINT DE DEPART
        // -------------------------------------------------

        if (request.getPointDepart() == null
                || request.getPointDepart().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le point de départ est obligatoire."
                    );
        }

        // -------------------------------------------------
        // 6. DESTINATION
        // -------------------------------------------------

        if (request.getDestination() == null
                || request.getDestination().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La destination est obligatoire."
                    );
        }

        // -------------------------------------------------
        // 7. PASSAGERS
        // -------------------------------------------------

        if (request.getNombrePassagers() == null
                || request.getNombrePassagers() <= 0) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le nombre de passagers doit être supérieur à 0."
                    );
        }

        // =================================================
        // 8. DATES
        // =================================================

        LocalDateTime maintenant =
                LocalDateTime.now();


        /*
         * Si aucune date de départ n'est envoyée,
         * on considère que la mission démarre immédiatement.
         */
        LocalDateTime dateDebut =
                request.getDateDebut() != null
                        ? request.getDateDebut()
                        : maintenant;


        /*
         * Petite tolérance de 5 minutes.
         *
         * Exemple :
         * le responsable choisit 11:30,
         * finit de saisir à 11:32,
         * le backend ne doit pas rejeter inutilement
         * la mission urgente.
         */
        if (dateDebut.isBefore(
                maintenant.minusMinutes(5)
        )) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La date de départ de la mission urgente ne peut pas être dans le passé."
                    );
        }


        if (request.getDateFin() == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "L'heure de retour estimée est obligatoire."
                    );
        }


        if (!request
                .getDateFin()
                .isAfter(
                        dateDebut
                )) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "L'heure de retour estimée doit être après l'heure de départ."
                    );
        }

        // =================================================
        // 9. DELAI DES 24H
        // =================================================

        /*
         * On conserve cette information pour les statistiques
         * et la traçabilité.
         *
         * Une mission EXPRESS reste URGENTE même si elle est
         * techniquement créée plus de 24h avant le départ.
         */
        boolean horsDelai24h =
                dateDebut.isBefore(
                        maintenant.plusHours(24)
                );

        // =================================================
        // 10. CREATION RESERVATION
        // =================================================

        Reservation reservation =
                new Reservation();

        // -------------------------------------------------
        // AUCUNE RESSOURCE AFFECTEE POUR LE MOMENT
        // -------------------------------------------------

        reservation.setVehicule(
                null
        );

        reservation.setChauffeur(
                null
        );

        // -------------------------------------------------
        // UTILISATEUR AYANT SAISI LE TICKET
        // -------------------------------------------------

        reservation.setDemandeur(
                utilisateurConnecte
        );

        // -------------------------------------------------
        // DATES
        // -------------------------------------------------

        reservation.setDateDebut(
                dateDebut
        );

        reservation.setDateFin(
                request.getDateFin()
        );

        // -------------------------------------------------
        // MISSION
        // -------------------------------------------------

        String motif =
                request
                        .getMotif()
                        .trim();


        reservation.setMotif(
                motif
        );

        // =================================================
        // URGENCE
        // =================================================

        reservation.setDemandeUrgente(
                true
        );

        reservation.setTypeDemande(
                "URGENTE"
        );

        reservation.setHorsDelai24h(
                horsDelai24h
        );


        /*
         * Dans le Ticket Express, le motif saisi sert
         * également de première justification opérationnelle
         * de l'urgence.
         *
         * Le dossier pourra être complété lors
         * de la régularisation.
         */
        reservation.setMotifUrgence(
                motif
        );

        // =================================================
        // MODE EXPRESS
        // =================================================

        reservation.setModeCreation(
                "EXPRESS"
        );


        reservation.setARegulariser(
                true
        );


        reservation.setDemandeExpressPar(
                request
                        .getDemandePar()
                        .trim()
        );

        // =================================================
        // MOBILISABILITE
        // =================================================

        /*
         * Une mission urgente EXPRESS ne doit pas
         * pouvoir être déplacée par une mission ordinaire.
         *
         * Le dispatch décidera ensuite quelles missions
         * FLEXIBLES existantes peuvent être réorganisées
         * pour libérer une ressource.
         */
        reservation.setMobilisabilite(
                "VERROUILLEE"
        );

        // =================================================
        // DETAILS LOGISTIQUES
        // =================================================

        reservation.setPointDepart(
                request
                        .getPointDepart()
                        .trim()
        );


        reservation.setDestination(
                request
                        .getDestination()
                        .trim()
        );


        reservation.setNombrePassagers(
                request.getNombrePassagers()
        );


        /*
         * Par défaut, une mission EXPRESS nécessite
         * un chauffeur.
         */
        reservation.setBesoinChauffeur(
                request.getBesoinChauffeur() != null
                        ? request.getBesoinChauffeur()
                        : true
        );


        reservation.setTypeVehiculeSouhaite(
                request.getTypeVehiculeSouhaite() != null
                        && !request
                        .getTypeVehiculeSouhaite()
                        .isBlank()

                        ? request
                        .getTypeVehiculeSouhaite()
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        )

                        : null
        );


        reservation.setObservations(
                request.getObservations() != null
                        && !request
                        .getObservations()
                        .isBlank()

                        ? request
                        .getObservations()
                        .trim()

                        : null
        );

        // =================================================
        // INFORMATIONS ADMINISTRATIVES A REGULARISER
        // =================================================

        /*
         * Ces informations ne sont pas nécessaires
         * pour déclencher immédiatement la mission.
         *
         * Elles seront complétées après coup.
         */
        reservation.setDemandeurNom(
                null
        );

        reservation.setDemandeurPrenom(
                null
        );

        reservation.setDemandeurMatricule(
                null
        );

        reservation.setDemandeurEntite(
                null
        );

        reservation.setDemandeurTelephone(
                null
        );

        reservation.setListePassagers(
                null
        );

        // =================================================
        // STATUT INITIAL DU TICKET EXPRESS
        // =================================================

        /*
         * Aucun véhicule / chauffeur n'est encore affecté.
         *
         * L'étape 2 analysera les ressources disponibles
         * et mobilisables.
         */
        reservation.setStatut(
                "A_AFFECTER"
        );

        // =================================================
        // DATE DE CREATION
        // =================================================

        reservation.setDateCreation(
                maintenant
        );

        // =================================================
        // AUCUN REFUS / VALIDATION NORMALE
        // =================================================

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

        // =================================================
        // SAUVEGARDE
        // =================================================

        Reservation sauvegarde =
                reservationRepository
                        .save(
                                reservation
                        );


        return ResponseEntity
                .status(201)
                .body(
                        sauvegarde
                );
    }
}