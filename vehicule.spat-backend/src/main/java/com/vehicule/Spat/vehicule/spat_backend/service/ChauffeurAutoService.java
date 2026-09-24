package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.ChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class ChauffeurAutoService {

    private final ChauffeurRepository chauffeurRepository;
    private final ReservationRepository reservationRepository;

    public ChauffeurAutoService(
            ChauffeurRepository chauffeurRepository,
            ReservationRepository reservationRepository
    ) {
        this.chauffeurRepository = chauffeurRepository;
        this.reservationRepository = reservationRepository;
    }

    // =====================================================
    // CHAUFFEURS COMPATIBLES AVEC LE VEHICULE
    // =====================================================

    /**
     * Cette méthode utilise les affectations de service
     * présentes dans les deux référentiels SPAT :
     *
     * - Vehicule.affectation
     * - Chauffeur.affectationService
     *
     * Elle ne crée pas de couple permanent arbitraire
     * véhicule -> chauffeur.
     *
     * Exemples :
     * - Garage / Missionnaire -> chauffeurs Garage / Garage-Voirie
     * - Ambulance / CEMEDI    -> chauffeurs Ambulance
     * - DG SPAT               -> chauffeurs rattachés à la DG
     */
    public List<Chauffeur> trouverChauffeursCompatibles(
            Vehicule vehicule
    ) {

        if (vehicule == null) {
            return List.of();
        }

        return chauffeurRepository
                .findAll()
                .stream()
                .filter(chauffeur ->
                        chauffeur != null
                                && chauffeur.getAffectationService() != null
                                && estCompatible(
                                vehicule,
                                chauffeur
                        )
                )
                .sorted(
                        Comparator
                                .comparingInt(
                                        this::prioriteStatut
                                )
                                .thenComparing(
                                        chauffeur ->
                                                normaliser(
                                                        chauffeur.getMatricule()
                                                )
                                )
                                .thenComparing(
                                        chauffeur ->
                                                normaliser(
                                                        chauffeur.getNom()
                                                )
                                )
                )
                .toList();
    }

    // =====================================================
    // CHAUFFEURS COMPATIBLES ET DISPONIBLES
    // =====================================================

    public List<Chauffeur> trouverChauffeursCompatiblesDisponibles(
            Vehicule vehicule,
            LocalDateTime dateDebut,
            LocalDateTime dateFin,
            Long reservationAExclure
    ) {

        if (vehicule == null) {
            return List.of();
        }

        return trouverChauffeursCompatibles(
                vehicule
        )
                .stream()
                .filter(
                        this::chauffeurEligibleOperationnellement
                )
                .filter(chauffeur -> {

                    /*
                     * Si aucune période n'est fournie,
                     * on retourne simplement les chauffeurs
                     * compatibles et opérationnellement éligibles.
                     */
                    if (dateDebut == null
                            || dateFin == null
                            || !dateFin.isAfter(dateDebut)) {

                        return true;
                    }

                    boolean chevauchement =
                            reservationRepository
                                    .existeChevauchementChauffeur(
                                            chauffeur.getId(),
                                            reservationAExclure,
                                            dateDebut,
                                            dateFin
                                    );

                    return !chevauchement;
                })
                .toList();
    }

    /**
     * Explique un echec d'affectation sans attribuer un chauffeur incompatible.
     * Le controle final du planning (dans ReservationController) reste obligatoire.
     */
    public String expliquerAbsenceDeChauffeur(
            Vehicule vehicule,
            LocalDateTime dateDebut,
            LocalDateTime dateFin,
            Long reservationAExclure
    ) {
        if (vehicule == null) {
            return "Le vehicule selectionne est introuvable.";
        }

        List<Chauffeur> compatibles = trouverChauffeursCompatibles(vehicule);
        if (compatibles.isEmpty()) {
            return "Aucun chauffeur ne correspond a l'affectation du vehicule ("
                    + String.valueOf(vehicule.getAffectation())
                    + "). Verifier les affectations des chauffeurs et du vehicule.";
        }

        List<Chauffeur> operationnels = compatibles.stream()
                .filter(this::chauffeurEligibleOperationnellement)
                .toList();
        if (operationnels.isEmpty()) {
            return compatibles.size() + " chauffeur(s) compatible(s) trouve(s), mais aucun n'a "
                    + "un statut operationnel autorise (DISPONIBLE, SUR_PLACE, EN_DEPLACEMENT).";
        }

        if (dateDebut == null || dateFin == null || !dateFin.isAfter(dateDebut)) {
            return "La periode du ticket est invalide : verifier les dates de debut et de fin.";
        }

        List<Chauffeur> libres = operationnels.stream()
                .filter(chauffeur -> !reservationRepository.existeChevauchementChauffeur(
                        chauffeur.getId(), reservationAExclure, dateDebut, dateFin))
                .toList();
        if (libres.isEmpty()) {
            return operationnels.size() + " chauffeur(s) compatible(s) et operationnel(s), "
                    + "mais tous ont une reservation en conflit avec les dates du ticket. "
                    + "Verifier egalement que la reservation actuelle est exclue du calcul.";
        }

        return libres.size() + " chauffeur(s) compatible(s) et libre(s) selon ChauffeurAutoService, "
                + "mais le controle final de disponibilite les refuse. "
                + "Comparer les regles de ChauffeurAutoService et DisponibiliteReservationService.";
    }

    // =====================================================
    // CHOIX AUTOMATIQUE
    // =====================================================

    /**
     * Choisit le premier chauffeur compatible et disponible
     * selon l'ordre :
     *
     * 1. DISPONIBLE
     * 2. SUR_PLACE
     * 3. EN_DEPLACEMENT
     * 4. matricule croissant
     */
    public Chauffeur choisirChauffeurAutomatiquement(
            Vehicule vehicule,
            LocalDateTime dateDebut,
            LocalDateTime dateFin,
            Long reservationAExclure
    ) {

        return trouverChauffeursCompatiblesDisponibles(
                vehicule,
                dateDebut,
                dateFin,
                reservationAExclure
        )
                .stream()
                .findFirst()
                .orElse(null);
    }

    // =====================================================
    // COMPATIBILITE AFFECTATION VEHICULE / CHAUFFEUR
    // =====================================================

    public boolean estCompatible(
            Vehicule vehicule,
            Chauffeur chauffeur
    ) {

        if (vehicule == null
                || chauffeur == null) {

            return false;
        }

        String affectationVehicule =
                normaliser(
                        vehicule.getAffectation()
                );

        String categorieVehicule =
                normaliser(
                        vehicule.getCategorie()
                );

        String affectationChauffeur =
                normaliser(
                        chauffeur.getAffectationService()
                );

        if (affectationChauffeur.isBlank()) {
            return false;
        }

        // -------------------------------------------------
        // AMBULANCES
        // -------------------------------------------------
        //
        // Le référentiel véhicules contient notamment
        // CEMEDI et GARAGE pour les ambulances, tandis que
        // le référentiel chauffeurs utilise "Ambulance".
        //
        // La catégorie du véhicule est donc prioritaire.

        if (categorieVehicule.contains(
                "AMBULANCE"
        )) {

            return affectationChauffeur.contains(
                    "AMBULANCE"
            );
        }

        // -------------------------------------------------
        // GARAGE / MISSIONNAIRE / VOIRIE
        // -------------------------------------------------

        if (affectationVehicule.contains("GARAGE")
                || affectationVehicule.contains("MISSIONNAIRE")) {
            // Le referentiel indique que les vehicules missionnaires
            // relèvent des chauffeurs du Garage / Garage-Voirie.
            return affectationChauffeur.contains("GARAGE");
        }

        // -------------------------------------------------
        // DIRECTION GENERALE
        // -------------------------------------------------
        //
        // Le document véhicules utilise "DG SPAT".
        // Le document chauffeurs contient :
        // - Directeur Générale (D.G)
        // - Madame DG

        if (affectationVehicule.contains(
                "DG SPAT"
        )
                || affectationVehicule.equals(
                "DG"
        )) {

            return affectationChauffeur.contains(
                    "DIRECTEUR GENERALE"
            )
                    || affectationChauffeur.contains(
                    "MADAME DG"
            )
                    || affectationChauffeur.equals(
                    "DG"
            )
                    || affectationChauffeur.contains(
                    "D G"
            );
        }

        // -------------------------------------------------
        // CORRESPONDANCE GENERIQUE
        // -------------------------------------------------
        //
        // Utile pour les futurs ajouts :
        // si un véhicule et un chauffeur portent exactement
        // la même affectation de service, ils sont compatibles.

        if (!affectationVehicule.isBlank()
                &&
                affectationVehicule.equals(
                        affectationChauffeur
                )) {

            return true;
        }

        /*
         * On permet aussi la relation parent/enfant :
         * ex. GARAGE et GARAGE VOIRIE.
         *
         * Pour éviter les correspondances trop larges,
         * on exige au moins 5 caractères.
         */
        if (affectationVehicule.length() >= 5
                && affectationChauffeur.length() >= 5) {

            return affectationVehicule.contains(
                    affectationChauffeur
            )
                    || affectationChauffeur.contains(
                    affectationVehicule
            );
        }

        return false;
    }

    // =====================================================
    // STATUT OPERATIONNEL CHAUFFEUR
    // =====================================================

    private boolean chauffeurEligibleOperationnellement(
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

    private int prioriteStatut(
            Chauffeur chauffeur
    ) {

        if (chauffeur == null
                || chauffeur.getStatut() == null) {

            return 99;
        }

        return switch (
                chauffeur
                        .getStatut()
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        )
                ) {

            case "DISPONIBLE" ->
                    1;

            case "SUR_PLACE" ->
                    2;

            case "EN_DEPLACEMENT" ->
                    3;

            default ->
                    9;
        };
    }

    // =====================================================
    // NORMALISATION
    // =====================================================

    private String normaliser(
            String valeur
    ) {

        if (valeur == null) {
            return "";
        }

        String sansAccent =
                Normalizer
                        .normalize(
                                valeur,
                                Normalizer.Form.NFD
                        )
                        .replaceAll(
                                "\\p{M}",
                                ""
                        );

        return sansAccent
                .toUpperCase(
                        Locale.ROOT
                )
                .replaceAll(
                        "[^A-Z0-9]+",
                        " "
                )
                .trim()
                .replaceAll(
                        "\\s+",
                        " "
                );
    }
}
