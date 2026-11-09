package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.JustificatifRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ConducteurAutoriseRepository;
import org.springframework.stereotype.Service;
import java.time.LocalTime;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.DayOfWeek;
import org.springframework.beans.factory.annotation.Value;

/** Contrôles bloquants réexécutés au moment de la décision finale. */
@Service
public class ReglesDispositifService {
    private final JustificatifRepository justificatifs;
    private final ConducteurAutoriseRepository conducteurs;
    private final DisponibiliteReservationService disponibilites;
    @Value("${app.dispositif.debut-travail:08:00}")
    private String debutTravail = "08:00";
    @Value("${app.dispositif.fin-travail:18:00}")
    private String finTravail = "18:00";
    @Value("${app.dispositif.debut-pause:12:00}")
    private String debutPause = "12:00";
    @Value("${app.dispositif.fin-pause:14:00}")
    private String finPause = "14:00";
    @Value("${app.dispositif.jours-feries:}")
    private String joursFeries = "";
    @Value("${app.dispositif.debut-nuit:18:00}")
    private String debutNuit = "18:00";
    @Value("${app.dispositif.fin-nuit:06:00}")
    private String finNuit = "06:00";

    public ReglesDispositifService(JustificatifRepository justificatifs,
            ConducteurAutoriseRepository conducteurs, DisponibiliteReservationService disponibilites) {
        this.justificatifs = justificatifs;
        this.conducteurs = conducteurs;
        this.disponibilites = disponibilites;
    }

    public String verifier(Reservation r) {
        Vehicule v = r.getVehicule();
        if (v == null) return "Aucun véhicule affecté.";
        if (!disponibilites.estVehiculeDisponiblePourPeriode(v.getId(), r.getDateDebut(), r.getDateFin(), r.getId()))
            return "Véhicule indisponible : conflit, entretien, assurance ou visite technique à régulariser.";
        if (r.getDateCreation() == null || r.getDateDebut() == null || r.getDateFin() == null)
            return "Dates de la demande incomplètes.";
        boolean sortieRapideLeJourMeme = "ASSISTANT_DIRECTION".equals(r.getModeCreation())
                && "VILLE_TOAMASINA".equals(r.getZoneMission())
                && r.getDateCreation().toLocalDate().equals(r.getDateDebut().toLocalDate());
        if (!sortieRapideLeJourMeme && Duration.between(r.getDateCreation(), r.getDateDebut()).toHours() < 24
                && (!r.isDemandeUrgente() || r.getMotifUrgence() == null || r.getMotifUrgence().isBlank()))
            return "Une demande déposée moins de 24 heures avant le départ nécessite une urgence motivée et tracée.";
        if (horsHoraires(r.getDateDebut(), r.getDateFin())
                && (r.getObservations() == null || r.getObservations().isBlank()))
            return "Une utilisation hors horaires, le week-end ou un jour férié exige une justification dans les observations avant validation.";
        if (justificatifs.findByVehiculeOrderByDateDepotDesc(v).stream().noneMatch(j ->
                j.getType() == TypeJustificatif.CARTE_GRISE && Boolean.TRUE.equals(j.getValide())))
            return "La carte grise du véhicule doit être chargée et validée avant utilisation.";
        if (CategorieVehicule.estVehiculePatrouille(v.getCategorie())
                && (!r.isDemandeUrgente() || r.getMotifUrgence() == null || r.getMotifUrgence().isBlank())
                && !"PATROUILLE".equalsIgnoreCase(r.getTypeDemande()))
            return "Le véhicule de patrouille est réservé aux patrouilles et aux urgences motivées.";
        if (CategorieVehicule.estMotoElectrique(v.getCategorie())) {
            if (traverseNuit(r.getDateDebut(), r.getDateFin(), LocalTime.parse(finNuit), LocalTime.parse(debutNuit)))
                return "Toute réservation de nuit est interdite pour les motos électriques (" + debutNuit + " à " + finNuit + ").";
            if (r.getConducteurMoto() != null) {
                boolean autorise = conducteurs.findByActifTrue().stream().anyMatch(c ->
                    Boolean.TRUE.equals(c.getValide()) && c.getDateValidation() != null
                    && r.getConducteurMoto() != null && c.getId().equals(r.getConducteurMoto().getId())
                    && c.getPermisNomStocke() != null
                    && c.getDirection() != null && r.getDemandeur() != null
                    && c.getDirection().getId().equals(r.getDemandeur().getDirectionId())
                    && v.getDirections().stream()
                        .anyMatch(d -> d.getId().equals(c.getDirection().getId())));
                if (!autorise) return "Le conducteur de la moto doit figurer sur la liste validée par le Directeur de sa Direction.";
            }
        } else {
            if (r.getChauffeur() == null || r.getChauffeur().getNumeroPermis() == null
                    || r.getChauffeur().getNumeroPermis().isBlank())
                return "Un chauffeur titulaire d'un permis est obligatoire pour toute voiture.";
            if (r.getChauffeur().getDateExpirationPermis() == null
                    || r.getChauffeur().getDateExpirationPermis().isBefore(r.getDateFin().toLocalDate()))
                return "Le permis du chauffeur doit être renseigné et valide jusqu'à la fin de la mission.";
            if (!disponibilites.estChauffeurDisponiblePourPeriode(r.getChauffeur().getId(),
                    r.getDateDebut(), r.getDateFin(), r.getId()))
                return "Le chauffeur est indisponible pour cette période.";
        }
        return null;
    }

