package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.service.EntretienPeriodiqueService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/entretien-periodique")
public class EntretienPeriodiqueController {

    private final EntretienPeriodiqueService entretienPeriodiqueService;

    public EntretienPeriodiqueController(EntretienPeriodiqueService entretienPeriodiqueService) {
        this.entretienPeriodiqueService = entretienPeriodiqueService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> lister() {
        return ResponseEntity.ok(entretienPeriodiqueService.listerResumes());
    }
}
