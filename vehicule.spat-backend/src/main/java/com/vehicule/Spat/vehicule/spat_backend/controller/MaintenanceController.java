package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Maintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.MaintenanceService;
import com.vehicule.Spat.vehicule.spat_backend.service.EntretienPeriodiqueService;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/maintenances")
public class MaintenanceController {
    private final MaintenanceService maintenanceService;
    private final VehiculeRepository vehiculeRepository;
    private final ReservationRepository reservationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final EntretienPeriodiqueService entretienPeriodiqueService;
    public MaintenanceController(MaintenanceService maintenanceService,
                                 VehiculeRepository vehiculeRepository,
                                 ReservationRepository reservationRepository,
                                 UtilisateurRepository utilisateurRepository,
                                 EntretienPeriodiqueService entretienPeriodiqueService) {
        this.maintenanceService = maintenanceService;
        this.vehiculeRepository = vehiculeRepository;
        this.reservationRepository = reservationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.entretienPeriodiqueService = entretienPeriodiqueService;
    }

    // Route existante conservée pour les utilisateurs déjà autorisés.
    @PostMapping
    public ResponseEntity<?> creer(@RequestBody CreateMaintenanceRequest request) {
        if (request == null || request.getVehiculeId() == null)
            return ResponseEntity.badRequest().body("Le véhicule est obligatoire.");
        Vehicule vehicule = vehiculeRepository.findById(request.getVehiculeId()).orElse(null);
        if (vehicule == null)
            return ResponseEntity.badRequest().body("Véhicule introuvable : " + request.getVehiculeId());
        if (request.getNatureIntervention() == null || request.getNatureIntervention().isBlank())
            return ResponseEntity.badRequest().body("La nature de l'intervention est obligatoire.");
        Maintenance maintenance = new Maintenance();
        maintenance.setVehicule(vehicule);
        maintenance.setNatureIntervention(request.getNatureIntervention().trim());
        return ResponseEntity.ok(maintenanceService.creer(maintenance));
    }

    @GetMapping
    public ResponseEntity<List<Maintenance>> lister() {
        return ResponseEntity.ok(maintenanceService.listerToutes());
    }

    @GetMapping("/en-attente-avis")
    public ResponseEntity<List<Maintenance>> listerEnAttenteAvis() {
        return ResponseEntity.ok(maintenanceService.listerEnAttenteAvis());
    }

    // Avis DID existant : ne concerne pas les demandes d'entretien soumises au chef.
    @PutMapping("/{id}/avis-did")
    public ResponseEntity<Maintenance> avisDID(@PathVariable UUID id,
                                               @RequestBody Map<String, String> body, Authentication authentication) {
        return ResponseEntity.ok(maintenanceService.enregistrerAvisDID(id,
                body.get("diagnosticVisuel"), body.get("observationsMecanicien"),
                body.get("piecesNecessaires"), body.get("decision"),
                authentication == null ? null : authentication.getName()));
    }

    @PutMapping("/{id}/validation-n1")
    public ResponseEntity<Maintenance> validationN1(@PathVariable UUID id) {
        return ResponseEntity.ok(maintenanceService.validerN1(id));
    }

    @PutMapping("/{id}/validation-n2")
    public ResponseEntity<Maintenance> validationN2(@PathVariable UUID id) {
        return ResponseEntity.ok(maintenanceService.validerN2(id));
    }

    // Mécanicien : crée sa propre demande, visible par le chef uniquement
    // jusqu'à la validation; ce n'est PAS une nouvelle demande d'avis DID.
    @PostMapping("/demandes-entretien")
    public ResponseEntity<?> demandeMecanicien(@RequestBody CreateMaintenanceRequest request,
                                               Authentication authentication) {
        if (authentication == null)
            return ResponseEntity.status(401).body("Authentification requise.");
        if (request == null || request.getVehiculeId() == null)
            return ResponseEntity.badRequest().body("Le véhicule est obligatoire.");
        Vehicule vehicule = vehiculeRepository.findById(request.getVehiculeId()).orElse(null);
        if (vehicule == null)
            return ResponseEntity.badRequest().body("Véhicule introuvable.");
        if (request.getNatureIntervention() == null || request.getNatureIntervention().isBlank())
            return ResponseEntity.badRequest().body("La nature de l'intervention est obligatoire.");
        Maintenance entretien = new Maintenance();
        entretien.setVehicule(vehicule);
        if (request.getReservationId() != null) {
            entretien.setReservation(reservationRepository.findById(request.getReservationId()).orElse(null));
        }
        entretien.setNatureIntervention(request.getNatureIntervention().trim());
        boolean assistantDirection = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ASSISTANT_DIRECTION".equals(authority.getAuthority()));
        if (assistantDirection) {
            Utilisateur utilisateur = utilisateurRepository.findByMatricule(authentication.getName()).orElse(null);
            boolean vehiculeDeLaDirection = utilisateur != null && utilisateur.getDirectionId() != null
                    && vehicule.getDirections().stream().anyMatch(direction -> utilisateur.getDirectionId().equals(direction.getId()));
            if (!vehiculeDeLaDirection) {
                return ResponseEntity.status(403).body("Le véhicule sélectionné n'est pas affecté à votre direction.");
            }
            if (request.getReservationId() != null) {
                Reservation reservation = reservationRepository.findById(request.getReservationId()).orElse(null);
                if (reservation == null
                        || !"VILLE_TOAMASINA".equalsIgnoreCase(String.valueOf(reservation.getZoneMission()))
                        || reservation.getVehicule() == null
                        || !request.getVehiculeId().equals(reservation.getVehicule().getId())
                        || reservation.getDemandeur() == null
                        || !utilisateur.getDirectionId().equals(reservation.getDemandeur().getDirectionId())) {
                    return ResponseEntity.status(403).body("La demande de maintenance doit concerner une mission en ville de votre direction.");
                }
            }
        }
        return ResponseEntity.ok(maintenanceService.creerDemandeEntretien(entretien,
                assistantDirection ? "ASSISTANT_DIRECTION" : "MECANICIEN_DID", authentication.getName()));
    }

