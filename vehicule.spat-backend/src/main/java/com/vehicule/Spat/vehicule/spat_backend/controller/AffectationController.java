package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Affectation;
import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.AffectationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/affectations")
public class AffectationController {

    private final AffectationRepository affectationRepository;
    private final ChauffeurRepository chauffeurRepository;
    private final VehiculeRepository vehiculeRepository;

    public AffectationController(
            AffectationRepository affectationRepository,
            ChauffeurRepository chauffeurRepository,
            VehiculeRepository vehiculeRepository
    ) {
        this.affectationRepository = affectationRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.vehiculeRepository = vehiculeRepository;
    }

    @GetMapping
    public List<Affectation> lister(
            @RequestParam(required = false) Long vehiculeId
    ) {

        if (vehiculeId != null) {
            return affectationRepository.findByVehiculeId(vehiculeId);
        }

        return affectationRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> creer(
            @RequestBody Map<String, Object> body
    ) {

        Long chauffeurId =
                Long.valueOf(body.get("chauffeurId").toString());

        Long vehiculeId =
                Long.valueOf(body.get("vehiculeId").toString());

        String destination =
                (String) body.get("destination");

        String description =
                (String) body.get("description");

        Chauffeur chauffeur =
                chauffeurRepository
                        .findById(chauffeurId)
                        .orElse(null);

        Vehicule vehicule =
                vehiculeRepository
                        .findById(vehiculeId)
                        .orElse(null);

        if (chauffeur == null || vehicule == null) {
            return ResponseEntity
                    .badRequest()
                    .body("Chauffeur ou véhicule introuvable");
        }

        Affectation affectation = new Affectation();

        affectation.setChauffeur(chauffeur);
        affectation.setVehicule(vehicule);
        affectation.setDestination(destination);
        affectation.setDescription(description);
        affectation.setDateDebut(LocalDateTime.now());
        affectation.setStatut("ACTIVE");

        Affectation sauvegarde =
                affectationRepository.save(affectation);

        chauffeur.setStatut("EN_MISSION");
        chauffeurRepository.save(chauffeur);

        vehicule.setStatut("EN_MISSION");
        vehiculeRepository.save(vehicule);

        // TODO : envoi d'email au chauffeur

        return ResponseEntity.ok(sauvegarde);
    }
}