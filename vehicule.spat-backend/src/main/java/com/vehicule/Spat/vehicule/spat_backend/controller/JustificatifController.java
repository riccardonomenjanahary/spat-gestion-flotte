package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.JustificatifVue;
import com.vehicule.Spat.vehicule.spat_backend.model.Justificatif;
import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.model.TransactionCarburant;
import com.vehicule.Spat.vehicule.spat_backend.model.TypeJustificatif;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.JustificatifRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.TransactionCarburantRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.StockageFichiersService;

import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// =========================================================
// CONTROLEUR JUSTIFICATIFS
// =========================================================
//
// Upload et consultation des pièces du dispositif
// d'utilisation des véhicules :
//
//   - ordre de mission signé (rattaché à une réservation)
//   - reçu de carburant (rattaché à une transaction)
//   - documents du véhicule (carte grise, visite
//     technique, assurance, ...)
//
// La validation (ordre de mission signé notamment) est
// réservée au Service Logistique et au Chef DGAL
// (voir SecurityConfig).

@RestController
@RequestMapping("/api/justificatifs")
public class JustificatifController {

    private final JustificatifRepository justificatifRepository;
    private final VehiculeRepository vehiculeRepository;
    private final ReservationRepository reservationRepository;
    private final TransactionCarburantRepository transactionCarburantRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final StockageFichiersService stockageFichiersService;
    private final com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService acces;

    public JustificatifController(
            JustificatifRepository justificatifRepository,
            VehiculeRepository vehiculeRepository,
            ReservationRepository reservationRepository,
            TransactionCarburantRepository transactionCarburantRepository,
            UtilisateurRepository utilisateurRepository,
            StockageFichiersService stockageFichiersService,
            com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService acces
    ) {
        this.justificatifRepository = justificatifRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.reservationRepository = reservationRepository;
        this.transactionCarburantRepository = transactionCarburantRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.stockageFichiersService = stockageFichiersService;
        this.acces = acces;
    }

    // =========================================================
    // DEPOT SUR UN VEHICULE
    // =========================================================

    @PostMapping("/vehicules/{vehiculeId}")
    public ResponseEntity<?> deposerSurVehicule(
            @PathVariable Long vehiculeId,
            @RequestParam("type") String type,
            @RequestParam(value = "libelle", required = false) String libelle,
            @RequestParam("fichier") MultipartFile fichier,
            Authentication authentication
    ) {
        Vehicule vehicule = vehiculeRepository.findById(vehiculeId).orElse(null);

        if (vehicule == null) {
            return ResponseEntity.badRequest().body("Véhicule introuvable : " + vehiculeId);
        }

        acces.exigerLectureVehicule(vehicule);
        return enregistrer(type, libelle, fichier, authentication, vehicule, null, null);
    }

    // =========================================================
    // DEPOT SUR UNE RESERVATION (ordre de mission)
    // =========================================================

    @PostMapping("/reservations/{reservationId}")
    public ResponseEntity<?> deposerSurReservation(
            @PathVariable Long reservationId,
            @RequestParam("type") String type,
            @RequestParam(value = "libelle", required = false) String libelle,
            @RequestParam("fichier") MultipartFile fichier,
            Authentication authentication
    ) {
        Reservation reservation = reservationRepository.findById(reservationId).orElse(null);

        if (reservation == null) {
            return ResponseEntity.badRequest().body("Réservation introuvable : " + reservationId);
        }

        acces.exigerLecture(reservation);
        return enregistrer(type, libelle, fichier, authentication, null, reservation, null);
    }

    // =========================================================
    // DEPOT SUR UNE TRANSACTION CARBURANT (reçu)
    // =========================================================

    @PostMapping("/transactions/{transactionId}")
    public ResponseEntity<?> deposerSurTransaction(
            @PathVariable UUID transactionId,
            @RequestParam("type") String type,
            @RequestParam(value = "libelle", required = false) String libelle,
            @RequestParam("fichier") MultipartFile fichier,
            Authentication authentication
    ) {
        TransactionCarburant transaction =
                transactionCarburantRepository.findById(transactionId).orElse(null);

        if (transaction == null) {
            return ResponseEntity.badRequest().body("Transaction introuvable : " + transactionId);
        }

        acces.exigerLectureTransaction(transaction);
        return enregistrer(type, libelle, fichier, authentication, null, null, transaction);
    }

    // =========================================================
    // LISTES
    // =========================================================