    // Chef Service Logistique : accepte ou refuse une demande d'entretien.
    @PutMapping("/{id}/decision-entretien")
    public ResponseEntity<?> decisionEntretien(@PathVariable UUID id,
                                               @RequestBody Map<String, Object> body) {
        if (body == null || !(body.get("approuvee") instanceof Boolean approuvee))
            return ResponseEntity.badRequest().body("Le champ approuvee (booléen) est obligatoire.");
        String motif = body.get("motifRefus") == null ? null : String.valueOf(body.get("motifRefus"));
        try {
            return ResponseEntity.ok(maintenanceService.deciderDemandeEntretien(id, approuvee, motif));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        }
    }

    // Mécanicien : confirme le travail accompli et envoie son compte rendu.
    @PutMapping("/{id}/terminer-entretien")
    public ResponseEntity<?> terminerEntretien(@PathVariable UUID id,
                                               @RequestBody Map<String, String> body, Authentication authentication) {
        if (authentication == null)
            return ResponseEntity.status(401).body("Authentification requise.");
        try {
            return ResponseEntity.ok(maintenanceService.terminerEntretien(id,
                    body == null ? null : body.get("compteRendu"), authentication.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        }
    }

    @PutMapping("/{id}/cloturer-entretien")
    public ResponseEntity<?> cloturerEntretien(@PathVariable UUID id) {
        try {
            Maintenance maintenance = maintenanceService.cloturerDemandeEntretien(id);
            entretienPeriodiqueService.reinitialiserCycleDepuisMaintenance(id);
            return ResponseEntity.ok(maintenance);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        }
    }

    /** Transmission d'un dossier automatique des 5 000 km au mécanicien DID. */
    @PutMapping("/{id}/transmettre-periodique")
    public ResponseEntity<?> transmettrePeriodique(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(entretienPeriodiqueService.transmettrePeriodiqueAuDid(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        }
    }

    @PutMapping("/{id}/annuler-entretien")
    public ResponseEntity<?> annulerEntretien(@PathVariable UUID id,
                                              @RequestBody(required = false) Map<String, String> body) {
        try {
            return ResponseEntity.ok(maintenanceService.annulerDemandeEntretien(
                    id, body == null ? null : body.get("motif")));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        }
    }

    // Fiche de contrôle véhicule
    @PutMapping("/{id}/fiche-controle")
    public ResponseEntity<?> sauvegarderFicheControle(@PathVariable UUID id,
                                                        @RequestBody Map<String, String> body) {
        try {
            String ficheControle = body.get("ficheControle");
            if (ficheControle == null || ficheControle.isBlank()) {
                return ResponseEntity.badRequest().body("Les données de la fiche de contrôle sont obligatoires.");
            }
            return ResponseEntity.ok(maintenanceService.sauvegarderFicheControle(id, ficheControle));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        }
    }

    @PutMapping("/{id}/controle-avant-mission")
    public ResponseEntity<?> controlerAvantMission(@PathVariable UUID id,
                                                    @RequestBody Map<String, String> body,
                                                    Authentication authentication) {
        try {
            String ficheControle = body == null ? null : body.get("ficheControle");
            String mecanicien = authentication == null ? null : authentication.getName();
            return ResponseEntity.ok(maintenanceService.controlerAvantMission(id, ficheControle, mecanicien));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        }
    }

    @PutMapping("/{id}/controle-apres-mission")
    public ResponseEntity<?> controlerApresMission(@PathVariable UUID id,
                                                    @RequestBody Map<String, String> body,
                                                    Authentication authentication) {
        try {
            String ficheControle = body == null ? null : body.get("ficheControle");
            String mecanicien = authentication == null ? null : authentication.getName();
            return ResponseEntity.ok(maintenanceService.controlerApresMission(id, ficheControle, mecanicien));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        }
    }

    public static class CreateMaintenanceRequest {
        private Long vehiculeId;
        private Long reservationId;
        private String natureIntervention;
        public Long getVehiculeId() { return vehiculeId; }
        public void setVehiculeId(Long vehiculeId) { this.vehiculeId = vehiculeId; }
        public Long getReservationId() { return reservationId; }
        public void setReservationId(Long reservationId) { this.reservationId = reservationId; }
        public String getNatureIntervention() { return natureIntervention; }
        public void setNatureIntervention(String natureIntervention) {
            this.natureIntervention = natureIntervention;
        }
    }
}
