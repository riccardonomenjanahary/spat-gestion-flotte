package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.StatutMaintenance;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final VehiculeRepository vehiculeRepository;
    private final ReservationRepository reservationRepository;
    private final MaintenanceRepository maintenanceRepository;
    private final AssuranceRepository assuranceRepository;

    public DashboardController(VehiculeRepository vehiculeRepository,
                               ReservationRepository reservationRepository,
                               MaintenanceRepository maintenanceRepository,
                               AssuranceRepository assuranceRepository) {
        this.vehiculeRepository = vehiculeRepository;
        this.reservationRepository = reservationRepository;
        this.maintenanceRepository = maintenanceRepository;
        this.assuranceRepository = assuranceRepository;
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

        return resultat;
    }
}
