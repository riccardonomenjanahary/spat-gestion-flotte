
        package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.dto.DisponibiliteReservationResponse;
import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;
import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.ChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.AssuranceRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.MaintenanceRepository;
import com.vehicule.Spat.vehicule.spat_backend.model.StatutMaintenance;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Locale;

@Service
public class DisponibiliteReservationService {

    private final ReservationRepository reservationRepository;
    private final VehiculeRepository vehiculeRepository;
    private final ChauffeurRepository chauffeurRepository;
    private final AssuranceRepository assuranceRepository;
    private final MaintenanceRepository maintenanceRepository;


    public DisponibiliteReservationService(
            ReservationRepository reservationRepository,
            VehiculeRepository vehiculeRepository,
            ChauffeurRepository chauffeurRepository,
            AssuranceRepository assuranceRepository,
            MaintenanceRepository maintenanceRepository
    ) {

        this.reservationRepository =
                reservationRepository;

        this.vehiculeRepository =
                vehiculeRepository;

        this.chauffeurRepository =
                chauffeurRepository;
        this.assuranceRepository = assuranceRepository;
        this.maintenanceRepository = maintenanceRepository;
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
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Demande introuvable : "
                                                + reservationId
                                )
                        );


        verifierPeriode(
                reservation.getDateDebut(),
                reservation.getDateFin()
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
        // VEHICULES
        // =================================================

        List<Vehicule> vehicules =
                vehiculeRepository.findAll();


        List<DisponibiliteReservationResponse.VehiculeDisponibleDto>
                correspondants =
                new ArrayList<>();


        List<DisponibiliteReservationResponse.VehiculeDisponibleDto>
                suggestions =
                new ArrayList<>();


        for (Vehicule vehicule : vehicules) {

            if (!vehiculeEligiblePourPlanning(
                    vehicule
            )) {

                continue;
            }


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


            if (correspondAuTypeSouhaite(
                    vehicule,
                    reservation.getTypeVehiculeSouhaite()
            )) {

                correspondants.add(
                        dto
                );

            } else {

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


        String typeSouhaite =
                formaterType(
                        reservation.getTypeVehiculeSouhaite()
                );


        if (typeDisponible) {

            response.setMessage(
                    correspondants.size()
                            + " véhicule(s) correspondant au type "
                            + typeSouhaite
                            + " sont disponibles pour cette période."
            );

        } else if (!suggestions.isEmpty()) {

            response.setMessage(
                    "Aucun "
                            + typeSouhaite
                            + " n'est disponible pour cette période. "
                            + suggestions.size()
                            + " autre(s) véhicule(s) sont proposés."
            );

        } else {

            response.setMessage(
                    "Aucun véhicule n'est disponible pour cette période."
            );
        }


        // =================================================
        // CHAUFFEURS
        // =================================================

        if (chauffeurRequis) {

            List<DisponibiliteReservationResponse.ChauffeurDisponibleDto>
                    chauffeursDisponibles =
                    chauffeurRepository
                            .findAll()
                            .stream()
                            .filter(
                                    this::chauffeurEligiblePourPlanning
                            )
                            .filter(chauffeur ->
                                    estChauffeurDisponiblePourPeriode(
                                            chauffeur.getId(),
                                            reservation.getDateDebut(),
                                            reservation.getDateFin(),
                                            reservation.getId()
                                    )
                            )
                            .map(
                                    this::convertirChauffeur
                            )
                            .toList();


            response.setChauffeursDisponibles(
                    chauffeursDisponibles
            );


            response.setChauffeurDisponible(
                    !chauffeursDisponibles.isEmpty()
            );

        } else {

            response.setChauffeurDisponible(
                    true
            );


            response.setChauffeursDisponibles(
                    new ArrayList<>()
            );
        }


        return response;
    }


    // =====================================================
    // PLANNING COMPLET : disponible / occupe / indisponible
    // =====================================================
    // La requete existeChevauchementVehicule est deja utilisee
    // pour autoriser ou refuser une affectation. La reutiliser
    // garantit que l'affichage et la validation appliquent
    // exactement le MEME critere de conflit en base.
    // La liste des vehicules techniquement indisponibles reste
    // distincte de ceux bloques par un ticket anterieur.

    public List<Map<String, Object>> calculerPlanningVehicules(
            Long reservationId
    ) {
        Reservation reservation = reservationRepository
                .findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Ticket introuvable : " + reservationId
                ));

        verifierPeriode(reservation.getDateDebut(), reservation.getDateFin());

        List<Map<String, Object>> resultat = new ArrayList<>();

        for (Vehicule vehicule : vehiculeRepository.findAll()) {
            boolean eligible = vehiculeEligiblePourPlanning(vehicule)
                    && documentsValidesPourPeriode(vehicule, reservation.getDateDebut(), reservation.getDateFin());
            boolean occupeParAutreTicket = eligible
                    && reservationRepository.existeChevauchementVehicule(
                    vehicule.getId(),
                    reservation.getId(),
                    reservation.getDateDebut(),
                    reservation.getDateFin()
            );

            String etat;
            String raison;

            if (!eligible) {
                etat = "INDISPONIBLE_TECHNIQUE";
                raison = "Vehicule indisponible (documents, entretien ou statut : "
                        + (vehicule.getStatut() == null
                        ? "non renseigne" : vehicule.getStatut()) + ")";
            } else if (occupeParAutreTicket) {
                etat = "OCCUPE";
                raison = "Deja reserve sur cette periode par un autre ticket";
            } else {
                etat = "DISPONIBLE";
                raison = "Disponible sur la periode demandee";
            }

            Map<String, Object> ligne = new LinkedHashMap<>();
            ligne.put("id", vehicule.getId());
            ligne.put("immatriculation", vehicule.getImmatriculation());
            ligne.put("categorie", vehicule.getCategorie());
            ligne.put("etat", etat);
            ligne.put("disponible", eligible && !occupeParAutreTicket);
            ligne.put("raison", raison);
            resultat.add(ligne);
        }

        return resultat;
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

        if (vehiculeId == null) {
            return false;
        }


        if (!periodeValide(
                dateDebut,
                dateFin
        )) {

            return false;
        }


        Vehicule vehicule =
                vehiculeRepository
                        .findById(
                                vehiculeId
                        )
                        .orElse(null);


        if (!vehiculeEligiblePourPlanning(
                vehicule
        ) || !documentsValidesPourPeriode(vehicule, dateDebut, dateFin)) {

            return false;
        }


        boolean chevauchement =
                reservationRepository
                        .existeChevauchementVehicule(
                                vehiculeId,
                                reservationAExclure,
                                dateDebut,
                                dateFin
                        );


        return !chevauchement;
    }

    /**
     * Retourne la première cause opérationnelle expliquant pourquoi un
     * véhicule ne peut pas être réservé sur une période donnée. Cette
     * information est destinée au message de contrainte affiché à l'Assistant
     * de direction ; elle ne remplace pas le contrôle de disponibilité.
     */
    public String expliquerIndisponibilitePourPeriode(
            Vehicule vehicule,
            LocalDateTime dateDebut,
            LocalDateTime dateFin,
            Long reservationAExclure
    ) {
        if (vehicule == null) return "véhicule introuvable";
        String statut = vehicule.getStatut() == null ? "non renseigné"
                : vehicule.getStatut().trim().toUpperCase(Locale.ROOT);
        if (!List.of("DISPONIBLE", "EN_MISSION", "SUR_PLACE", "EN_DEPLACEMENT").contains(statut)) {
            if ("REQUISITIONNE".equals(statut)) {
                return "véhicule réquisitionné par le DGAL";
            }
            return "statut opérationnel : " + statut;
        }
        if (maintenanceRepository.existsByVehiculeIdAndOrigineDemandeIsNotNullAndStatutIn(
                vehicule.getId(), List.of(StatutMaintenance.ENTRETIEN_AUTORISE,
                        StatutMaintenance.EN_ATTENTE_VALIDATION_ENTRETIEN,
                        StatutMaintenance.ENTRETIEN_TERMINE,
                        StatutMaintenance.EN_COURS, StatutMaintenance.PLANIFIEE))) {
            return "entretien/maintenance en cours : véhicule indisponible jusqu'à confirmation du Chef Logistique";
        }
        if (vehicule.getDateExpirationVisiteTechnique() == null) {
            return "statut disponible, mais date de visite technique non renseignée";
        }
        if (dateFin != null && vehicule.getDateExpirationVisiteTechnique().isBefore(dateFin.toLocalDate())) {
            return "statut disponible, mais visite technique expirée avant la fin de la mission";
        }
        boolean assuranceValide = assuranceRepository.findByVehiculeIdOrderByDateExpirationDesc(vehicule.getId())
                .stream()
                .anyMatch(a -> a.getDateExpiration() != null
                        && (a.getDateDebut() == null || !a.getDateDebut().isAfter(dateDebut.toLocalDate()))
                        && !a.getDateExpiration().isBefore(dateFin.toLocalDate()));
        if (!assuranceValide) {
            return "statut disponible, mais assurance absente ou non valide pour la période";
        }
        if (reservationRepository.existeChevauchementVehicule(
                vehicule.getId(), reservationAExclure, dateDebut, dateFin)) {
            return reservationRepository.trouverChevauchementsVehicule(
                            vehicule.getId(), reservationAExclure, dateDebut, dateFin)
                    .stream()
                    .findFirst()
                    .map(reservation -> reservation.getDateFin() == null
                            ? "déjà réservé sur cette période"
                            : "déjà réservé : indisponible jusqu'au " + reservation.getDateFin().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm")))
                    .orElse("déjà réservé sur cette période");
        }
        return "indisponibilité à vérifier dans le planning";
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

        if (chauffeurId == null) {
            return false;
        }


        if (!periodeValide(
                dateDebut,
                dateFin
        )) {

            return false;
        }


        Chauffeur chauffeur =
                chauffeurRepository
                        .findById(
                                chauffeurId
                        )
                        .orElse(null);


        if (!chauffeurEligiblePourPlanning(
                chauffeur
        ) || chauffeur.getNumeroPermis() == null || chauffeur.getNumeroPermis().isBlank()
                || chauffeur.getDateExpirationPermis() == null
                || chauffeur.getDateExpirationPermis().isBefore(dateFin.toLocalDate())) {

            return false;
        }


        boolean chevauchement =
                reservationRepository
                        .existeChevauchementChauffeur(
                                chauffeurId,
                                reservationAExclure,
                                dateDebut,
                                dateFin
                        );


        return !chevauchement;
    }


    // =====================================================
    // ELIGIBILITE OPERATIONNELLE VEHICULE
    // =====================================================

    private boolean vehiculeEligiblePourPlanning(
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
                        .toUpperCase(
                                Locale.ROOT
                        );


        /*
         * EN_MISSION n'est volontairement pas exclu.
         *
         * Un véhicule actuellement en mission peut être
         * planifié pour une période future si les créneaux
         * ne se chevauchent pas.
         */
        return List.of("DISPONIBLE", "EN_MISSION", "SUR_PLACE", "EN_DEPLACEMENT")
                .contains(statut)
                && !maintenanceRepository.existsByVehiculeIdAndOrigineDemandeIsNotNullAndStatutIn(
                        vehicule.getId(), List.of(StatutMaintenance.ENTRETIEN_AUTORISE,
                                StatutMaintenance.EN_ATTENTE_VALIDATION_ENTRETIEN,
                                StatutMaintenance.ENTRETIEN_TERMINE,
                                StatutMaintenance.EN_COURS, StatutMaintenance.PLANIFIEE));
    }

    private boolean documentsValidesPourPeriode(Vehicule vehicule,
                                                LocalDateTime debut, LocalDateTime fin) {
        if (!periodeValide(debut, fin)
                || vehicule.getDateExpirationVisiteTechnique() == null
                || vehicule.getDateExpirationVisiteTechnique().isBefore(fin.toLocalDate())) {
            return false;
        }
        return assuranceRepository.findByVehiculeIdOrderByDateExpirationDesc(vehicule.getId())
                .stream().anyMatch(a -> a.getDateExpiration() != null
                        && (a.getDateDebut() == null || !a.getDateDebut().isAfter(debut.toLocalDate()))
                        && !a.getDateExpiration().isBefore(fin.toLocalDate()));
    }


    // =====================================================
    // ELIGIBILITE OPERATIONNELLE CHAUFFEUR
    // =====================================================

    private boolean chauffeurEligiblePourPlanning(
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
                        .toUpperCase(
                                Locale.ROOT
                        );


        return statut.equals(
                "DISPONIBLE"
        )
                || statut.equals(
                "SUR_PLACE"
        )
                || statut.equals(
                "EN_DEPLACEMENT"
        );
    }


    // =====================================================
    // VALIDATION PERIODE
    // =====================================================

    private boolean periodeValide(
            LocalDateTime debut,
            LocalDateTime fin
    ) {

        return debut != null
                && fin != null
                && fin.isAfter(
                debut
        );
    }


    private void verifierPeriode(
            LocalDateTime debut,
            LocalDateTime fin
    ) {

        if (!periodeValide(
                debut,
                fin
        )) {

            throw new IllegalArgumentException(
                    "La période de la demande est invalide."
            );
        }
    }


    // =====================================================
    // TYPE VEHICULE
    // =====================================================

    private boolean correspondAuTypeSouhaite(
            Vehicule vehicule,
            String typeSouhaite
    ) {

        if (typeSouhaite == null
                || typeSouhaite.isBlank()) {

            return true;
        }


        String recherche =
                (
                        safe(
                                vehicule.getCategorie()
                        )
                                + " "
                                + safe(
                                vehicule.getModeleType()
                        )
                )
                        .toUpperCase(
                                Locale.ROOT
                        )
                        .replace("-", "")
                        .replace(" ", "");


        String type =
                typeSouhaite
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        )
                        .replace("-", "")
                        .replace(" ", "");


        return switch (type) {

            case "4X4" ->
                    recherche.contains("4X4")
                            || recherche.contains("4*4")
                            || recherche.contains("4WD");

            case "BERLINE" ->
                    recherche.contains("BERLINE");

            case "UTILITAIRE" ->
                    recherche.contains("UTILITAIRE")
                            || recherche.contains("PICKUP")
                            || recherche.contains("CAMIONNETTE");

            case "MINIBUS" ->
                    recherche.contains("MINIBUS");

            case "AUTRE" ->
                    true;

            default ->
                    recherche.contains(
                            type
                    );
        };
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
    // UTILS
    // =====================================================

    private String safe(
            String valeur
    ) {

        return valeur == null
                ? ""
                : valeur;
    }


    private String formaterType(
            String type
    ) {

        if (type == null
                || type.isBlank()) {

            return "véhicule demandé";
        }


        return switch (
                type.toUpperCase(
                        Locale.ROOT
                )
                ) {

            case "4X4" ->
                    "4x4";

            case "BERLINE" ->
                    "berline";

            case "UTILITAIRE" ->
                    "utilitaire";

            case "MINIBUS" ->
                    "minibus";

            default ->
                    type;
        };
    }
}
