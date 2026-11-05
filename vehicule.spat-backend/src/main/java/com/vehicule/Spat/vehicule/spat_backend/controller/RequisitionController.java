package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.*;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import com.vehicule.Spat.vehicule.spat_backend.service.NotificationService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.text.Normalizer;
import java.util.*;

/**
 * Droit de réquisition du DGAL.
 *
 * L'outil permet au DGAL de réquisitionner les deux
 * véhicules de mission (1614 WWA et 1615 WWA), avec notification aux
 * assistantes et demandeurs concernés et traçabilité
 * du motif.
 */
@RestController
@RequestMapping("/api/requisitions")
public class RequisitionController {
    private static final Set<String> VEHICULES_DE_MISSION = Set.of("1614WWA", "1615WWA");

    private final RequisitionRepository requisitionRepository;
    private final VehiculeRepository vehiculeRepository;
    private final ReservationRepository reservationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final NotificationService notificationService;

    public RequisitionController(
            RequisitionRepository requisitionRepository,
            VehiculeRepository vehiculeRepository,
            ReservationRepository reservationRepository,
            UtilisateurRepository utilisateurRepository,
            NotificationService notificationService
    ) {
        this.requisitionRepository = requisitionRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.reservationRepository = reservationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.notificationService = notificationService;
    }

    /**
     * Liste toutes les réquisitions.
     */
    @GetMapping
    public ResponseEntity<List<Requisition>> listerTous() {
        return ResponseEntity.ok(
                requisitionRepository.findAllByOrderByDateRequisitionDesc()
        );
    }

    /**
     * Réquisitions actives.
     */
    @GetMapping("/actives")
    public ResponseEntity<List<Requisition>> actives() {
        return ResponseEntity.ok(
                requisitionRepository.findByStatutOrderByDateRequisitionDesc("ACTIVE")
        );
    }

