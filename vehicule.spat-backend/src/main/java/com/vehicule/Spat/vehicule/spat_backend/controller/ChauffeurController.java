package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Affectation;
import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.AffectationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chauffeurs")
public class ChauffeurController {

    private final ChauffeurRepository chauffeurRepository;
    private final AffectationRepository affectationRepository;
    private final VehiculeRepository vehiculeRepository;

    public ChauffeurController(
            ChauffeurRepository chauffeurRepository,
            AffectationRepository affectationRepository,
            VehiculeRepository vehiculeRepository
    ) {
        this.chauffeurRepository = chauffeurRepository;
        this.affectationRepository = affectationRepository;
        this.vehiculeRepository = vehiculeRepository;
    }

    @GetMapping
    public List<Chauffeur> lister() {
        return chauffeurRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> creer(@RequestBody Chauffeur chauffeur) {

        if (chauffeur.getStatut() == null || chauffeur.getStatut().isBlank()) {
            chauffeur.setStatut("DISPONIBLE");
        }

        Chauffeur sauvegarde = chauffeurRepository.save(chauffeur);

        return ResponseEntity.ok(sauvegarde);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> modifier(
            @PathVariable Long id,
            @RequestBody Chauffeur donnees
    ) {

        return chauffeurRepository.findById(id)
                .map(chauffeur -> {

                    chauffeur.setMatricule(donnees.getMatricule());
                    chauffeur.setNom(donnees.getNom());
                    chauffeur.setPrenom(donnees.getPrenom());
                    chauffeur.setTelephone(donnees.getTelephone());
                    chauffeur.setEmail(donnees.getEmail());
                    chauffeur.setNumeroPermis(donnees.getNumeroPermis());
                    chauffeur.setAffectationService(donnees.getAffectationService());

                    if (donnees.getStatut() != null
                            && !donnees.getStatut().isBlank()) {
                        chauffeur.setStatut(donnees.getStatut());
                    }

                    Chauffeur sauvegarde =
                            chauffeurRepository.save(chauffeur);

                    return ResponseEntity.ok(sauvegarde);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> supprimer(@PathVariable Long id) {

        if (!chauffeurRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        List<Affectation> affectations =
                affectationRepository.findByChauffeurId(id);

        for (Affectation affectation : affectations) {

            if ("ACTIVE".equals(affectation.getStatut())
                    && affectation.getVehicule() != null) {

                Vehicule vehicule = affectation.getVehicule();

                vehicule.setStatut("DISPONIBLE");

                vehiculeRepository.save(vehicule);
            }
        }

        affectationRepository.deleteByChauffeurId(id);

        chauffeurRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}