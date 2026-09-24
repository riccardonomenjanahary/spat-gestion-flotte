package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Assurance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// =========================================================
// REPOSITORY ASSURANCE
// =========================================================

public interface AssuranceRepository
        extends JpaRepository<Assurance, UUID> {

    /*
     * Utilisé pour les alertes J-15.
     * Retourne également les assurances déjà expirées afin
     * qu'elles restent visibles jusqu'à régularisation.
     */
    List<Assurance> findByDateExpirationLessThanEqual(
            LocalDate date
    );

    /*
     * Historique par véhicule.
     */
    List<Assurance> findByVehiculeIdOrderByDateExpirationDesc(
            Long vehiculeId
    );

    /*
     * Recherche pratique d'une police.
     */
    List<Assurance> findByNumeroPoliceContainingIgnoreCase(
            String numeroPolice
    );
}
