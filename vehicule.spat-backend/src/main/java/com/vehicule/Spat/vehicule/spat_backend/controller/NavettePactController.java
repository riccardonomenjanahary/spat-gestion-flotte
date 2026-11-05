package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import com.vehicule.Spat.vehicule.spat_backend.service.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/** Circuit réservé aux occurrences PACT générées par le serveur. */
@RestController
@RequestMapping("/api/navettes-pact")
public class NavettePactController {
    private final ReservationRepository reservations;
    private final VehiculeRepository vehicules;
    private final ChauffeurRepository chauffeurs;
    private final ReglesDispositifService regles;
    private final ChauffeurAutoService compatibilite;
    private final AccesParcoursService acces;

    public NavettePactController(ReservationRepository reservations, VehiculeRepository vehicules,
            ChauffeurRepository chauffeurs, ReglesDispositifService regles,
            ChauffeurAutoService compatibilite, AccesParcoursService acces) {
        this.reservations = reservations; this.vehicules = vehicules;
        this.chauffeurs = chauffeurs; this.regles = regles;
        this.compatibilite = compatibilite; this.acces = acces;
    }

    private Utilisateur logisticien() {
        Utilisateur u = acces.courant();
        if (!"CHEF_SERVICE_LOGISTIQUE".equals(AccesParcoursService.role(u)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return u;
    }

    @GetMapping
    public List<Reservation> lister() {
        logisticien();
        return reservations.findAllByOrderByDateCreationDesc().stream()
                .filter(NavettePactService::estNavette).toList();
    }

    public record Affectation(Long vehiculeId, Long chauffeurId) {}

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<java.util.Map<String, String>> erreur(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(java.util.Map.of("erreur",
                exception.getReason() == null ? "Accès ou opération refusé." : exception.getReason()));
    }

    @PutMapping("/{id}/affectation")
    @Transactional
    public Reservation affecter(@PathVariable Long id, @RequestBody Affectation choix) {
        Utilisateur auteur = logisticien();
        Reservation r = reservations.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!NavettePactService.estNavette(r) || !"EN_ATTENTE".equals(r.getStatut()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Seule une navette PACT en attente peut être affectée.");
        if (r.getDateDebut() == null || !r.getDateDebut().isAfter(LocalDateTime.now(ZoneId.of("Indian/Antananarivo"))))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Le départ doit être futur.");
        if (choix == null || choix.vehiculeId() == null || choix.chauffeurId() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Véhicule et chauffeur obligatoires.");
        Vehicule v = vehicules.findByIdForUpdate(choix.vehiculeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Véhicule introuvable."));
        if (!(CategorieVehicule.estVoitureMutualisee(v.getCategorie())
                || CategorieVehicule.estVehiculeMission(v.getCategorie())
                || "Voiture de service".equalsIgnoreCase(v.getCategorie())))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La navette nécessite une voiture hors patrouille.");
        Chauffeur c = chauffeurs.findByIdForUpdate(choix.chauffeurId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chauffeur introuvable."));
        if (!compatibilite.estCompatible(v, c))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chauffeur incompatible avec le véhicule.");
        r.setVehicule(v); r.setChauffeur(c); r.setBesoinChauffeur(true);
        String erreur = regles.verifier(r);
        if (erreur != null) throw new ResponseStatusException(HttpStatus.CONFLICT, erreur);
        if (!regles.ordreMissionValide(r, v))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Un ordre de mission signé et validé est obligatoire pour ce véhicule de mission.");
        // Attribution manuelle tracée ; aucune décision DGAL supplémentaire.
        r.setValidationN1Par(auteur); r.setDateValidationN1(LocalDateTime.now());
        r.setStatut("PLANIFIEE"); r.setMobilisabilite("VERROUILLEE");
        return reservations.save(r);
    }
}
