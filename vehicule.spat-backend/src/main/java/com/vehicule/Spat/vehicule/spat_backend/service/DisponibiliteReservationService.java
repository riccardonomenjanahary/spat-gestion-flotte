package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.dto.DisponibiliteReservationResponse;

import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;
import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;

import com.vehicule.Spat.vehicule.spat_backend.repository.AffectationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class DisponibiliteReservationService {

    private final ReservationRepository reservationRepository;

    private final VehiculeRepository vehiculeRepository;

    private final ChauffeurRepository chauffeurRepository;

    private final AffectationRepository affectationRepository;

    // =====================================================
    // CONSTRUCTEUR
    // =====================================================

    public DisponibiliteReservationService(
            ReservationRepository reservationRepository,
            VehiculeRepository vehiculeRepository,
            ChauffeurRepository chauffeurRepository,
            AffectationRepository affectationRepository
    ) {
        this.reservationRepository =
                reservationRepository;

        this.vehiculeRepository =
                vehiculeRepository;

        this.chauffeurRepository =
                chauffeurRepository;

        this.affectationRepository =
                affectationRepository;
    }

    // =====================================================
    // DISPONIBILITES POUR UNE DEMANDE
    // =====================================================

    public DisponibiliteReservationResponse calculerDisponibilites(
            Long reservationId
    ) {

        Reservation reservation =
                reservationRepository
                        .findById(reservationId)
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "Demande introuvable : "
                                                        + reservationId
                                        )
                        );

        DisponibiliteReservationResponse response =
                new DisponibiliteReservationResponse();

        response.setReservationId(
                reservation.getId()
        );

        response.setTypeSouhaite(
                reservation.getTypeVehiculeSouhaite()
        );

        boolean chauffeurRequis =
                Boolean.TRUE.equals(
                        reservation.getBesoinChauffeur()
                );

        response.setChauffeurRequis(
                chauffeurRequis
        );

        // =================================================
        // VEHICULES DISPONIBLES
        // =================================================

        List<
                DisponibiliteReservationResponse.VehiculeDisponibleDto
                > correspondants =
                new ArrayList<>();

        List<
                DisponibiliteReservationResponse.VehiculeDisponibleDto
                > suggestions =
                new ArrayList<>();

        List<Vehicule> vehicules =
                vehiculeRepository.findAll();

        for (Vehicule vehicule : vehicules) {

            // ---------------------------------------------
            // DISPONIBILITE REELLE POUR LA PERIODE
            // ---------------------------------------------

            if (!estVehiculeDisponiblePourPeriode(
                    vehicule.getId(),
                    reservation.getDateDebut(),
                    reservation.getDateFin(),
                    reservation.getId()
            )) {
                continue;
            }

            DisponibiliteReservationResponse.VehiculeDisponibleDto dto =
                    convertirVehicule(
                            vehicule
                    );

            // ---------------------------------------------
            // TYPE VEHICULE
            // ---------------------------------------------

            if (correspondAuTypeSouhaite(
                    vehicule,
                    reservation.getTypeVehiculeSouhaite()
            )) {

                correspondants.add(
                        dto
                );

            } else {

                /*
                 * Ce véhicule est réellement disponible,
                 * mais son type est différent du type demandé.
                 *
                 * Il peut donc être proposé comme alternative.
                 */
                suggestions.add(
                        dto
                );
            }
        }

        response.setVehiculesCorrespondants(
                correspondants
        );

        response.setSuggestionsVehicules(
                suggestions
        );

        boolean typeDisponible =
                !correspondants.isEmpty();

        response.setTypeSouhaiteDisponible(
                typeDisponible
        );

        // =================================================
        // MESSAGE VEHICULE
        // =================================================

        String typeSouhaite =
                formaterType(
                        reservation.getTypeVehiculeSouhaite()
                );

        if (typeDisponible) {

            response.setMessage(
                    correspondants.size()
                            + " véhicule(s) de type "
                            + typeSouhaite
                            + " disponible(s) pour cette période."
            );

        } else if (!suggestions.isEmpty()) {

            response.setMessage(
                    "Aucun véhicule de type "
                            + typeSouhaite
                            + " n'est disponible pour cette période. "
                            + suggestions.size()
                            + " autre(s) véhicule(s) disponible(s) peuvent être proposés."
            );

        } else {

            response.setMessage(
                    "Aucun véhicule n'est disponible pour cette période."
            );
        }

        // =================================================
        // CHAUFFEURS
        // =================================================

        if (!chauffeurRequis) {

            response.setChauffeurDisponible(
                    true
            );

            response.setChauffeursDisponibles(
                    new ArrayList<>()
            );

            return response;
        }

        List<
                DisponibiliteReservationResponse.ChauffeurDisponibleDto
                > chauffeursDisponibles =
                new ArrayList<>();

        for (
                Chauffeur chauffeur :
                chauffeurRepository.findAll()
        ) {

            if (estChauffeurDisponiblePourPeriode(
                    chauffeur.getId(),
                    reservation.getDateDebut(),
                    reservation.getDateFin(),
                    reservation.getId()
            )) {

                chauffeursDisponibles.add(
                        convertirChauffeur(
                                chauffeur
                        )
                );
            }
        }

        response.setChauffeursDisponibles(
                chauffeursDisponibles
        );

        response.setChauffeurDisponible(
                !chauffeursDisponibles.isEmpty()
        );

        return response;
    }

    // =====================================================
    // DISPONIBILITE VEHICULE
    // =====================================================

    public boolean estVehiculeDisponiblePourPeriode(
            Long vehiculeId,
            LocalDateTime dateDebut,
            LocalDateTime dateFin,
            Long reservationAExclure
    ) {

        if (vehiculeId == null
                || dateDebut == null
                || dateFin == null) {

            return false;
        }

        if (!dateFin.isAfter(dateDebut)) {
            return false;
        }

        Vehicule vehicule =
                vehiculeRepository
                        .findById(vehiculeId)
                        .orElse(null);

        if (vehicule == null) {
            return false;
        }

        // -------------------------------------------------
        // STATUT OPERATIONNEL
        // -------------------------------------------------

        if (!statutVehiculeCompatible(
                vehicule
        )) {

            return false;
        }

        // -------------------------------------------------
        // RESERVATIONS DEJA VALIDEES
        // -------------------------------------------------

        boolean reserveDansReservation =
                reservationRepository
                        .existeChevauchementVehicule(
                                vehiculeId,
                                reservationAExclure,
                                dateDebut,
                                dateFin
                        );

        if (reserveDansReservation) {
            return false;
        }

        // -------------------------------------------------
        // AFFECTATIONS REELLES
        // -------------------------------------------------

        boolean reserveDansAffectation =
                affectationRepository
                        .existeChevauchementVehicule(
                                vehiculeId,
                                dateDebut,
                                dateFin
                        );

        if (reserveDansAffectation) {
            return false;
        }

        return true;
    }

    // =====================================================
    // DISPONIBILITE CHAUFFEUR
    // =====================================================

    public boolean estChauffeurDisponiblePourPeriode(
            Long chauffeurId,
            LocalDateTime dateDebut,
            LocalDateTime dateFin,
            Long reservationAExclure
    ) {

        if (chauffeurId == null
                || dateDebut == null
                || dateFin == null) {

            return false;
        }

        if (!dateFin.isAfter(dateDebut)) {
            return false;
        }

        Chauffeur chauffeur =
                chauffeurRepository
                        .findById(chauffeurId)
                        .orElse(null);

        if (chauffeur == null) {
            return false;
        }

        // -------------------------------------------------
        // STATUT OPERATIONNEL
        // -------------------------------------------------

        if (!statutChauffeurCompatible(
                chauffeur
        )) {

            return false;
        }

        // -------------------------------------------------
        // AUTRES RESERVATIONS
        // -------------------------------------------------

        boolean reserveDansReservation =
                reservationRepository
                        .existeChevauchementChauffeur(
                                chauffeurId,
                                reservationAExclure,
                                dateDebut,
                                dateFin
                        );

        if (reserveDansReservation) {
            return false;
        }

        // -------------------------------------------------
        // AFFECTATIONS EXISTANTES
        // -------------------------------------------------

        boolean reserveDansAffectation =
                affectationRepository
                        .existeChevauchementChauffeur(
                                chauffeurId,
                                dateDebut,
                                dateFin
                        );

        if (reserveDansAffectation) {
            return false;
        }

        return true;
    }

    // =====================================================
    // STATUT VEHICULE
    // =====================================================

    /**
     * Un véhicule hors service, en maintenance,
     * transféré ou réformé ne doit jamais être proposé.
     *
     * EN_MISSION peut être proposé pour une autre période
     * à condition que les dates ne se chevauchent pas.
     */
    private boolean statutVehiculeCompatible(
            Vehicule vehicule
    ) {

        if (vehicule == null
                || vehicule.getStatut() == null) {

            return false;
        }

        String statut =
                vehicule
                        .getStatut()
                        .trim()
                        .toUpperCase(Locale.ROOT);

        return "DISPONIBLE".equals(statut)
                || "EN_MISSION".equals(statut);
    }

    // =====================================================
    // STATUT CHAUFFEUR
    // =====================================================

    /**
     * Le modèle Chauffeur réel utilise :
     *
     * DISPONIBLE
     * EN_MISSION
     * ABSENT
     *
     * EN_MISSION n'interdit pas une future mission
     * si les créneaux ne se chevauchent pas.
     */
    private boolean statutChauffeurCompatible(
            Chauffeur chauffeur
    ) {

        if (chauffeur == null
                || chauffeur.getStatut() == null) {

            return false;
        }

        String statut =
                chauffeur
                        .getStatut()
                        .trim()
                        .toUpperCase(Locale.ROOT);

        return "DISPONIBLE".equals(statut)
                || "EN_MISSION".equals(statut);
    }

    // =====================================================
    // TYPE VEHICULE
    // =====================================================

    private boolean correspondAuTypeSouhaite(
            Vehicule vehicule,
            String typeSouhaite
    ) {

        /*
         * Aucun type particulier demandé :
         * tout véhicule disponible correspond.
         */
        if (typeSouhaite == null
                || typeSouhaite.isBlank()) {

            return true;
        }

        /*
         * Si le véhicule n'a pas encore son type
         * renseigné dans la base, on ne l'invente pas.
         *
         * Il sera simplement présenté comme alternative.
         */
        if (vehicule.getTypeVehicule() == null
                || vehicule.getTypeVehicule().isBlank()) {

            return false;
        }

        return normaliserType(
                vehicule.getTypeVehicule()
        ).equals(
                normaliserType(
                        typeSouhaite
                )
        );
    }

    // =====================================================
    // CONVERSION VEHICULE
    // =====================================================

    private DisponibiliteReservationResponse.VehiculeDisponibleDto
    convertirVehicule(
            Vehicule vehicule
    ) {

        DisponibiliteReservationResponse.VehiculeDisponibleDto dto =
                new DisponibiliteReservationResponse.VehiculeDisponibleDto();

        dto.setId(
                vehicule.getId()
        );

        dto.setImmatriculation(
                vehicule.getImmatriculation()
        );

        dto.setCategorie(
                vehicule.getCategorie()
        );

        dto.setModeleType(
                vehicule.getModeleType()
        );

        dto.setTypeVehicule(
                vehicule.getTypeVehicule()
        );

        dto.setStatut(
                vehicule.getStatut()
        );

        return dto;
    }

    // =====================================================
    // CONVERSION CHAUFFEUR
    // =====================================================

    private DisponibiliteReservationResponse.ChauffeurDisponibleDto
    convertirChauffeur(
            Chauffeur chauffeur
    ) {

        DisponibiliteReservationResponse.ChauffeurDisponibleDto dto =
                new DisponibiliteReservationResponse.ChauffeurDisponibleDto();

        dto.setId(
                chauffeur.getId()
        );

        dto.setMatricule(
                chauffeur.getMatricule()
        );

        dto.setNom(
                chauffeur.getNom()
        );

        dto.setPrenom(
                chauffeur.getPrenom()
        );

        dto.setTelephone(
                chauffeur.getTelephone()
        );

        dto.setStatut(
                chauffeur.getStatut()
        );

        return dto;
    }

    // =====================================================
    // NORMALISATION TYPE
    // =====================================================

    private String normaliserType(
            String valeur
    ) {

        if (valeur == null) {
            return "";
        }

        return valeur
                .trim()
                .toUpperCase(Locale.ROOT)
                .replace("-", "")
                .replace(" ", "");
    }

    // =====================================================
    // FORMAT TYPE
    // =====================================================

    private String formaterType(
            String type
    ) {

        if (type == null
                || type.isBlank()) {

            return "demandé";
        }

        return switch (
                normaliserType(type)
                ) {

            case "4X4" ->
                    "4x4";

            case "BERLINE" ->
                    "berline";

            case "UTILITAIRE" ->
                    "utilitaire";

            case "MINIBUS" ->
                    "minibus";

            case "AUTRE" ->
                    "autre";

            default ->
                    type;
        };
    }
}