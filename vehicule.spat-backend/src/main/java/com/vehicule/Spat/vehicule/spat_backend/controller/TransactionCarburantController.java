package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.dto.CreateCarburantRequest;
import com.vehicule.Spat.vehicule.spat_backend.model.TransactionCarburant;
import com.vehicule.Spat.vehicule.spat_backend.model.TypeOperationCarburant;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.TransactionCarburantRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/carburant")
public class TransactionCarburantController {

    private final TransactionCarburantRepository transactionCarburantRepository;
    private final VehiculeRepository vehiculeRepository;

    public TransactionCarburantController(
            TransactionCarburantRepository transactionCarburantRepository,
            VehiculeRepository vehiculeRepository
    ) {
        this.transactionCarburantRepository =
                transactionCarburantRepository;

        this.vehiculeRepository =
                vehiculeRepository;
    }

    // =========================================================
    // LISTE DES TRANSACTIONS
    // =========================================================

    @GetMapping
    public List<TransactionCarburant> lister() {

        return transactionCarburantRepository.findAll();
    }

    // =========================================================
    // CREATION D'UNE TRANSACTION CARBURANT
    // =========================================================

    @PostMapping
    public ResponseEntity<?> creer(
            @RequestBody CreateCarburantRequest request,
            Authentication authentication
    ) {

        // -----------------------------------------------------
        // VEHICULE
        // -----------------------------------------------------

        if (request.getVehiculeId() == null) {

            return ResponseEntity
                    .badRequest()
                    .body("Le véhicule est obligatoire.");
        }

        Vehicule vehicule =
                vehiculeRepository
                        .findById(request.getVehiculeId())
                        .orElse(null);

        if (vehicule == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Véhicule introuvable : "
                                    + request.getVehiculeId()
                    );
        }

        // -----------------------------------------------------
        // TYPE
        // -----------------------------------------------------

        if (request.getType() == null
                || request.getType().trim().isEmpty()) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le type d'opération est obligatoire."
                    );
        }

        TypeOperationCarburant type;

        try {

            type = TypeOperationCarburant.valueOf(
                    request.getType()
                            .trim()
                            .toUpperCase()
            );

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Type d'opération carburant invalide : "
                                    + request.getType()
                    );
        }

        // -----------------------------------------------------
        // QUANTITE
        // -----------------------------------------------------

        if (request.getQuantiteLitres() == null
                || request.getQuantiteLitres() <= 0) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La quantité doit être supérieure à 0."
                    );
        }

        // -----------------------------------------------------
        // DATE
        // -----------------------------------------------------

        if (request.getDateOperation() == null) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "La date d'opération est obligatoire."
                    );
        }

        // -----------------------------------------------------
        // PRIX UNITAIRE
        // -----------------------------------------------------

        if (request.getPrixUnitaire() != null
                && request.getPrixUnitaire() < 0) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le prix unitaire ne peut pas être négatif."
                    );
        }

        // -----------------------------------------------------
        // MONTANT TOTAL
        // -----------------------------------------------------

        if (request.getMontantTotal() != null
                && request.getMontantTotal() < 0) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le montant total ne peut pas être négatif."
                    );
        }

        // -----------------------------------------------------
        // KILOMETRAGE
        // -----------------------------------------------------

        if (request.getKilometrage() != null
                && request.getKilometrage() < 0) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Le kilométrage ne peut pas être négatif."
                    );
        }

        // =====================================================
        // CREATION DE LA TRANSACTION
        // =====================================================

        TransactionCarburant transaction =
                new TransactionCarburant();

        // Véhicule
        transaction.setVehicule(
                vehicule
        );

        // Type
        transaction.setType(
                type
        );

        // Quantité
        transaction.setQuantiteLitres(
                request.getQuantiteLitres()
        );

        // Date
        transaction.setDateOperation(
                request.getDateOperation()
        );

        // Prix
        transaction.setPrixUnitaire(
                request.getPrixUnitaire()
        );

        // Montant
        transaction.setMontantTotal(
                request.getMontantTotal()
        );

        // Kilométrage
        transaction.setKilometrage(
                request.getKilometrage()
        );

        // Station
        transaction.setStation(
                request.getStation()
        );

        // Mission
        transaction.setMission(
                request.getMission()
        );

        // Justificatif
        transaction.setJustificatif(
                request.getJustificatif()
        );

        // Observation
        transaction.setObservation(
                request.getObservation()
        );

        // =====================================================
        // AGENT
        // =====================================================

        /*
         * Le JWT contient déjà l'identité de l'utilisateur.
         * On utilise donc l'utilisateur authentifié plutôt
         * que de dépendre du frontend pour l'email.
         */

        if (authentication != null) {

            transaction.setAgentEmail(
                    authentication.getName()
            );

        } else if (request.getAgentEmail() != null) {

            transaction.setAgentEmail(
                    request.getAgentEmail()
            );
        }

        // =====================================================
        // ENREGISTREMENT
        // =====================================================

        TransactionCarburant sauvegardee =
                transactionCarburantRepository.save(
                        transaction
                );

        return ResponseEntity.ok(
                sauvegardee
        );
    }

    // =========================================================
    // SUPPRESSION
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> supprimer(
            @PathVariable UUID id
    ) {

        if (!transactionCarburantRepository.existsById(id)) {

            return ResponseEntity
                    .notFound()
                    .build();
        }

        transactionCarburantRepository.deleteById(id);

        return ResponseEntity
                .ok()
                .build();
    }
}