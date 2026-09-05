package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Sinistre;
import com.vehicule.Spat.vehicule.spat_backend.repository.SinistreRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sinistres")
public class SinistreController {

    private final SinistreRepository sinistreRepository;

    public SinistreController(SinistreRepository sinistreRepository) {
        this.sinistreRepository = sinistreRepository;
    }

    @PostMapping
    public ResponseEntity<Sinistre> creer(@RequestBody Sinistre sinistre) {
        return ResponseEntity.ok(sinistreRepository.save(sinistre));
    }

    @GetMapping
    public List<Sinistre> lister() {
        return sinistreRepository.findAll();
    }
}
