package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Maintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.StatutMaintenance;
import com.vehicule.Spat.vehicule.spat_backend.service.MaintenanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/maintenances")
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    public MaintenanceController(MaintenanceService maintenanceService) {
        this.maintenanceService = maintenanceService;
    }

    @PostMapping
    public ResponseEntity<Maintenance> creer(@RequestBody Maintenance maintenance) {
        return ResponseEntity.ok(maintenanceService.creer(maintenance));
    }

    @GetMapping
    public ResponseEntity<List<Maintenance>> lister() {
        return ResponseEntity.ok(maintenanceService.listerToutes());
    }

    // Réservé au rôle MECANICIEN_DID via SecurityConfig
    @GetMapping("/en-attente-avis")
    public ResponseEntity<List<Maintenance>> listerEnAttenteAvis() {
        return ResponseEntity.ok(maintenanceService.listerEnAttenteAvis());
    }

    // Réservé au rôle MECANICIEN_DID via SecurityConfig
    @PutMapping("/{id}/avis")
    public ResponseEntity<Maintenance> enregistrerAvis(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {

        String avisTexte = body.get("avisTexte");
        String auteurEmail = authentication.getName(); // email du mécanicien connecté, via le JWT

        return ResponseEntity.ok(maintenanceService.enregistrerAvis(id, avisTexte, auteurEmail));
    }

    @PutMapping("/{id}/statut")
    public ResponseEntity<Maintenance> changerStatut(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {

        StatutMaintenance nouveauStatut = StatutMaintenance.valueOf(body.get("statut"));
        return ResponseEntity.ok(maintenanceService.changerStatut(id, nouveauStatut));
    }
}