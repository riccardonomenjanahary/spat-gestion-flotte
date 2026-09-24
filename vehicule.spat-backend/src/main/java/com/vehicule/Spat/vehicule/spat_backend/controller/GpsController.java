package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.GpsPositionResponse;
import com.vehicule.Spat.vehicule.spat_backend.dto.GpsHistoriqueResponse;
import com.vehicule.Spat.vehicule.spat_backend.service.GpsService;
import com.vehicule.Spat.vehicule.spat_backend.service.GpsHistoriqueService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/gps")
public class GpsController {

    private final GpsService gpsService;
    private final GpsHistoriqueService historiqueService;

    public GpsController(GpsService gpsService, GpsHistoriqueService historiqueService) {
        this.gpsService = gpsService;
        this.historiqueService = historiqueService;
    }

    // API déjà existante : aucune modification de son contrat.
    @GetMapping("/positions")
    public List<GpsPositionResponse> obtenirToutesLesPositions() {
        return gpsService.getPositions();
    }

    // L'historique est associé à l'ID du véhicule SPAT et à une date locale.
    // Exemple : GET /api/gps/historique?vehiculeId=12&date=2026-09-22
    @GetMapping("/historique")
    public GpsHistoriqueResponse obtenirHistorique(
            @RequestParam Long vehiculeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return historiqueService.obtenirHistorique(vehiculeId, date);
    }

    @GetMapping("/positions/{gpsDeviceId}")
    public ResponseEntity<GpsPositionResponse> obtenirPosition(
            @PathVariable Long gpsDeviceId) {
        GpsPositionResponse position = gpsService.getPositionParDeviceId(gpsDeviceId);
        if (position == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(position);
    }
}
