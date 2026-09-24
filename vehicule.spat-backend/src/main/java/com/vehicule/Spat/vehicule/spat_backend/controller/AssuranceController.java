package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Assurance;
import com.vehicule.Spat.vehicule.spat_backend.repository.AssuranceRepository;

import org.springframework.beans.BeanUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

// =========================================================
// CONTROLLER ASSURANCES
// =========================================================

@RestController
@RequestMapping("/api/assurances")
public class AssuranceController {

    private final AssuranceRepository assuranceRepository;

    public AssuranceController(
            AssuranceRepository assuranceRepository
    ) {
        this.assuranceRepository = assuranceRepository;
    }

    // =====================================================
    // CREER UNE POLICE D'ASSURANCE
    // =====================================================

    @PostMapping
    @Transactional
    public ResponseEntity<?> creer(
            @RequestBody Assurance assurance
    ) {

        if (assurance == null) {
            return ResponseEntity
                    .badRequest()
                    .body("Les informations de l'assurance sont obligatoires.");
        }

        if (assurance.getVehicule() == null
                || assurance.getVehicule().getId() == null) {

            return ResponseEntity
                    .badRequest()
                    .body("Le véhicule est obligatoire.");
        }

        if (assurance.getNumeroPolice() == null
                || assurance.getNumeroPolice().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body("Le numéro de police est obligatoire.");
        }

        if (assurance.getDateExpiration() == null) {

            return ResponseEntity
                    .badRequest()
                    .body("La date d'expiration est obligatoire.");
        }

        assurance.setNumeroPolice(
                assurance.getNumeroPolice().trim()
        );

        Assurance sauvegardee =
                assuranceRepository.save(assurance);

        return ResponseEntity.ok(sauvegardee);
    }

    // =====================================================
    // LISTER LES ASSURANCES
    // =====================================================

    @GetMapping
    public List<Assurance> lister() {

        List<Assurance> assurances =
                assuranceRepository.findAll();

        /*
         * Les échéances les plus proches apparaissent en premier.
         * Les lignes sans date sont placées à la fin.
         */
        assurances.sort(
                Comparator.comparing(
                        Assurance::getDateExpiration,
                        Comparator.nullsLast(
                                Comparator.naturalOrder()
                        )
                )
        );

        return assurances;
    }

    // =====================================================
    // DETAIL D'UNE ASSURANCE
    // =====================================================

    @GetMapping("/{id}")
    public ResponseEntity<Assurance> detail(
            @PathVariable UUID id
    ) {

        return assuranceRepository
                .findById(id)
                .map(ResponseEntity::ok)
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build()
                );
    }

    // =====================================================
    // ALERTES J-15
    // =====================================================
    //
    // Le cahier des charges prévoit :
    // - alerte à J-15 ;
    // - les assurances déjà expirées doivent rester visibles
    //   jusqu'à leur régularisation.
    //
    // La requête actuelle du repository répond bien à cette
    // logique : dateExpiration <= aujourd'hui + 15 jours.
    // =====================================================

    @GetMapping("/alertes")
    public List<Assurance> alertesExpiration() {

        LocalDate limite =
                LocalDate.now().plusDays(15);

        List<Assurance> alertes =
                assuranceRepository
                        .findByDateExpirationLessThanEqual(
                                limite
                        );

        alertes.sort(
                Comparator.comparing(
                        Assurance::getDateExpiration,
                        Comparator.nullsLast(
                                Comparator.naturalOrder()
                        )
                )
        );

        return alertes;
    }

    // =====================================================
    // MODIFIER / RENOUVELER UNE POLICE
    // =====================================================

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> modifier(
            @PathVariable UUID id,
            @RequestBody Assurance donnees
    ) {

        if (donnees == null) {
            return ResponseEntity
                    .badRequest()
                    .body("Les informations de l'assurance sont obligatoires.");
        }

        return assuranceRepository
                .findById(id)
                .<ResponseEntity<?>>map(assuranceExistante -> {

                    if (donnees.getVehicule() == null
                            || donnees.getVehicule().getId() == null) {

                        return ResponseEntity
                                .badRequest()
                                .body("Le véhicule est obligatoire.");
                    }

                    if (donnees.getNumeroPolice() == null
                            || donnees.getNumeroPolice().isBlank()) {

                        return ResponseEntity
                                .badRequest()
                                .body("Le numéro de police est obligatoire.");
                    }

                    if (donnees.getDateExpiration() == null) {

                        return ResponseEntity
                                .badRequest()
                                .body("La date d'expiration est obligatoire.");
                    }

                    /*
                     * IMPORTANT :
                     *
                     * On copie toutes les propriétés réellement présentes
                     * dans l'entité Assurance, sauf son identifiant.
                     *
                     * Cela conserve la compatibilité avec les champs
                     * existants :
                     * - vehicule
                     * - numeroPolice
                     * - dateExpiration
                     *
                     * et permet aussi de conserver automatiquement les
                     * champs complémentaires si ton modèle les possède :
                     * - dateDebut
                     * - assureur
                     * - typeCouverture
                     * - montantPrime
                     * - observation
                     * - documentPolice
                     * etc.
                     */
                    BeanUtils.copyProperties(
                            donnees,
                            assuranceExistante,
                            "id"
                    );

                    assuranceExistante.setNumeroPolice(
                            donnees
                                    .getNumeroPolice()
                                    .trim()
                    );

                    Assurance sauvegardee =
                            assuranceRepository.save(
                                    assuranceExistante
                            );

                    return ResponseEntity.ok(
                            sauvegardee
                    );
                })
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build()
                );
    }

    // =====================================================
    // SUPPRIMER UNE ASSURANCE
    // =====================================================

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> supprimer(
            @PathVariable UUID id
    ) {

        if (!assuranceRepository.existsById(id)) {
            return ResponseEntity
                    .notFound()
                    .build();
        }

        assuranceRepository.deleteById(id);

        return ResponseEntity
                .noContent()
                .build();
    }
}