    /**
     * Créer une réquisition.
     * Seul le Chef DGAL est autorisé.
     */
    @PostMapping
    public ResponseEntity<?> creerRequisition(@RequestBody Map<String, Object> body) {
        try {
            if (!(body.get("motif") instanceof String motif) || motif.isBlank())
                return ResponseEntity.badRequest().body(Map.of("erreur", "Le motif de réquisition est obligatoire."));
            Long vehiculeId = Long.parseLong(body.get("vehiculeId").toString());
            Vehicule vehicule = vehiculeRepository.findById(vehiculeId)
                    .orElseThrow(() -> new RuntimeException("Véhicule introuvable"));
                boolean vehiculeMission = CategorieVehicule.estVehiculeMission(vehicule.getCategorie())
                    && VEHICULES_DE_MISSION.contains(normaliserImmatriculation(vehicule.getImmatriculation()));
                boolean autreVehiculeSelectionne = Boolean.TRUE.equals(body.get("autreVehicule"));
                if (vehiculeMission == autreVehiculeSelectionne) {
                return ResponseEntity.badRequest().body(Map.of(
                    "erreur", "Vérifiez votre choix : sélectionnez l'un des deux véhicules de mission ou choisissez explicitement « Autres véhicules »."
                ));
            }
            if (!(body.get("dateDebut") instanceof String dateDebutBrut) || dateDebutBrut.isBlank())
                return ResponseEntity.badRequest().body(Map.of("erreur", "La date de début est obligatoire."));
            LocalDateTime dateDebut = LocalDateTime.parse(dateDebutBrut);
            if (dateDebut.isBefore(LocalDateTime.now().minusMinutes(2)))
                return ResponseEntity.badRequest().body(Map.of("erreur", "La date de début ne peut pas être passée."));

            Requisition requisition = new Requisition();
            requisition.setVehicule(vehicule);
            requisition.setMotif((String) body.get("motif"));
            requisition.setDateDebut(dateDebut);

            if (body.containsKey("dateFin") && body.get("dateFin") != null) {
                requisition.setDateFin(LocalDateTime.parse((String) body.get("dateFin")));
            }
            requisition.setBeneficiaire((String) body.get("beneficiaire"));
            requisition.setDestination((String) body.get("destination"));

            // L'auteur de la réquisition
            String requisitionneParMatricule = org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication().getName();
            if (requisitionneParMatricule != null) {
                utilisateurRepository.findByMatricule(requisitionneParMatricule)
                        .ifPresent(requisition::setRequisitionnePar);
            }

            requisition.setStatut("ACTIVE");
            if (requisition.getDateFin() != null && !requisition.getDateFin().isAfter(requisition.getDateDebut()))
                return ResponseEntity.badRequest().body(Map.of("erreur", "La fin doit être postérieure au début."));

            // Passer le véhicule en REQUISITIONNE
            vehicule.setStatut("REQUISITIONNE");
            vehiculeRepository.save(vehicule);

            // Notifications
            try {
                // Notifier les assistantes de direction concernées
                List<Utilisateur> assistantes = utilisateurRepository.findByRole("ASSISTANT_DIRECTION");
                for (Utilisateur assistante : assistantes) {
                    if (assistante.getDirectionId() != null) {
                        boolean directionConcernee = directionConcernee(vehicule, assistante.getDirectionId());
                        if (directionConcernee) {
                            notificationService.creerNotification(
                                    "REQUISITION_DGAL",
                                    "URGENT",
                                    "🔴 Réquisition DGAL - " + vehicule.getImmatriculation(),
                                    "Le véhicule " + vehicule.getImmatriculation()
                                            + " a été réquisitionné par le DGAL. Motif : "
                                            + requisition.getMotif(),
                                    assistante.getMatricule(),
                                    assistante.getEmail(),
                                    assistante.getRole(),
                                    null,
                                    null,
                                    null,
                                    vehiculeId
                            );
                        }
                    }
                }

                // Notifier le Service Logistique
                List<Utilisateur> logisticiens = utilisateurRepository.findByRole("CHEF_SERVICE_LOGISTIQUE");
                for (Utilisateur logisticien : logisticiens) {
                    notificationService.creerNotification(
                            "REQUISITION_DGAL",
                            "URGENT",
                            "🔴 Réquisition DGAL - " + vehicule.getImmatriculation(),
                            "Le véhicule " + vehicule.getImmatriculation()
                                    + " a été réquisitionné. Motif : " + requisition.getMotif(),
                            logisticien.getMatricule(),
                            logisticien.getEmail(),
                            logisticien.getRole(),
                            null,
                            null,
                            null,
                            vehiculeId
                    );
                }

                // Annuler les réservations en conflit sur la période
                if (body.containsKey("reservationImpacteeId") && body.get("reservationImpacteeId") != null) {
                    Long reservationId = Long.parseLong(body.get("reservationImpacteeId").toString());
                    reservationRepository.findById(reservationId).ifPresent(reservation -> {
                        requisition.setReservationImpactee(reservation);
                        // Notifier le demandeur de la réservation impactée
                        Utilisateur demandeur = reservation.getDemandeur();
                        if (demandeur != null) {
                            notificationService.creerNotification(
                                    "REQUISITION_DGAL",
                                    "URGENT",
                                    "🔴 Réservation impactée par réquisition DGAL",
                                    "Votre réservation du véhicule "
                                            + vehicule.getImmatriculation()
                                            + " est impactée par une réquisition du DGAL.",
                                    demandeur.getMatricule(),
                                    demandeur.getEmail(),
                                    demandeur.getRole(),
                                    null,
                                    reservation.getId(),
                                    null,
                                    vehiculeId
                            );
                        }
                    });
                }

                // Toute réservation active qui chevauche la réquisition est
                // notifiée, même si son identifiant n'a pas été fourni par l'interface.
                LocalDateTime debutRequisition = requisition.getDateDebut();
                LocalDateTime finRequisition = requisition.getDateFin();
                for (Reservation reservation : reservationRepository.findAll()) {
                    if (reservation.getVehicule() == null || !vehiculeId.equals(reservation.getVehicule().getId())
                            || reservation.getDateDebut() == null || reservation.getDateFin() == null
                            || !Set.of("EN_ATTENTE", "EN_ATTENTE_AVIS_DID", "VALIDEE_N1", "VALIDEE", "PLANIFIEE").contains(reservation.getStatut())) continue;
                    boolean chevauche = reservation.getDateDebut().isBefore(finRequisition == null ? LocalDateTime.MAX : finRequisition)
                            && reservation.getDateFin().isAfter(debutRequisition);
                    if (!chevauche) continue;
                    if (requisition.getReservationImpactee() == null) requisition.setReservationImpactee(reservation);
                    Utilisateur demandeur = reservation.getDemandeur();
                    if (demandeur != null) notificationService.creerNotification(
                            "REQUISITION_DGAL", "URGENT", "Réservation impactée par réquisition DGAL",
                            "La réservation TKT-" + String.format("%05d", reservation.getId())
                                    + " est impactée par la réquisition du véhicule " + vehicule.getImmatriculation() + ".",
                            demandeur.getMatricule(), demandeur.getEmail(), demandeur.getRole(), null,
                            reservation.getId(), null, vehiculeId);
                }

                requisition.setNotificationsEnvoyees(true);
            } catch (Exception notifEx) {
                requisition.setNotificationsEnvoyees(false);
            }

            Requisition saved = requisitionRepository.save(requisition);
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
        return alias.stream().anyMatch(normalisee::contains);
    }

    private String normaliserImmatriculation(String immatriculation) {
        String normalisee = immatriculation == null ? ""
                : immatriculation.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
        return normalisee.matches("0?161[45]WWA") ? normalisee.replaceFirst("^0", "") : normalisee;
    }

    /**
     * Terminer une réquisition et libérer le véhicule.
     */
    @PutMapping("/{id}/terminer")
    public ResponseEntity<?> terminerRequisition(@PathVariable Long id) {
        try {
            Requisition requisition = requisitionRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Réquisition introuvable"));

            requisition.setStatut("TERMINEE");
            requisition.setDateFin(LocalDateTime.now());

            // Remettre le véhicule en DISPONIBLE
            Vehicule vehicule = requisition.getVehicule();
            vehicule.setStatut("DISPONIBLE");
            vehiculeRepository.save(vehicule);

            requisitionRepository.save(requisition);
            return ResponseEntity.ok(requisition);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    Map.of("erreur", e.getMessage())
            );
        }
    }

    /**
     * Annuler une réquisition.
     */
    @PutMapping("/{id}/annuler")
    public ResponseEntity<?> annulerRequisition(@PathVariable Long id) {
        try {
            Requisition requisition = requisitionRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Réquisition introuvable"));

            requisition.setStatut("ANNULEE");

            Vehicule vehicule = requisition.getVehicule();
            vehicule.setStatut("DISPONIBLE");
            vehiculeRepository.save(vehicule);

            requisitionRepository.save(requisition);
            return ResponseEntity.ok(requisition);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    Map.of("erreur", e.getMessage())
            );
        }
    }
}
