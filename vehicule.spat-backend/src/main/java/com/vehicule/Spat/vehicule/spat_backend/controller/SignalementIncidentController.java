package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import com.vehicule.Spat.vehicule.spat_backend.service.NotificationService;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.text.Normalizer;

/**
 * Signalement immédiat d'incidents.
 *
 * Un bouton de signalement immédiat (panne, dommage,
 * contravention, accident) alerte le Service Logistique
 * du DGAL et l'assistante concernée, avec passage
 * automatique du véhicule en statut indisponible.
 */
@RestController
@RequestMapping("/api/signalements-incidents")
public class SignalementIncidentController {

    private final SignalementIncidentRepository signalementRepository;
    private final VehiculeRepository vehiculeRepository;
    private final ReservationRepository reservationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final NotificationService notificationService;

    public SignalementIncidentController(
            SignalementIncidentRepository signalementRepository,
            VehiculeRepository vehiculeRepository,
            ReservationRepository reservationRepository,
            UtilisateurRepository utilisateurRepository,
            NotificationService notificationService
    ) {
        this.signalementRepository = signalementRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.reservationRepository = reservationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.notificationService = notificationService;
    }

    /**
     * Liste tous les signalements.
     */
    @GetMapping
    public ResponseEntity<List<SignalementIncident>> listerTous() {
        return ResponseEntity.ok(
                signalementRepository.findAllByOrderByDateSignalementDesc()
        );
    }

    /**
     * Signalements par véhicule.
     */
    @GetMapping("/vehicule/{vehiculeId}")
    public ResponseEntity<List<SignalementIncident>> parVehicule(
            @PathVariable Long vehiculeId
    ) {
        return ResponseEntity.ok(
                signalementRepository.findByVehiculeIdOrderByDateSignalementDesc(vehiculeId)
        );
    }

    /**
     * Signalements par statut.
     */
    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<SignalementIncident>> parStatut(
            @PathVariable String statut
    ) {
        return ResponseEntity.ok(
                signalementRepository.findByStatutOrderByDateSignalementDesc(statut)
        );
    }

