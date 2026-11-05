package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.GpsPositionResponse;
import com.vehicule.Spat.vehicule.spat_backend.dto.GpsHistoriqueResponse;
import com.vehicule.Spat.vehicule.spat_backend.model.Direction;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService;
import com.vehicule.Spat.vehicule.spat_backend.service.GpsService;
import com.vehicule.Spat.vehicule.spat_backend.service.GpsHistoriqueService;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/gps")
public class GpsController {
    private static final Set<String> ROLES_DIRECTION = Set.of(
            "ASSISTANT_DIRECTION", "AGENT_PAR_INTERIM_ASSISTANT",
            "CHEF_DIRECTION", "AGENT_PAR_INTERIM_CHEF"
    );

    private final GpsService gpsService;
    private final GpsHistoriqueService historiqueService;
    private final AccesParcoursService accesParcours;
    private final VehiculeRepository vehiculeRepository;

    public GpsController(GpsService gpsService, GpsHistoriqueService historiqueService,
                         AccesParcoursService accesParcours, VehiculeRepository vehiculeRepository) {
        this.gpsService = gpsService;
        this.historiqueService = historiqueService;
        this.accesParcours = accesParcours;
        this.vehiculeRepository = vehiculeRepository;
    }

    /** Même source GPS qu'Agent Flotte, limitée à la Direction de l'utilisateur connecté. */
    @GetMapping("/positions")
    public ResponseEntity<List<GpsPositionResponse>> obtenirPositions() {
        Utilisateur utilisateur = accesParcours.courant();
        if (ROLES_DIRECTION.contains(AccesParcoursService.role(utilisateur))) {
            return ResponseEntity.ok(positionsPourDirection(utilisateur));
        }
        return ResponseEntity.ok(gpsService.getPositions());
    }

    @GetMapping("/positions-direction")
    public ResponseEntity<List<GpsPositionResponse>> obtenirPositionsDirection() {
        Utilisateur utilisateur = accesParcours.courant();
        if (!ROLES_DIRECTION.contains(AccesParcoursService.role(utilisateur))) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(positionsPourDirection(utilisateur));
    }

    private List<GpsPositionResponse> positionsPourDirection(Utilisateur utilisateur) {
        if (utilisateur.getDirectionId() == null) {
            return List.of();
        }

        Set<Long> appareilsAffectes = vehiculeRepository.findAll().stream()
                .filter(vehicule -> estAffecteA(vehicule, utilisateur.getDirectionId()))
                .filter(vehicule -> Boolean.TRUE.equals(vehicule.getGpsEquipe())
                        && vehicule.getGpsDeviceId() != null)
                .map(Vehicule::getGpsDeviceId)
                .collect(Collectors.toSet());

        return gpsService.getPositions().stream()
                .filter(position -> appareilsAffectes.contains(position.getGpsDeviceId()))
            .toList();
    }

    private boolean estAffecteA(Vehicule vehicule, Long directionId) {
        return vehicule.getDirections() != null && vehicule.getDirections().stream()
                .map(Direction::getId)
                .anyMatch(directionId::equals);
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