    @GetMapping("/vehicules/{vehiculeId}")
    public ResponseEntity<?> listerParVehicule(@PathVariable Long vehiculeId) {
        Vehicule vehicule = vehiculeRepository.findById(vehiculeId).orElse(null);

        if (vehicule == null) {
            return ResponseEntity.badRequest().body("Véhicule introuvable : " + vehiculeId);
        }

        acces.exigerLectureVehicule(vehicule);
        return ResponseEntity.ok(
                justificatifRepository
                        .findByVehiculeOrderByDateDepotDesc(vehicule)
                        .stream()
                        .map(JustificatifVue::depuis)
                        .toList()
        );
    }

    @GetMapping("/reservations/{reservationId}")
    public ResponseEntity<?> listerParReservation(@PathVariable Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId).orElse(null);

        if (reservation == null) {
            return ResponseEntity.badRequest().body("Réservation introuvable : " + reservationId);
        }

        acces.exigerLecture(reservation);
        return ResponseEntity.ok(
                justificatifRepository
                        .findByReservationOrderByDateDepotDesc(reservation)
                        .stream()
                        .map(JustificatifVue::depuis)
                        .toList()
        );
    }

    @GetMapping("/transactions/{transactionId}")
    public ResponseEntity<?> listerParTransaction(@PathVariable UUID transactionId) {
        TransactionCarburant transaction =
                transactionCarburantRepository.findById(transactionId).orElse(null);

        if (transaction == null) {
            return ResponseEntity.badRequest().body("Transaction introuvable : " + transactionId);
        }

        acces.exigerLectureTransaction(transaction);
        return ResponseEntity.ok(
                justificatifRepository
                        .findByTransactionCarburantOrderByDateDepotDesc(transaction)
                        .stream()
                        .map(JustificatifVue::depuis)
                        .toList()
        );
    }

    // =========================================================
    // FILE D'ATTENTE DE VALIDATION
    // =========================================================

    @GetMapping("/a-valider")
    public List<JustificatifVue> aValider() {
        return justificatifRepository
                .findByValideFalse()
                .stream()
                .map(JustificatifVue::depuis)
                .toList();
    }

    // =========================================================
    // TELECHARGEMENT DU FICHIER
    // =========================================================

    @GetMapping("/{id}/contenu")
    public ResponseEntity<?> telecharger(@PathVariable Long id) {
        Justificatif justificatif = justificatifRepository.findById(id).orElse(null);

        if (justificatif == null) {
            return ResponseEntity.notFound().build();
        }

        if (justificatif.getReservation() != null) acces.exigerLecture(justificatif.getReservation());
        else if (justificatif.getTransactionCarburant() != null) acces.exigerLectureTransaction(justificatif.getTransactionCarburant());
        else acces.exigerLectureVehicule(justificatif.getVehicule());
        Path chemin = stockageFichiersService.resoudreChemin(justificatif.getNomStocke());

        if (!Files.exists(chemin)) {
            return ResponseEntity.notFound().build();
        }

        String nomTelecharge = URLEncoder
                .encode(justificatif.getNomFichier(), StandardCharsets.UTF_8)
                .replace("+", "%20");

        return ResponseEntity
                .ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename*=UTF-8''" + nomTelecharge
                )
                .contentType(MediaType.parseMediaType(justificatif.getContentType()))
                .body(new FileSystemResource(chemin.toFile()));
    }

    // =========================================================
    // VALIDATION (ordre de mission signé notamment)
    // =========================================================

    @PutMapping("/{id}/validation")
    public ResponseEntity<?> valider(
            @PathVariable Long id,
            @RequestBody Map<String, Object> corps,
            Authentication authentication
    ) {
        Justificatif justificatif = justificatifRepository.findById(id).orElse(null);

        if (justificatif == null) {
            return ResponseEntity.notFound().build();
        }

        Utilisateur valideur = utilisateurRepository
                .findByMatricule(authentication.getName())
                .orElse(null);

        if (valideur == null) {
            return ResponseEntity.status(401).body("Utilisateur introuvable.");
        }

        boolean valide = Boolean.TRUE.equals(corps.get("valide"));

        justificatif.setValide(valide);
        justificatif.setValidePar(valideur);
        justificatif.setDateValidation(LocalDateTime.now());

        if (corps.get("commentaire") instanceof String commentaire) {
            justificatif.setCommentaireValidation(commentaire.trim());
        }

        justificatifRepository.save(justificatif);

        return ResponseEntity.ok(JustificatifVue.depuis(justificatif));
    }

    // =========================================================
    // MODIFICATION : remplacement du fichier (nouvelle version)
    // =========================================================

    @PutMapping("/{id}/fichier")
    public ResponseEntity<?> remplacerFichier(
            @PathVariable Long id,
            @RequestParam("fichier") MultipartFile fichier,
            @RequestParam(value = "libelle", required = false) String libelle,
            Authentication authentication
    ) {
        Justificatif justificatif = justificatifRepository.findById(id).orElse(null);

        if (justificatif == null) {
            return ResponseEntity.notFound().build();
        }

        Utilisateur auteur = utilisateurRepository
                .findByMatricule(authentication.getName())
                .orElse(null);

        if (auteur == null) {
            return ResponseEntity.status(401).body("Utilisateur introuvable.");
        }

        try {
            stockageFichiersService.verifierFichier(fichier);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }

        String ancienNomStocke = justificatif.getNomStocke();

        justificatif.setNomStocke(stockageFichiersService.stocker(fichier));
        justificatif.setNomFichier(fichier.getOriginalFilename());
        justificatif.setTailleOctets(fichier.getSize());
        justificatif.setContentType(fichier.getContentType());
        justificatif.setDeposePar(auteur);
        justificatif.setDateDepot(LocalDateTime.now());
        // La nouvelle version doit être validée à nouveau.
        justificatif.setValide(false);
        justificatif.setValidePar(null);
        justificatif.setDateValidation(null);
        justificatif.setCommentaireValidation(null);

        if (libelle != null && !libelle.isBlank()) {
            justificatif.setLibelle(libelle.trim());
        }

        Justificatif enregistre = justificatifRepository.save(justificatif);
        stockageFichiersService.supprimer(ancienNomStocke);

        return ResponseEntity.ok(JustificatifVue.depuis(enregistre));
    }

    // =========================================================
    // SUPPRESSION (documentaire uniquement)
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> supprimer(@PathVariable Long id) {
        Justificatif justificatif = justificatifRepository.findById(id).orElse(null);

        if (justificatif == null) {
            return ResponseEntity.notFound().build();
        }

        stockageFichiersService.supprimer(justificatif.getNomStocke());
        justificatifRepository.delete(justificatif);

        return ResponseEntity.noContent().build();
    }

    // =========================================================
    // ENREGISTREMENT COMMUN
    // =========================================================

    private ResponseEntity<?> enregistrer(
            String type,
            String libelle,
            MultipartFile fichier,
            Authentication authentication,
            Vehicule vehicule,
            Reservation reservation,
            TransactionCarburant transaction
    ) {
        // -----------------------------------------------------
        // UTILISATEUR DEPOSANT
        // -----------------------------------------------------

        Utilisateur deposePar = utilisateurRepository
                .findByMatricule(authentication.getName())
                .orElse(null);

        if (deposePar == null) {
            return ResponseEntity.status(401).body("Utilisateur introuvable.");
        }

        // -----------------------------------------------------
        // TYPE
        // -----------------------------------------------------

        TypeJustificatif typeJustificatif;

        try {
            typeJustificatif = TypeJustificatif.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Type de justificatif invalide : " + type);
        }

        // -----------------------------------------------------
        // FICHIER
        // -----------------------------------------------------

        try {
            stockageFichiersService.verifierFichier(fichier);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }

        String nomStocke = stockageFichiersService.stocker(fichier);

        // -----------------------------------------------------
        // ENTITE
        // -----------------------------------------------------

        Justificatif justificatif = new Justificatif();
        justificatif.setType(typeJustificatif);
        justificatif.setNomFichier(fichier.getOriginalFilename());
        justificatif.setNomStocke(nomStocke);
        justificatif.setTailleOctets(fichier.getSize());
        justificatif.setContentType(fichier.getContentType());
        justificatif.setVehicule(vehicule);
        justificatif.setReservation(reservation);
        justificatif.setTransactionCarburant(transaction);
        justificatif.setDeposePar(deposePar);
        justificatif.setDateDepot(LocalDateTime.now());
        justificatif.setValide(false);

        if (libelle != null && !libelle.isBlank()) {
            justificatif.setLibelle(libelle.trim());
        }

        Justificatif enregistre = justificatifRepository.save(justificatif);

        return ResponseEntity.ok(JustificatifVue.depuis(enregistre));
    }
}