    public ConducteurAutorise conducteurMotoValide(Long id, Long directionId) {
        if (id == null) return null;
        ConducteurAutorise conducteur = conducteurs.findById(id).orElse(null);
        if (conducteur == null || !Boolean.TRUE.equals(conducteur.getActif())
                || !Boolean.TRUE.equals(conducteur.getValide()) || conducteur.getDateValidation() == null
                || conducteur.getPermisNomStocke() == null || conducteur.getDirection() == null
                || !conducteur.getDirection().getId().equals(directionId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Sélectionnez un conducteur moto habilité par le chef de votre direction.");
        }
        return conducteur;
    }

    private boolean horsHoraires(LocalDateTime debut, LocalDateTime fin) {
        LocalTime ouverture = LocalTime.parse(debutTravail);
        LocalTime fermeture = LocalTime.parse(finTravail);
        java.util.Set<String> feries = new java.util.HashSet<>(java.util.Arrays.asList(joursFeries.split(",")));
        if (!debut.toLocalDate().equals(fin.toLocalDate())
                || debut.toLocalTime().isBefore(ouverture) || fin.toLocalTime().isAfter(fermeture)) return true;
        if (debut.toLocalTime().isBefore(LocalTime.parse(finPause))
                && fin.toLocalTime().isAfter(LocalTime.parse(debutPause))) return true;
        LocalDate jour = debut.toLocalDate();
        LocalDate dernierJour = fin.toLocalDate();
        while (!jour.isAfter(dernierJour)) {
            DayOfWeek jourSemaine = jour.getDayOfWeek();
            if (jourSemaine == DayOfWeek.SATURDAY || jourSemaine == DayOfWeek.SUNDAY
                    || feries.stream().map(String::trim).anyMatch(jour.toString()::equals)) return true;
            jour = jour.plusDays(1);
        }
        return false;
    }

    static boolean traverseNuit(LocalDateTime debut, LocalDateTime fin) {
        return traverseNuit(debut, fin, LocalTime.of(6, 0), LocalTime.of(18, 0));
    }

    public boolean ordreMissionValide(Reservation r, Vehicule v) {
        return !CategorieVehicule.estVehiculeMission(v.getCategorie()) || justificatifs.findByReservationOrderByDateDepotDesc(r).stream().anyMatch(j ->
                    j.getType() == TypeJustificatif.ORDRE_MISSION && Boolean.TRUE.equals(j.getValide())
                    && j.getValidePar() != null && j.getDateValidation() != null);
    }

    private static boolean traverseNuit(LocalDateTime debut, LocalDateTime fin, LocalTime ouverture, LocalTime fermeture) {
        return !debut.toLocalDate().equals(fin.toLocalDate())
                || debut.toLocalTime().isBefore(ouverture)
                || !debut.toLocalTime().isBefore(fermeture)
                || fin.toLocalTime().isAfter(fermeture);
    }
}
