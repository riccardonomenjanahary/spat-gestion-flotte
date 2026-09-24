package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.ChangementDerniereMinute;
import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.ChangementDerniereMinuteRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Ne modifie pas le ReservationController existant. */
@RestController
@RequestMapping("/api/agent-flotte")
public class UrgenceDerniereMinuteController {
    private final ReservationRepository reservations;
    private final ChangementDerniereMinuteRepository changements;
    private final NotificationService notifications;
    private final UtilisateurRepository utilisateurs;
    public UrgenceDerniereMinuteController(ReservationRepository reservations,
                                           ChangementDerniereMinuteRepository changements, NotificationService notifications,
                                           UtilisateurRepository utilisateurs) {
        this.reservations=reservations;
        this.changements=changements;
        this.notifications=notifications;
        this.utilisateurs=utilisateurs;
    }

    public static class Demande {
        public String sousCategorie;
        public String motifUrgence;
        public String motif;
        public LocalDateTime dateDebut;
        public LocalDateTime dateFin;
        public String pointDepart;
        public String destination;
        public String zoneMission;
        // Obligatoire si la mission initiale est verrouillée. Ne suffit jamais sans rôle AGENT_FLOTTE.
        public boolean derogationMissionVerrouillee;
    }

    private boolean estAgent(Authentication auth) {
        return auth != null && auth.isAuthenticated() && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_AGENT_FLOTTE".equals(a.getAuthority()));
    }

