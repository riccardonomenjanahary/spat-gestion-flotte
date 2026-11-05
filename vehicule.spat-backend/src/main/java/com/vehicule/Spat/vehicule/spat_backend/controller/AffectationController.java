package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Affectation;
import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.AffectationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ChauffeurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/affectations")
public class AffectationController {

    private final AffectationRepository affectationRepository;
    private final ChauffeurRepository chauffeurRepository;
    private final VehiculeRepository vehiculeRepository;
    private final com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository reservations;
    private final com.vehicule.Spat.vehicule.spat_backend.service.ReglesDispositifService regles;

    public AffectationController(
            AffectationRepository affectationRepository,
            ChauffeurRepository chauffeurRepository,
            VehiculeRepository vehiculeRepository,
            com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository reservations,
            com.vehicule.Spat.vehicule.spat_backend.service.ReglesDispositifService regles
    ) {
        this.affectationRepository = affectationRepository;
        this.chauffeurRepository = chauffeurRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.reservations = reservations;
        this.regles = regles;
    }

    @GetMapping
    public List<Affectation> lister(
            @RequestParam(required = false) Long vehiculeId
    ) {

        if (vehiculeId != null) {
            return affectationRepository.findByVehiculeId(vehiculeId);
        }

        return affectationRepository.findAll();
    }

    @PostMapping
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> creer(
            @RequestBody Map<String, Object> body
    ) {

        if (body.get("reservationId") == null || body.get("chauffeurId") == null || body.get("vehiculeId") == null)
            return ResponseEntity.badRequest().body("Un ticket validé, un véhicule et un chauffeur sont obligatoires.");
        Long reservationId;
        try { reservationId = Long.valueOf(body.get("reservationId").toString()); }
        catch (NumberFormatException e) { return ResponseEntity.badRequest().body("Numéro de ticket invalide."); }
        var reservation = reservations.findByIdForUpdate(reservationId).orElse(null);
        if (reservation == null || !Set.of("VALIDEE", "PLANIFIEE").contains(reservation.getStatut())
                || reservation.getVehicule() == null || reservation.getChauffeur() == null)
            return ResponseEntity.status(409).body("L'affectation nécessite un ticket validé avec véhicule et chauffeur.");

        Long chauffeurId =
                Long.valueOf(body.get("chauffeurId").toString());

        Long vehiculeId =
                Long.valueOf(body.get("vehiculeId").toString());

        String destination =
                (String) body.get("destination");

        String description =
                (String) body.get("description");

        Chauffeur chauffeur =
                chauffeurRepository
                        .findById(chauffeurId)
                        .orElse(null);

        Vehicule vehicule =
                vehiculeRepository
                        .findByIdForUpdate(vehiculeId)
                        .orElse(null);

        if (chauffeur == null || vehicule == null) {
            return ResponseEntity
                    .badRequest()
                    .body("Chauffeur ou véhicule introuvable");
        }

        if (!vehiculeId.equals(reservation.getVehicule().getId())
                || !chauffeurId.equals(reservation.getChauffeur().getId()))
            return ResponseEntity.status(409).body("Les ressources doivent correspondre à celles du ticket validé.");
        String erreur = regles.verifier(reservation);
        if (erreur != null) return ResponseEntity.status(409).body(erreur);
        LocalDateTime maintenant = LocalDateTime.now();
        if (maintenant.isBefore(reservation.getDateDebut()) || !maintenant.isBefore(reservation.getDateFin()))
            return ResponseEntity.status(409).body("La sortie doit avoir lieu pendant la période autorisée du ticket.");

        if (!"DISPONIBLE".equalsIgnoreCase(vehicule.getStatut())) {
            return ResponseEntity.status(409)
                    .body("Seul un véhicule disponible peut être affecté.");
        }

        Affectation affectation = new Affectation();

        affectation.setChauffeur(chauffeur);
        affectation.setVehicule(vehicule);
        affectation.setDestination(reservation.getDestination());
        affectation.setDescription("Ticket " + reservation.getId() + " : " + reservation.getMotif());
        affectation.setDateDebut(LocalDateTime.now());
        affectation.setStatut("ACTIVE");

        Affectation sauvegarde =
                affectationRepository.save(affectation);

        chauffeur.setStatut("EN_MISSION");
        chauffeurRepository.save(chauffeur);

        vehicule.setStatut("EN_MISSION");
        vehiculeRepository.save(vehicule);

        // TODO : envoi d'email au chauffeur

        return ResponseEntity.ok(sauvegarde);
    }

}
