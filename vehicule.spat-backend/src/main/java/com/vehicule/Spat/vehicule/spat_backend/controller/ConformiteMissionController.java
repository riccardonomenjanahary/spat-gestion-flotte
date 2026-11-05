package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService;
import com.vehicule.Spat.vehicule.spat_backend.model.CategorieVehicule;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

/** Justifications préparées avant la décision, avec auteur tracé par le journal HTTP. */
@RestController
@RequestMapping("/api/reservations")
public class ConformiteMissionController {
    private final ReservationRepository reservations;
    private final AccesParcoursService acces;
    public ConformiteMissionController(ReservationRepository reservations, AccesParcoursService acces) {
        this.reservations = reservations; this.acces = acces;
    }
    @PutMapping("/{id}/conformite")
    @Transactional
    public ResponseEntity<?> justifier(@PathVariable Long id, @RequestBody Map<String, String> body) {
        var auteur = acces.courant();
        var r = reservations.findByIdForUpdate(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        boolean assistant = r.getVehicule() != null && (CategorieVehicule.estVoitureMutualisee(r.getVehicule().getCategorie())
                || CategorieVehicule.estMotoElectrique(r.getVehicule().getCategorie()));
        String role = AccesParcoursService.role(auteur);
        if (assistant ? !("ASSISTANT_DIRECTION".equals(role) && acces.directionVehicule(auteur, r.getVehicule()))
                : !Set.of("CHEF_SERVICE_LOGISTIQUE", "CHEF_DGAL").contains(role))
            return ResponseEntity.status(403).build();
        if (!Set.of("EN_ATTENTE", "EN_ATTENTE_AVIS_DID", "VALIDEE_N1").contains(r.getStatut())
                || r.getDateDebut() == null || !r.getDateDebut().isAfter(LocalDateTime.now()))
            return ResponseEntity.status(409).body("La justification doit précéder la validation et le départ.");
        String urgence = body.getOrDefault("motifUrgence", "").trim();
        String observations = body.getOrDefault("observations", "").trim();
        if (urgence.length() > 1000 || observations.length() > 2000)
            return ResponseEntity.badRequest().body("Justification trop longue.");
        r.setMotifUrgence(urgence.isBlank() ? null : urgence);
        r.setDemandeUrgente(!urgence.isBlank());
        r.setHorsDelai24h(r.getDateCreation() != null && r.getDateDebut().isBefore(r.getDateCreation().plusHours(24)));
        r.setTypeDemande(!urgence.isBlank() ? "URGENTE" : "PLANIFIEE");
        r.setObservations(observations.isBlank() ? null : observations);
        return ResponseEntity.ok(reservations.save(r));
    }
}