    @GetMapping("/urgences-derniere-minute")
    @Transactional(readOnly=true)
    public ResponseEntity<?> historique(Authentication auth) {
        if (!estAgent(auth)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(changements.findAllByOrderByDateChangementDesc());
    }

    @PostMapping("/tickets/{id}/urgence-derniere-minute")
    @Transactional
    public ResponseEntity<?> creer(@PathVariable Long id, @RequestBody Demande d, Authentication auth) {
        if (!estAgent(auth)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Accès réservé à l'Agent Flotte.");
        if (d == null || vide(d.sousCategorie) || vide(d.motifUrgence) || vide(d.motif)
                || vide(d.pointDepart) || vide(d.destination) || d.dateDebut == null || d.dateFin == null) {
            return ResponseEntity.badRequest().body("Sous-catégorie, motif de l'urgence, objet, trajet et dates obligatoires.");
        }
        if (d.sousCategorie.length() > 100 || d.motifUrgence.length() > 1000 || d.motif.length() > 255
                || d.pointDepart.length() > 255 || d.destination.length() > 255) {
            return ResponseEntity.badRequest().body("Un des champs dépasse la longueur autorisée.");
        }
        if (d.zoneMission == null || !List.of("VILLE_TOAMASINA", "HORS_TOAMASINA").contains(d.zoneMission.trim())) {
            return ResponseEntity.badRequest().body("Choisissez la zone du nouveau trajet : VILLE_TOAMASINA ou HORS_TOAMASINA.");
        }
        if (!d.dateFin.isAfter(d.dateDebut) || d.dateDebut.isBefore(LocalDateTime.now().minusMinutes(2))) {
            return ResponseEntity.badRequest().body("La date de début doit être immédiate ou future ; la fin doit suivre le début.");
        }
        // Le verrou empêche deux agents de détourner simultanément le même ticket.
        Reservation initial = reservations.findByIdForUpdate(id).orElse(null);
        if (initial == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Ticket initial introuvable.");
        if (!"VALIDEE".equals(initial.getStatut())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Seul un ticket validé au niveau 2 peut faire l'objet d'un changement de dernière minute.");
        }
        boolean verrouillee = "VERROUILLEE".equals(initial.getMobilisabilite());
        if (!"FLEXIBLE".equals(initial.getMobilisabilite()) && !verrouillee) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Mobilisabilité du ticket non reconnue.");
        }
        if (verrouillee && !d.derogationMissionVerrouillee) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Mission verrouillée : confirmation explicite de la dérogation obligatoire.");
        }
        if (initial.getDateDebut() == null || !initial.getDateDebut().isAfter(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Le départ initial a déjà commencé ou est passé.");
        }
        if (initial.getVehicule() == null || initial.getChauffeur() == null) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Véhicule et chauffeur doivent être affectés au ticket initial.");
        }
        if (changements.existsByTicketInitialId(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Ce ticket a déjà fait l'objet d'un changement de dernière minute.");
        }
        Long vehiculeId=initial.getVehicule().getId();
        Long chauffeurId=initial.getChauffeur().getId();
        if (reservations.existeChevauchementVehicule(vehiculeId,id,d.dateDebut,d.dateFin)
                || reservations.existeChevauchementChauffeur(chauffeurId,id,d.dateDebut,d.dateFin)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Véhicule ou chauffeur déjà réservé sur la nouvelle période.");
        }
        Utilisateur agent = utilisateurs.findByMatricule(auth.getName()).orElse(null);
        Utilisateur compteChauffeur = initial.getChauffeur().getMatricule() == null ? null
                : utilisateurs.findByMatricule(initial.getChauffeur().getMatricule()).orElse(null);
        if (agent == null || compteChauffeur == null || !compteChauffeur.isActif()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Compte Agent Flotte ou compte Chauffeur actif introuvable : notification de la mission impossible.");
        }
        // La demande originale reste intacte sauf son statut et conserve son numéro / ses détails.
        initial.setStatut("A_REPROGRAMMER");
        reservations.saveAndFlush(initial);

        Reservation urgent=new Reservation();
        urgent.setDemandeur(agent);
        urgent.setVehicule(initial.getVehicule());
        urgent.setChauffeur(initial.getChauffeur());
        urgent.setDateDebut(d.dateDebut);
        urgent.setDateFin(d.dateFin);
        urgent.setMotif(d.motif.trim());
        urgent.setPointDepart(d.pointDepart.trim());
        urgent.setDestination(d.destination.trim());
        urgent.setDemandeUrgente(true);
        urgent.setMotifUrgence(d.motifUrgence.trim());
        urgent.setTypeDemande("URGENTE");
        urgent.setZoneMission(d.zoneMission.trim());
        urgent.setMobilisabilite("VERROUILLEE");
        urgent.setModeCreation("EXPRESS");
        urgent.setDemandeExpressPar("DG — changement de dernière minute");
        urgent.setARegulariser(true); // compléter les informations administratives après l’urgence
        urgent.setDemandeurNom("DG");
        urgent.setDemandeurEntite("Direction générale");
        urgent.setTypeVehiculeSouhaite(initial.getTypeVehiculeSouhaite());
        urgent.setBesoinChauffeur(true);
        urgent.setObservations("Urgence de dernière minute; ticket initial TKT-"+String.format("%05d",id)
                +"; sous-catégorie: "+d.sousCategorie.trim()
                +(verrouillee ? "; dérogation exceptionnelle : mission initiale VERROUILLEE" : ""));
        urgent.setValidationN1Par(initial.getValidationN1Par());
        urgent.setDateValidationN1(initial.getDateValidationN1());
        urgent.setValidationN2Par(initial.getValidationN2Par());
        urgent.setDateValidationN2(initial.getDateValidationN2());
        urgent.setStatut("VALIDEE");
        urgent=reservations.saveAndFlush(urgent);

        ChangementDerniereMinute trace=new ChangementDerniereMinute();
        trace.setTicketInitialId(id);
        trace.setTicketUrgentId(urgent.getId());
        trace.setAgentMatricule(auth.getName());
        trace.setSousCategorie(d.sousCategorie.trim());
        // L'historique garde la preuve de la dérogation sans changer le schéma SQL existant.
        String motifTrace = (verrouillee ? "[DEROGATION_MISSION_VERROUILLEE] " : "") + d.motifUrgence.trim();
        trace.setMotifUrgence(motifTrace.length() > 1000 ? motifTrace.substring(0, 1000) : motifTrace);
        trace=changements.saveAndFlush(trace);

        // Notifications persistantes écrites dans la même transaction que le changement.
        // L'Agent Flotte voit également sa propre notification dans la cloche.
        String message="Ticket TKT-"+String.format("%05d",id)+" à reprogrammer : urgence "
                +"TKT-"+String.format("%05d",urgent.getId())+" ("+d.sousCategorie.trim()+"). "
                +(verrouillee ? "Dérogation exceptionnelle sur une mission verrouillée. " : "")
                +d.motifUrgence.trim();
        notifications.creerPourRole("AGENT_FLOTTE","URGENCE_DERNIERE_MINUTE","URGENT",
                "Urgence de dernière minute", message,"/agent-flotte",urgent.getId(),
                null,vehiculeId,false);
        {
            notifications.creerPourUtilisateur(compteChauffeur,
                    "NOUVELLE_MISSION_URGENTE","URGENT","Mission urgente : nouvelle affectation",
                    message,"/chauffeur",urgent.getId(),null,vehiculeId,false);
        }
        // Demandeur d'origine : sa propre mission a été déprogrammée.
        if (initial.getDemandeur() != null && initial.getDemandeur().getMatricule() != null
                && !initial.getDemandeur().getMatricule().equals(auth.getName())) {
            notifications.creerPourUtilisateur(initial.getDemandeur(),
                    "MISSION_A_REPROGRAMMER","IMPORTANT","Votre mission doit être reprogrammée",
                    "Votre ticket TKT-"+String.format("%05d",id)+" a été déprogrammé pour une urgence opérationnelle. Contactez l'Agent Flotte pour fixer un nouveau créneau.",
                    "/chef-direction",id,null,vehiculeId,false);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "ticketInitialId",id,"ticketUrgentId",urgent.getId(),"changementId",trace.getId(),
                "statutInitial","A_REPROGRAMMER","statutUrgent","VALIDEE"));
    }

    private static boolean vide(String s){return s==null || s.isBlank();}
}
