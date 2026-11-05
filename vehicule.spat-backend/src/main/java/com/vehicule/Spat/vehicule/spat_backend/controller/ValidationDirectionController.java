package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.DecisionReservationRequest;
import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import com.vehicule.Spat.vehicule.spat_backend.service.*;
import org.springframework.beans.BeanUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Set;

@RestController
@RequestMapping("/api/reservations")
public class ValidationDirectionController {
    private final ReservationRepository reservations;
    private final VehiculeRepository vehicules;
    private final ChauffeurRepository chauffeurs;
    private final AccesParcoursService acces;
    private final ReglesDispositifService regles;

    public ValidationDirectionController(ReservationRepository reservations, VehiculeRepository vehicules,
            ChauffeurRepository chauffeurs, AccesParcoursService acces, ReglesDispositifService regles) {
        this.reservations = reservations; this.vehicules = vehicules; this.chauffeurs = chauffeurs;
        this.acces = acces; this.regles = regles;
    }

    @PutMapping("/{id}/assistant-direction/decision")
    @Transactional
    public ResponseEntity<?> decider(@PathVariable Long id, @RequestBody DecisionReservationRequest request) {
        Utilisateur auteur = acces.courant();
        if (!Set.of("ASSISTANT_DIRECTION", "AGENT_PAR_INTERIM_ASSISTANT").contains(AccesParcoursService.role(auteur))) return ResponseEntity.status(403).build();
        Reservation r = reservations.findByIdForUpdate(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        if (!acces.directionVehicule(auteur, r.getVehicule())) return ResponseEntity.status(403).build();
        if (r.getVehicule() == null || (!CategorieVehicule.estMotoElectrique(r.getVehicule().getCategorie())
                && !CategorieVehicule.estVoitureMutualisee(r.getVehicule().getCategorie())))
            return ResponseEntity.status(403).body("Cette catégorie relève du Service Logistique.");
        if (!Set.of("EN_ATTENTE", "VALIDEE_N1").contains(r.getStatut()))
            return ResponseEntity.status(409).body("Cette demande a déjà été traitée.");
        if (request == null || request.getStatut() == null) return ResponseEntity.badRequest().build();
        LocalDateTime maintenant = LocalDateTime.now();
        if ("REFUSEE".equals(request.getStatut())) {
            if (request.getMotifRefus() == null || request.getMotifRefus().isBlank())
                return ResponseEntity.badRequest().body("Le motif de refus est obligatoire.");
            r.setStatut("REFUSEE"); r.setMotifRefus(request.getMotifRefus().trim());
            r.setRefusePar(auteur); r.setDateRefus(maintenant);
            return ResponseEntity.ok(reservations.save(r));
        }
        if (!"VALIDEE".equals(request.getStatut())) return ResponseEntity.badRequest().body("Décision invalide.");
        if (r.getDateDebut() == null || !r.getDateDebut().isAfter(maintenant))
            return ResponseEntity.status(409).body("La validation doit précéder le départ. Replanifiez cette demande.");
        Long vehiculeId = request.getVehiculeId() != null ? request.getVehiculeId() : r.getVehicule().getId();
        Vehicule v = vehicules.findByIdForUpdate(vehiculeId).orElse(null);
        if (v == null) return ResponseEntity.status(409).body("Véhicule introuvable.");
        if (!acces.directionVehicule(auteur, v)) return ResponseEntity.status(403).body("Ce véhicule n'est pas affecté à votre groupe de Directions.");
        boolean motoDemandee = CategorieVehicule.estMotoElectrique(r.getVehicule().getCategorie());
        if ((motoDemandee && !CategorieVehicule.estMotoElectrique(v.getCategorie()))
                || (!motoDemandee && !CategorieVehicule.estVoitureMutualisee(v.getCategorie())))
            return ResponseEntity.badRequest().body("Le véhicule choisi ne correspond pas à la catégorie demandée.");
        // Une copie évite toute modification persistée lors d'un refus métier (JPA dirty checking).
        Reservation candidat = new Reservation(); BeanUtils.copyProperties(r, candidat); candidat.setVehicule(v);
        if (!CategorieVehicule.estMotoElectrique(v.getCategorie())) {
            Long chauffeurId = request.getChauffeurId() != null ? request.getChauffeurId()
                    : r.getChauffeur() != null ? r.getChauffeur().getId() : null;
            if (chauffeurId == null) return ResponseEntity.badRequest().body("Sélectionnez un chauffeur.");
            candidat.setChauffeur(chauffeurs.findByIdForUpdate(chauffeurId).orElse(null));
        } else candidat.setChauffeur(null);
        String erreur = regles.verifier(candidat);
        if (erreur != null) return ResponseEntity.status(409).body(erreur);
        r.setVehicule(v); r.setChauffeur(candidat.getChauffeur());
        r.setBesoinChauffeur(!CategorieVehicule.estMotoElectrique(v.getCategorie()));
        r.setStatut("VALIDEE"); r.setValidationN1Par(auteur); r.setDateValidationN1(maintenant);
        r.setValidationN2Par(auteur); r.setDateValidationN2(maintenant); r.setARegulariser(false);
        return ResponseEntity.ok(reservations.save(r));
    }
}
