package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.StatutMaintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Set;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final VehiculeRepository vehiculeRepository;
    private final ReservationRepository reservationRepository;
    private final MaintenanceRepository maintenanceRepository;
    private final AssuranceRepository assuranceRepository;
    private final com.vehicule.Spat.vehicule.spat_backend.repository.SignalementIncidentRepository signalementIncidentRepository;

    public DashboardController(VehiculeRepository vehiculeRepository,
                               ReservationRepository reservationRepository,
                               MaintenanceRepository maintenanceRepository,
                               AssuranceRepository assuranceRepository,
                               com.vehicule.Spat.vehicule.spat_backend.repository.SignalementIncidentRepository signalementIncidentRepository) {
        this.vehiculeRepository = vehiculeRepository;
        this.reservationRepository = reservationRepository;
        this.maintenanceRepository = maintenanceRepository;
        this.assuranceRepository = assuranceRepository;
        this.signalementIncidentRepository = signalementIncidentRepository;
    }

    @GetMapping("/resume")
    public Map<String, Object> resume() {
        Map<String, Object> resultat = new HashMap<>();

        long totalVehicules = vehiculeRepository.count();
        resultat.put("vehicules_total", totalVehicules);

        Map<String, Long> parStatutVehicule = new HashMap<>();
        vehiculeRepository.findAll().forEach(v ->
                parStatutVehicule.merge(v.getStatut(), 1L, Long::sum)
        );
        resultat.put("vehicules_par_statut", parStatutVehicule);

        resultat.put("entretiens_en_attente_avis",
                maintenanceRepository.findByStatut(StatutMaintenance.EN_ATTENTE_AVIS_DID).size());
        resultat.put("entretiens_en_cours",
                maintenanceRepository.findByStatut(StatutMaintenance.EN_COURS).size());

        resultat.put("assurances_alertes",
                assuranceRepository.findByDateExpirationLessThanEqual(LocalDate.now().plusDays(15)).size());

        // KPIs supplémentaires DGAL
        LocalDate aujourdHui = LocalDate.now();
        
        // Véhicules avec échéances imminentes (visite technique)
        long vehiculesVisiteTechniqueAlerte = vehiculeRepository.findAll().stream()
                .filter(v -> v.getDateExpirationVisiteTechnique() != null)
                .filter(v -> v.getDateExpirationVisiteTechnique().isBefore(aujourdHui.plusDays(15)))
                .count();
        resultat.put("vehicules_visite_technique_alerte", vehiculesVisiteTechniqueAlerte);

        // Véhicules avec entretien imminent
        long vehiculesEntretienAlerte = vehiculeRepository.findAll().stream()
                .filter(v -> v.getDateProchainEntretien() != null)
                .filter(v -> v.getDateProchainEntretien().isBefore(aujourdHui.plusDays(15)))
                .count();
        resultat.put("vehicules_entretien_alerte", vehiculesEntretienAlerte);

        // Réservations en cours
        long reservationsEnCours = reservationRepository.findAll().stream()
                .filter(r -> Set.of("VALIDEE", "PLANIFIEE", "EN_MISSION").contains(r.getStatut()))
                .count();
        resultat.put("reservations_en_cours", reservationsEnCours);

        // Taux d'utilisation global (sur les 30 derniers jours)
        LocalDate ilYA30Jours = aujourdHui.minusDays(30);
        long reservations30J = reservationRepository.findAll().stream()
                .filter(r -> r.getDateCreation() != null && r.getDateCreation().toLocalDate().isAfter(ilYA30Jours))
                .count();
        double tauxUtilisationGlobal = totalVehicules > 0 ? (double) reservations30J / totalVehicules : 0;
        resultat.put("taux_utilisation_global_30j", Math.round(tauxUtilisationGlobal * 100));

        return resultat;
    }

    /**
     * Statistiques détaillées par véhicule pour les exports DGAL
     */
    @GetMapping("/statistiques-par-vehicule")
    public List<Map<String, Object>> statistiquesParVehicule(
            @RequestParam(required = false) String periode) {
        LocalDate dateDebut = periode != null ? LocalDate.now().minusDays(getJoursPeriode(periode)) : LocalDate.now().minusDays(30);
        
        return vehiculeRepository.findAll().stream()
                .map(v -> {
                    Map<String, Object> stats = new LinkedHashMap<>();
                    stats.put("immatriculation", v.getImmatriculation());
                    stats.put("categorie", v.getCategorie());
                    stats.put("statut", v.getStatut());
                    stats.put("mode_detention", v.getModeDetention());
                    stats.put("date_expiration_visite_technique", v.getDateExpirationVisiteTechnique());
                    stats.put("date_prochain_entretien", v.getDateProchainEntretien());
                    
                    // Nombre de missions sur la période
                    long missions = reservationRepository.findByVehiculeId(v.getId()).stream()
                            .filter(r -> r.getDateCreation() != null && r.getDateCreation().toLocalDate().isAfter(dateDebut))
                            .count();
                    stats.put("nombre_missions", missions);
                    
                    // Taux d'utilisation
                    double tauxUtilisation = missions > 0 ? Math.min(100.0, missions * 10.0) : 0;
                    stats.put("taux_utilisation", Math.round(tauxUtilisation));
                    
                    // Échéances en alerte
                    boolean alerteVisite = v.getDateExpirationVisiteTechnique() != null 
                            && v.getDateExpirationVisiteTechnique().isBefore(LocalDate.now().plusDays(15));
                    boolean alerteEntretien = v.getDateProchainEntretien() != null 
                            && v.getDateProchainEntretien().isBefore(LocalDate.now().plusDays(15));
                    stats.put("alerte_echeance", alerteVisite || alerteEntretien);
                    
                    return stats;
                })
                .toList();
    }

    /**
     * Statistiques par Direction pour les exports DGAL
     */
    @GetMapping("/statistiques-par-direction")
    public List<Map<String, Object>> statistiquesParDirection(
            @RequestParam(required = false) String periode) {
        LocalDate dateDebut = periode != null ? LocalDate.now().minusDays(getJoursPeriode(periode)) : LocalDate.now().minusDays(30);
        
        Map<String, List<Reservation>> reservationsParDirection = new HashMap<>();
        reservationRepository.findAll().stream()
                .filter(r -> r.getDateCreation() != null && r.getDateCreation().toLocalDate().isAfter(dateDebut))
                .forEach(r -> {
                    String direction = r.getDemandeurEntite() != null ? r.getDemandeurEntite() : "Non renseigné";
                    reservationsParDirection.computeIfAbsent(direction, k -> new ArrayList<>()).add(r);
                });
        
        return reservationsParDirection.entrySet().stream()
                .map((Map.Entry<String, List<Reservation>> entry) -> {
                    Map<String, Object> stats = new LinkedHashMap<>();
                    stats.put("direction", entry.getKey());
                    stats.put("nombre_missions", entry.getValue().size());
                    
                    // Nombre de véhicules différents utilisés
                    long vehiculesUtilises = entry.getValue().stream()
                            .filter(r -> r.getVehicule() != null)
                            .map(r -> r.getVehicule().getId())
                            .distinct()
                            .count();
                    stats.put("vehicules_utilises", vehiculesUtilises);
                    
                    // Taux d'utilisation estimé
                    double tauxUtilisation = vehiculesUtilises > 0 ? Math.min(100.0, entry.getValue().size() * 5.0) : 0;
                    stats.put("taux_utilisation", Math.round(tauxUtilisation));
                    
                    return stats;
                })
                .sorted((Map<String, Object> a, Map<String, Object> b) ->
                        ((Number) b.get("nombre_missions")).intValue()
                                - ((Number) a.get("nombre_missions")).intValue())
                .toList();
    }

    private int getJoursPeriode(String periode) {
        return switch (periode != null ? periode.toLowerCase() : "30j") {
            case "7j" -> 7;
            case "30j" -> 30;
            case "90j" -> 90;
            default -> 30;
        };
    }

    /**
     * Statistiques des incidents pour le tableau de bord DGAL
     */
    @GetMapping("/incidents")
    public List<Map<String, Object>> statistiquesIncidents(
            @RequestParam(required = false) String periode) {
        LocalDate dateDebut = periode != null ? LocalDate.now().minusDays(getJoursPeriode(periode)) : LocalDate.now().minusDays(30);
        
        return signalementIncidentRepository.findAllByOrderByDateSignalementDesc().stream()
                .filter(s -> s.getDateSignalement() != null && s.getDateSignalement().toLocalDate().isAfter(dateDebut))
                .map(s -> {
                    Map<String, Object> incident = new LinkedHashMap<>();
                    incident.put("id", s.getId());
                    incident.put("type_incident", s.getTypeIncident());
                    incident.put("gravite", s.getGravite());
                    incident.put("statut", s.getStatut());
                    incident.put("date_signalement", s.getDateSignalement());
                    incident.put("description", s.getDescription());
                    incident.put("vehicule_immatriculation", s.getVehicule() != null ? s.getVehicule().getImmatriculation() : null);
                    incident.put("vehicule_categorie", s.getVehicule() != null ? s.getVehicule().getCategorie() : null);
                    return incident;
                })
                .toList();
    }

    /**
     * Échéances détaillées pour le tableau de bord DGAL
     */
    @GetMapping("/echeances")
    public List<Map<String, Object>> echeances() {
        LocalDate aujourdHui = LocalDate.now();
        List<Map<String, Object>> echeances = new ArrayList<>();
        
        // Échéances de visite technique
        vehiculeRepository.findAll().forEach(v -> {
            if (v.getDateExpirationVisiteTechnique() != null) {
                int joursAvant = (int) java.time.temporal.ChronoUnit.DAYS.between(aujourdHui, v.getDateExpirationVisiteTechnique());
                if (joursAvant <= 30) {
                    Map<String, Object> echeance = new LinkedHashMap<>();
                    echeance.put("vehicule_immatriculation", v.getImmatriculation());
                    echeance.put("type", "VISITE_TECHNIQUE");
                    echeance.put("date_echeance", v.getDateExpirationVisiteTechnique());
                    echeance.put("jours_avant", joursAvant);
                    echeance.put("niveau_alerte", niveauAlerte(joursAvant));
                    echeance.put("statut_vehicule", v.getStatut());
                    echeances.add(echeance);
                }
            }
        });
        
        // Échéances d'entretien
        vehiculeRepository.findAll().forEach(v -> {
            if (v.getDateProchainEntretien() != null) {
                int joursAvant = (int) java.time.temporal.ChronoUnit.DAYS.between(aujourdHui, v.getDateProchainEntretien());
                if (joursAvant <= 30) {
                    Map<String, Object> echeance = new LinkedHashMap<>();
                    echeance.put("vehicule_immatriculation", v.getImmatriculation());
                    echeance.put("type", "ENTRETIEN");
                    echeance.put("date_echeance", v.getDateProchainEntretien());
                    echeance.put("jours_avant", joursAvant);
                    echeance.put("niveau_alerte", niveauAlerte(joursAvant));
                    echeance.put("statut_vehicule", v.getStatut());
                    echeances.add(echeance);
                }
            }
        });
        
        // Échéances d'assurance
        assuranceRepository.findAll().forEach(a -> {
            if (a.getDateExpiration() != null) {
                int joursAvant = (int) java.time.temporal.ChronoUnit.DAYS.between(aujourdHui, a.getDateExpiration());
                if (joursAvant <= 30) {
                    Map<String, Object> echeance = new LinkedHashMap<>();
                    echeance.put("vehicule_immatriculation", a.getVehicule() != null ? a.getVehicule().getImmatriculation() : null);
                    echeance.put("type", "ASSURANCE");
                    echeance.put("date_echeance", a.getDateExpiration());
                    echeance.put("jours_avant", joursAvant);
                    echeance.put("niveau_alerte", niveauAlerte(joursAvant));
                    echeance.put("numero_police", a.getNumeroPolice());
                    echeances.add(echeance);
                }
            }
        });
        
        return echeances.stream()
                .sorted((a, b) -> ((Number) a.get("jours_avant")).intValue() - ((Number) b.get("jours_avant")).intValue())
                .toList();
    }

    private String niveauAlerte(int joursAvant) {
        if (joursAvant < 0) return "EXPIREE";
        if (joursAvant <= 7) return "CRITIQUE";
        if (joursAvant <= 15) return "MOYEN";
        return "INFORMATIONNEL";
    }
}
