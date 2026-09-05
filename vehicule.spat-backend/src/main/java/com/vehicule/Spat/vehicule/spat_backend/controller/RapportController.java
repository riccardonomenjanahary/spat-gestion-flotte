package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Rapport;
import com.vehicule.Spat.vehicule.spat_backend.repository.RapportRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rapports")
public class RapportController {

    private final RapportRepository rapportRepository;

    public RapportController(RapportRepository rapportRepository) {
        this.rapportRepository = rapportRepository;
    }

    @GetMapping
    public List<Rapport> lister() {
        return rapportRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> creer(@RequestBody Rapport rapport) {
        return ResponseEntity.ok(rapportRepository.save(rapport));
    }
}
