package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Assurance;
import com.vehicule.Spat.vehicule.spat_backend.repository.AssuranceRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/assurances")
public class AssuranceController {

    private final AssuranceRepository assuranceRepository;

    public AssuranceController(AssuranceRepository assuranceRepository) {
        this.assuranceRepository = assuranceRepository;
    }

    @PostMapping
    public ResponseEntity<Assurance> creer(@RequestBody Assurance assurance) {
        return ResponseEntity.ok(assuranceRepository.save(assurance));
    }

    @GetMapping
    public List<Assurance> lister() {
        return assuranceRepository.findAll();
    }

    // Alertes J-15 : assurances qui expirent dans les 15 prochains jours ou déjà expirées
    @GetMapping("/alertes")
    public List<Assurance> alertesExpiration() {
        return assuranceRepository.findByDateExpirationLessThanEqual(LocalDate.now().plusDays(15));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Assurance> modifier(@PathVariable UUID id, @RequestBody Assurance donnees) {
        return assuranceRepository.findById(id)
                .map(a -> {
                    a.setNumeroPolice(donnees.getNumeroPolice());
                    a.setDateExpiration(donnees.getDateExpiration());
                    a.setVehicule(donnees.getVehicule());
                    return ResponseEntity.ok(assuranceRepository.save(a));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> supprimer(@PathVariable UUID id) {
        assuranceRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
