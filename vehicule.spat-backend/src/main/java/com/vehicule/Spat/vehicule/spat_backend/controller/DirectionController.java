package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Direction;
import com.vehicule.Spat.vehicule.spat_backend.repository.DirectionRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Référentiel des Directions.
 *
 * La lecture est ouverte à tout utilisateur authentifié
 * (les formulaires de réservation l'utilisent).
 *
 * La création / modification / désactivation passe par
 * /api/admin/directions, déjà restreint par SecurityConfig
 * aux rôles ADMIN et SUPER_ADMIN en écriture.
 */
@RestController
@RequestMapping("/api")
public class DirectionController {

    private final DirectionRepository directionRepository;

    public DirectionController(
            DirectionRepository directionRepository
    ) {
        this.directionRepository = directionRepository;
    }

    // =========================================================
    // LISTER LES DIRECTIONS ACTIVES
    // =========================================================

    @GetMapping("/directions")
    public List<Direction> lister() {
        return directionRepository.findAll()
                .stream()
                .filter(Direction::isActif)
                .sorted(Comparator.comparing(Direction::getCode))
                .toList();
    }

    // =========================================================
    // LISTER TOUTES LES DIRECTIONS (y compris inactives)
    // =========================================================

    @GetMapping("/admin/directions")
    public List<Direction> listerToutes() {
        return directionRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(Direction::getCode))
                .toList();
    }

    // =========================================================
    // CREER UNE DIRECTION
    // =========================================================

    @PostMapping("/admin/directions")
    public ResponseEntity<?> creer(
            @RequestBody Direction direction
    ) {

        if (direction == null
                || direction.getCode() == null
                || direction.getCode().isBlank()
                || direction.getNom() == null
                || direction.getNom().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(
                            Map.of(
                                    "erreur",
                                    "Le code et le nom de la Direction sont obligatoires."
                            )
                    );
        }

        String code = direction.getCode().trim().toUpperCase();

        if (directionRepository.existsByCodeIgnoreCase(code)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(
                            Map.of(
                                    "erreur",
                                    "Une Direction avec ce code existe déjà."
                            )
                    );
        }

        Direction nouvelle = new Direction();
        nouvelle.setCode(code);
        nouvelle.setNom(direction.getNom().trim());
        nouvelle.setActif(true);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(directionRepository.save(nouvelle));
    }

    // =========================================================
    // MODIFIER UNE DIRECTION (renommage / activation)
    // =========================================================

    @PutMapping("/admin/directions/{id}")
    public ResponseEntity<?> modifier(
            @PathVariable Long id,
            @RequestBody Direction donnees
    ) {

        return directionRepository.findById(id)
                .map(direction -> {

                    if (donnees != null) {

                        if (donnees.getNom() != null
                                && !donnees.getNom().isBlank()) {
                            direction.setNom(donnees.getNom().trim());
                        }

                        direction.setActif(donnees.isActif());
                    }

                    return ResponseEntity.ok(
                            directionRepository.save(direction)
                    );
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