    /**
     * Créer un signalement immédiat.
     * Passe automatiquement le véhicule en INDISPONIBLE
     * et envoie les notifications.
     */
    @PostMapping
    @Transactional
    public ResponseEntity<?> signaler(@RequestBody Map<String, Object> body) {
        try {
            Long vehiculeId = Long.parseLong(body.get("vehiculeId").toString());
            Vehicule vehicule = vehiculeRepository.findById(vehiculeId)
                    .orElseThrow(() -> new RuntimeException("Véhicule introuvable"));

            SignalementIncident signalement = new SignalementIncident();
            String typeIncident = (String) body.get("typeIncident");
            if (typeIncident == null || !Set.of("PANNE", "DOMMAGE", "CONTRAVENTION", "ACCIDENT")
                    .contains(typeIncident.trim().toUpperCase(Locale.ROOT)))
                return ResponseEntity.badRequest().body(Map.of("erreur", "Type d'incident invalide."));
            if (!(body.get("description") instanceof String description) || description.isBlank())
                return ResponseEntity.badRequest().body(Map.of("erreur", "La description de l'incident est obligatoire."));
            signalement.setVehicule(vehicule);
            signalement.setStatutVehiculeAvantIncident(vehicule.getStatut());
            signalement.setTypeIncident(typeIncident.trim().toUpperCase(Locale.ROOT));
            signalement.setDescription((String) body.get("description"));
            signalement.setLieu((String) body.get("lieu"));
            signalement.setGravite((String) body.getOrDefault("gravite", "MOYEN"));

            if (body.containsKey("dateIncident") && body.get("dateIncident") != null) {
                signalement.setDateIncident(LocalDateTime.parse((String) body.get("dateIncident")));
            } else {
                signalement.setDateIncident(LocalDateTime.now());
            }

            if (body.containsKey("reservationId") && body.get("reservationId") != null) {
                Long reservationId = Long.parseLong(body.get("reservationId").toString());
                reservationRepository.findById(reservationId).ifPresent(signalement::setReservation);
            }

            // Signaleur
            String signaleParMatricule = org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication().getName();
            if (signaleParMatricule != null) {
                utilisateurRepository.findByMatricule(signaleParMatricule)
                        .ifPresent(signalement::setSignalePar);
            }

            signalement.setStatut("SIGNALE");

            // PASSAGE AUTOMATIQUE EN INDISPONIBLE
            vehicule.setStatut("INDISPONIBLE");
            vehiculeRepository.save(vehicule);

            // Le Chef du Service Logistique est le premier valideur du signalement.
            try {
                notificationService.creerPourRole(
                        "CHEF_SERVICE_LOGISTIQUE", "SIGNALEMENT_INCIDENT", "URGENT",
                        "Incident à valider — " + vehicule.getImmatriculation(),
                        "Un incident " + signalement.getTypeIncident() + " a été signalé sur le véhicule "
                                + vehicule.getImmatriculation() + ". Validez le dossier puis planifiez sa prise en charge.",
                        "/chef-service-logistique", null, null, vehiculeId, false);
                signalement.setNotificationEnvoyee(true);
            } catch (Exception notifEx) {
                // Ne pas bloquer le signalement si la notification échoue
                signalement.setNotificationEnvoyee(false);
            }

            SignalementIncident saved = signalementRepository.save(signalement);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    Map.of("erreur", e.getMessage())
            );
        }
    }

    private boolean directionConcernee(Vehicule vehicule, Long directionId) {
        if (vehicule == null || directionId == null) return false;
        if (vehicule.getDirections() != null && !vehicule.getDirections().isEmpty()) {
            return vehicule.getDirections().stream().anyMatch(d -> directionId.equals(d.getId()));
        }
        String affectation = vehicule.getAffectation();
        if (affectation == null || affectation.isBlank()) return false;
        String normalisee = Normalizer.normalize(affectation, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toUpperCase(Locale.ROOT);
        List<String> alias = switch (directionId.intValue()) {
            case 1 -> List.of("DG", "DIRECTION GENERALE");
            case 2 -> List.of("AUDIT", "GESTION DES RISQUES");
            case 3 -> List.of("DAJ", "AFFAIRES JURIDIQUES");
            case 4 -> List.of("DIRCAP", "CAPITAINERIE");
            case 5 -> List.of("DID", "INFRASTRUCTURE ET DEVELOPPEMENT");
            case 6 -> List.of("MARKETING");
            case 7 -> List.of("DIREX", "EXPLOITATION");
            case 8 -> List.of("DFP", "FINANCIERE ET PERFORMANCE");
            case 9 -> List.of("DRH", "RESSOURCES HUMAINES");
            case 10 -> List.of("DDI", "DIGITALISATION ET INNOVATION");
            case 11 -> List.of("SG", "SECRETARIAT GENERAL");
            case 12 -> List.of("DMC", "MARKETING ET COMMUNICATION");
            case 13 -> List.of("DAGR", "AFFAIRES GENERALES");
            default -> List.of();
        };
        return alias.stream().anyMatch(valeur -> normalisee.contains(valeur));
    }

    @PutMapping("/{id}/valider")
    @Transactional
    public ResponseEntity<?> valider(@PathVariable Long id) {
        if (!estRole("CHEF_SERVICE_LOGISTIQUE")) return ResponseEntity.status(403).body(Map.of("erreur", "Action réservée au Chef du Service Logistique."));
        SignalementIncident signalement = trouver(id);
        if (!"SIGNALE".equalsIgnoreCase(signalement.getStatut()))
            return ResponseEntity.status(409).body(Map.of("erreur", "Seul un signalement nouveau peut être validé."));
        signalement.setStatut("VALIDEE");
        signalement.setDateValidation(LocalDateTime.now());
        signalement.setValidePar(matriculeCourant());
        return ResponseEntity.ok(signalementRepository.save(signalement));
    }

    @PutMapping("/{id}/planifier")
    @Transactional
    public ResponseEntity<?> planifier(@PathVariable Long id, @RequestBody Map<String, String> body) {
        if (!estRole("CHEF_SERVICE_LOGISTIQUE")) return ResponseEntity.status(403).body(Map.of("erreur", "Action réservée au Chef du Service Logistique."));
        SignalementIncident signalement = trouver(id);
        if (!"VALIDEE".equalsIgnoreCase(signalement.getStatut()))
            return ResponseEntity.status(409).body(Map.of("erreur", "Le signalement doit être validé avant sa planification."));
        try {
            LocalDateTime datePlanification = LocalDateTime.parse(body.get("datePlanification"));
            if (!datePlanification.isAfter(LocalDateTime.now()))
                return ResponseEntity.badRequest().body(Map.of("erreur", "La date de planification doit être future."));
            signalement.setDatePlanification(datePlanification);
            signalement.setPlanifiePar(matriculeCourant());
            signalement.setStatut("PLANIFIEE");
            SignalementIncident sauvegarde = signalementRepository.save(signalement);
            notifierMecanicien(sauvegarde);
            return ResponseEntity.ok(sauvegarde);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("erreur", e.getMessage() == null ? "Date de planification invalide." : e.getMessage()));
        }
    }

    @PutMapping("/{id}/prendre-en-charge")
    @Transactional
    public ResponseEntity<?> prendreEnCharge(@PathVariable Long id) {
        if (!estRole("MECANICIEN_DID", "CHEF_ATELIER")) return ResponseEntity.status(403).body(Map.of("erreur", "Action réservée au mécanicien DID."));
        SignalementIncident signalement = trouver(id);
        if (!"PLANIFIEE".equalsIgnoreCase(signalement.getStatut()))
            return ResponseEntity.status(409).body(Map.of("erreur", "Seul un incident planifié peut être pris en charge."));
        signalement.setStatut("EN_TRAITEMENT");
        signalement.setPrisEnChargePar(matriculeCourant());
        return ResponseEntity.ok(signalementRepository.save(signalement));
    }

    @PutMapping("/{id}/cloturer")
    @Transactional
    public ResponseEntity<?> cloturer(@PathVariable Long id, @RequestBody Map<String, String> body) {
        if (!estRole("MECANICIEN_DID", "CHEF_ATELIER")) return ResponseEntity.status(403).body(Map.of("erreur", "Action réservée au mécanicien DID."));
        SignalementIncident signalement = trouver(id);
        if (!"EN_TRAITEMENT".equalsIgnoreCase(signalement.getStatut()))
            return ResponseEntity.status(409).body(Map.of("erreur", "L'incident doit être en cours de réparation avant sa clôture."));
        String compteRendu = body == null ? null : body.get("commentaireResolution");
        if (compteRendu == null || compteRendu.isBlank())
            return ResponseEntity.badRequest().body(Map.of("erreur", "Le compte rendu de réparation est obligatoire."));
        signalement.setCommentaireResolution(compteRendu.trim());
        signalement.setDateResolution(LocalDateTime.now());
        signalement.setCloturePar(matriculeCourant());
        signalement.setStatut("CLOTURE");
        SignalementIncident sauvegarde = signalementRepository.save(signalement);
        Vehicule vehicule = sauvegarde.getVehicule();
        if (vehicule != null && vehicule.getId() != null
                && !signalementRepository.existsByVehiculeIdAndIdNotAndStatutNotIn(
                        vehicule.getId(), sauvegarde.getId(), List.of("RESOLU", "CLOTURE"))) {
            vehicule.setStatut(sauvegarde.getStatutVehiculeAvantIncident() == null
                    ? "DISPONIBLE" : sauvegarde.getStatutVehiculeAvantIncident());
            vehiculeRepository.save(vehicule);
        }
        try {
            notificationService.creerPourRole("CHEF_SERVICE_LOGISTIQUE", "SIGNALEMENT_INCIDENT_CLOTURE", "SUCCES",
                    "Incident réparé — " + (vehicule == null ? "véhicule" : vehicule.getImmatriculation()),
                    "Le mécanicien DID a clôturé l'incident " + sauvegarde.getTypeIncident()
                            + ". Compte rendu : " + sauvegarde.getCommentaireResolution(),
                    "/chef-service-logistique", null, null, vehicule == null ? null : vehicule.getId(), false);
        } catch (Exception ignored) { /* La clôture ne dépend pas de la notification. */ }
        return ResponseEntity.ok(sauvegarde);
    }

    /** Ancien point d'entrée conservé pour compatibilité, mais les transitions sont désormais dédiées. */
    @PutMapping("/{id}/statut")
    public ResponseEntity<?> mettreAJourStatut(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.status(409).body(Map.of("erreur", "Utilisez les actions de validation, planification et clôture du workflow incident."));
    }

    private SignalementIncident trouver(Long id) {
        return signalementRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Signalement introuvable."));
    }

    private String matriculeCourant() {
        var authentication = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        return authentication == null ? null : authentication.getName();
    }

    private boolean estRole(String... roles) {
        var authentication = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities() == null) return false;
        return authentication.getAuthorities().stream().anyMatch(authority -> {
            String role = authority.getAuthority();
            for (String autorise : roles) {
                if (("ROLE_" + autorise).equalsIgnoreCase(role) || autorise.equalsIgnoreCase(role)) return true;
            }
            return false;
        });
    }

    private void notifierMecanicien(SignalementIncident signalement) {
        Vehicule vehicule = signalement.getVehicule();
        if (vehicule == null) return;
        notificationService.creerPourRole("MECANICIEN_DID", "SIGNALEMENT_INCIDENT", "IMPORTANT",
                "Incident planifié — " + vehicule.getImmatriculation(),
                "Le Chef du Service Logistique a planifié la réparation du signalement "
                        + signalement.getTypeIncident() + " le " + signalement.getDatePlanification()
                        + ". Véhicule : " + vehicule.getImmatriculation() + ".",
                "/mecanicien-did", null, null, vehicule.getId(), false);
    }
}
