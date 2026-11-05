package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.EnvoyerOrdreMissionEmailRequest;
import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/api/reservations")
public class OrdreMissionController {
    private static final int TAILLE_MAXIMUM_PDF = 15 * 1024 * 1024;

    private final ReservationRepository reservationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final EmailService emailService;

    public OrdreMissionController(ReservationRepository reservationRepository,
                                  UtilisateurRepository utilisateurRepository,
                                  EmailService emailService) {
        this.reservationRepository = reservationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.emailService = emailService;
    }

    public record DestinataireOrdreMission(String matricule, String nom, String email) {}

    @GetMapping("/{id}/ordre-mission/destinataire")
    @Transactional(readOnly = true)
    public ResponseEntity<?> obtenirDestinataire(@PathVariable Long id) {
        Reservation reservation = reservationRepository.findById(id).orElse(null);
        if (reservation == null) return ResponseEntity.notFound().build();
        Utilisateur destinataire = resoudreDestinataire(reservation);
        String matricule = reservation.getDemandeurMatricule();
        String nom = nomBeneficiaire(reservation, destinataire);
        return ResponseEntity.ok(new DestinataireOrdreMission(
                matricule,
                nom,
                destinataire == null ? null : emailValide(destinataire.getEmail())
        ));
    }

    @PostMapping("/{id}/ordre-mission/email")
    @Transactional(readOnly = true)
    public ResponseEntity<?> envoyerAuDemandeur(@PathVariable Long id,
                                                 @RequestBody EnvoyerOrdreMissionEmailRequest request) {
        Reservation reservation = reservationRepository.findById(id).orElse(null);
        if (reservation == null) return ResponseEntity.notFound().build();
        if (request == null || request.pdfBase64() == null || request.pdfBase64().isBlank()) {
            return ResponseEntity.badRequest().body("Le PDF de l'ordre de mission est obligatoire.");
        }
        Utilisateur destinataire = resoudreDestinataire(reservation);
        String email = destinataire == null ? null : emailValide(destinataire.getEmail());
        if (email == null || email.isBlank()) {
            return ResponseEntity.unprocessableEntity().body(
                    "Aucune adresse email n'est associée au matricule du demandeur dans Super Admin > Personnels."
            );
        }
        try {
            String base64 = request.pdfBase64();
            int virgule = base64.indexOf(',');
            if (virgule >= 0) base64 = base64.substring(virgule + 1);
            byte[] pdf = Base64.getDecoder().decode(base64);
            if (pdf.length < 4 || pdf.length > TAILLE_MAXIMUM_PDF
                    || pdf[0] != '%' || pdf[1] != 'P' || pdf[2] != 'D' || pdf[3] != 'F') {
                return ResponseEntity.badRequest().body("La taille du PDF est invalide (15 Mo maximum).");
            }
            String nomFichier = request.nomFichier() == null || request.nomFichier().isBlank()
                    ? "ordre-mission-" + id + ".pdf" : request.nomFichier().replaceAll("[^a-zA-Z0-9._-]", "_");
            boolean envoye = emailService.envoyerOrdreMission(email, nomBeneficiaire(reservation, destinataire), id, pdf, nomFichier);
            if (!envoye) return ResponseEntity.status(502).body("Le serveur SMTP n'a pas accepté le message.");
            return ResponseEntity.ok(Map.of("message", "Ordre de mission envoyé au demandeur."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Le fichier PDF est invalide.");
        }
    }

    private Utilisateur resoudreDestinataire(Reservation reservation) {
        String matricule = reservation.getDemandeurMatricule();
        if (matricule != null && !matricule.isBlank()) {
            Utilisateur personnel = utilisateurRepository.findByMatricule(matricule.trim()).orElse(null);
            if (personnel != null && emailValide(personnel.getEmail()) != null) return personnel;
        }

        // Compatibilité : pour les anciens tickets, le compte créateur est
        // utilisé seulement si son matricule correspond au bénéficiaire.
        Utilisateur createur = reservation.getDemandeur();
        if (createur != null && (matricule == null || matricule.isBlank()
                || matricule.trim().equalsIgnoreCase(createur.getMatricule()))) {
            return createur;
        }
        return null;
    }

    private String nomBeneficiaire(Reservation reservation, Utilisateur destinataire) {
        String nomSaisi = ((reservation.getDemandeurPrenom() == null ? "" : reservation.getDemandeurPrenom().trim())
                + " " + (reservation.getDemandeurNom() == null ? "" : reservation.getDemandeurNom().trim())).trim();
        if (!nomSaisi.isBlank()) return nomSaisi;
        if (destinataire != null && destinataire.getNomComplet() != null) return destinataire.getNomComplet();
        return reservation.getDemandeur() == null ? "" : reservation.getDemandeur().getNomComplet();
    }

    private String emailValide(String email) {
        if (email == null || email.isBlank()) return null;
        String valeur = email.trim();
        return valeur.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") ? valeur : null;
    }
}
