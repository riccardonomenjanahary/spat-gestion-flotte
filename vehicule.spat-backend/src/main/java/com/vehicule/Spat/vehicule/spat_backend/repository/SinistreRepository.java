package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Sinistre;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

// =========================================================
// REPOSITORY SINISTRE
// =========================================================

public interface SinistreRepository
        extends JpaRepository<Sinistre, UUID> {

    /*
     * Historique des sinistres par véhicule.
     */
    List<Sinistre> findByVehiculeIdOrderByDateSinistreDesc(
            Long vehiculeId
    );

    /*
     * Filtrage des dossiers par statut.
     */
    List<Sinistre> findByStatutIgnoreCaseOrderByDateSinistreDesc(
            String statut
    );

    /*
     * Recherche d'un dossier par numéro.
     */
    List<Sinistre> findByNumeroDossierContainingIgnoreCase(
            String numeroDossier
    );
}
