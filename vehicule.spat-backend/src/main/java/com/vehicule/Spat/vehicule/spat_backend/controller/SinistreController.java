package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.Sinistre;
import com.vehicule.Spat.vehicule.spat_backend.repository.SinistreRepository;

import org.springframework.beans.BeanUtils;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.PropertyAccessorFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

// =========================================================
// CONTROLLER SINISTRES
// =========================================================

@RestController
@RequestMapping("/api/sinistres")
public class SinistreController {

    private final SinistreRepository sinistreRepository;

    public SinistreController(
            SinistreRepository sinistreRepository
    ) {
        this.sinistreRepository = sinistreRepository;
    }

    // =====================================================
    // CREER UN DOSSIER DE SINISTRE
    // =====================================================

    @PostMapping
    @Transactional
    public ResponseEntity<?> creer(
            @RequestBody Sinistre sinistre
    ) {

        if (sinistre == null) {
            return ResponseEntity
                    .badRequest()
                    .body("Les informations du sinistre sont obligatoires.");
        }

        /*
         * Le contrôleur conserve volontairement la structure
         * actuelle de l'entité Sinistre.
         *
         * Les champs envoyés par le frontend qui existent
         * réellement dans l'entité seront persistés par JPA.
         */

        Sinistre sauvegarde =
                sinistreRepository.save(
                        sinistre
                );

        return ResponseEntity.ok(
                sauvegarde
        );
    }

    // =====================================================
    // LISTER LES SINISTRES
    // =====================================================

    @GetMapping
    public List<Sinistre> lister() {

        return sinistreRepository.findAll();
    }

    // =====================================================
    // DETAIL D'UN SINISTRE
    // =====================================================

    @GetMapping("/{id}")
    public ResponseEntity<Sinistre> detail(
            @PathVariable UUID id
    ) {

        return sinistreRepository
                .findById(id)
                .map(ResponseEntity::ok)
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build()
                );
    }

    // =====================================================
    // MODIFIER UN DOSSIER DE SINISTRE
    // =====================================================

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> modifier(
            @PathVariable UUID id,
            @RequestBody Sinistre donnees
    ) {

        if (donnees == null) {
            return ResponseEntity
                    .badRequest()
                    .body("Les informations du sinistre sont obligatoires.");
        }

        return sinistreRepository
                .findById(id)
                .<ResponseEntity<?>>map(sinistreExistant -> {

                    /*
                     * Copie tous les champs réellement présents
                     * dans ton modèle Sinistre sans imposer ici
                     * une nouvelle structure Java.
                     *
                     * Cela préserve les fonctionnalités existantes
                     * et prend aussi en charge automatiquement, si
                     * ces propriétés existent dans ton entité :
                     *
                     * - vehicule
                     * - dateSinistre
                     * - conducteur
                     * - circonstance
                     * - description
                     * - constatAmiable
                     * - statut
                     * - dateCloture
                     * etc.
                     */
                    BeanUtils.copyProperties(
                            donnees,
                            sinistreExistant,
                            "id"
                    );

                    Sinistre sauvegarde =
                            sinistreRepository.save(
                                    sinistreExistant
                            );

                    return ResponseEntity.ok(
                            sauvegarde
                    );
                })
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build()
                );
    }

    // =====================================================
    // CHANGER LE STATUT D'UN SINISTRE
    // =====================================================
    //
    // Permet par exemple :
    // OUVERT -> EN_COURS -> CLOTURE
    //
    // L'utilisation de BeanWrapper permet de rester compatible
    // avec ton modèle actuel : si le champ "statut" n'existe pas,
    // le serveur retourne une erreur claire plutôt que de casser
    // la compilation.
    // =====================================================

    @PutMapping("/{id}/statut")
    @Transactional
    public ResponseEntity<?> changerStatut(
            @PathVariable UUID id,
            @RequestBody java.util.Map<String, Object> request
    ) {

        Object valeurStatut =
                request != null
                        ? request.get("statut")
                        : null;

        String statut =
                valeurStatut != null
                        ? String.valueOf(
                        valeurStatut
                ).trim()
                        : "";

        if (statut.isBlank()) {
            return ResponseEntity
                    .badRequest()
                    .body("Le statut est obligatoire.");
        }

        return sinistreRepository
                .findById(id)
                .<ResponseEntity<?>>map(sinistre -> {

                    BeanWrapper wrapper =
                            PropertyAccessorFactory
                                    .forBeanPropertyAccess(
                                            sinistre
                                    );

                    if (!wrapper.isWritableProperty("statut")) {

                        return ResponseEntity
                                .badRequest()
                                .body(
                                        "Le modèle Sinistre ne possède pas encore de champ 'statut'."
                                );
                    }

                    wrapper.setPropertyValue(
                            "statut",
                            statut
                                    .toUpperCase()
                    );

                    Sinistre sauvegarde =
                            sinistreRepository.save(
                                    sinistre
                            );

                    return ResponseEntity.ok(
                            sauvegarde
                    );
                })
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build()
                );
    }

    // =====================================================
    // SUPPRIMER UN DOSSIER DE SINISTRE
    // =====================================================

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> supprimer(
            @PathVariable UUID id
    ) {

        if (!sinistreRepository.existsById(id)) {
            return ResponseEntity
                    .notFound()
                    .build();
        }

        sinistreRepository.deleteById(id);

        return ResponseEntity
                .noContent()
                .build();
    }
}
