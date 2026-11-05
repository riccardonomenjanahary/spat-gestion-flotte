package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Navette des parapheurs PACT — zone portuaire.
 *
 * Les deux circuits quotidiens (10 h 00 et 17 h 00)
 * sont intégrés comme des missions récurrentes
 * planifiées, sans ressaisie quotidienne.
 *
 * Le service crée des demandes au moins deux jours à l'avance.
 * La logistique choisit les ressources ; les contrôles conformes
 * permettent la planification sans seconde validation DGAL.
 */
@Service
public class NavettePactService {

    private final ReservationRepository reservationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final String joursFeries;

    /** Reconnaît aussi les occurrences de l'ancien générateur sans modifier la base. */
    public static boolean estNavette(Reservation r) {
        if ("NAVETTE_PACT".equals(r.getModeCreation())) return true;
        return "NORMAL".equals(r.getModeCreation())
                && r.getDemandeur() != null
                && "CHEF_SERVICE_LOGISTIQUE".equals(AccesParcoursService.role(r.getDemandeur()))
                && "Service Logistique DGAL".equals(r.getDemandeurNom())
                && "Zone portuaire PACT".equals(r.getDestination())
                && Set.of("Navette parapheurs PACT – Circuit 10h00 – Zone portuaire",
                        "Navette parapheurs PACT – Circuit 17h00 – Zone portuaire").contains(
                        r.getMotif() == null ? "" : r.getMotif());
    }

    public NavettePactService(
            ReservationRepository reservationRepository,
            UtilisateurRepository utilisateurRepository,
            @Value("${app.dispositif.jours-feries:}") String joursFeries
    ) {
        this.reservationRepository = reservationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.joursFeries = joursFeries == null ? "" : joursFeries;
    }

    /**
     * Exécuté tous les jours à 00:05.
     * Crée les deux missions du prochain jour ouvrable à J+2,
     * sans doublon, quel que soit leur statut actuel.
     */
    @Scheduled(cron = "0 5 0 * * *", zone = "Indian/Antananarivo")
    @Transactional
    public void planifierNavettesQuotidiennes() {

        // Anticipation > 24 h ; le prochain jour ouvrable après demain.
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Indian/Antananarivo")).plusDays(2);
        Set<LocalDate> feries = Arrays.stream(joursFeries.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(this::parseDateOrNull)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        while (estJourNonOuvrable(today, feries)) today = today.plusDays(1);

        // Ne pas planifier les week-ends
        if (estJourNonOuvrable(today, feries)) {
            return;
        }

        Utilisateur demandeur = utilisateurRepository.findByRole("CHEF_SERVICE_LOGISTIQUE").stream()
                .filter(Utilisateur::isActif).findFirst().orElse(null);
        if (demandeur == null) {
            return;
        }

        // Circuit 10h00
        creerNavetteSiAbsente(
                demandeur,
                today,
                LocalTime.of(10, 0),
                LocalTime.of(11, 0),
                "Navette parapheurs PACT – Circuit 10h00 – Zone portuaire"
        );

        // Circuit 17h00
        creerNavetteSiAbsente(
                demandeur,
                today,
                LocalTime.of(17, 0),
                LocalTime.of(18, 0),
                "Navette parapheurs PACT – Circuit 17h00 – Zone portuaire"
        );
    }

    private boolean estJourNonOuvrable(LocalDate date, Set<LocalDate> feries) {
        return date.getDayOfWeek() == DayOfWeek.SATURDAY
                || date.getDayOfWeek() == DayOfWeek.SUNDAY
                || feries.contains(date);
    }

    private LocalDate parseDateOrNull(String valeur) {
        try {
            return LocalDate.parse(valeur);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private void creerNavetteSiAbsente(
            Utilisateur demandeur,
            LocalDate date,
            LocalTime heureDebut,
            LocalTime heureFin,
            String motif
    ) {
        LocalDateTime debut = LocalDateTime.of(date, heureDebut);
        LocalDateTime fin = LocalDateTime.of(date, heureFin);

        // Vérifier si une navette existe déjà pour ce créneau
        boolean existe = reservationRepository.existsByMotifAndDateDebut(motif, debut);

        if (existe) {
            return;
        }

        Reservation navette = new Reservation();
        // Choix manuel par la logistique ; jamais de patrouille par défaut.
        navette.setDemandeur(demandeur);
        navette.setBesoinChauffeur(true);
        navette.setNombrePassagers(1);
        navette.setDateDebut(debut);
        navette.setDateFin(fin);
        navette.setMotif(motif);
        navette.setDestination("Zone portuaire PACT");
        navette.setPointDepart("Siège SPAT");
        navette.setStatut("EN_ATTENTE");
        navette.setTypeDemande("PLANIFIEE");
        navette.setModeCreation("NAVETTE_PACT");
        navette.setMobilisabilite("VERROUILLEE");
        navette.setZoneMission("VILLE_TOAMASINA");
        navette.setDemandeurNom("Service Logistique DGAL");
        navette.setDemandeurEntite("DGAL");
        navette.setDateCreation(LocalDateTime.now());

        reservationRepository.save(navette);
    }
}
