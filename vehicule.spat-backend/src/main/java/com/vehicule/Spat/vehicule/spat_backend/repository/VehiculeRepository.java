package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

import java.util.Optional;

@Repository
public interface VehiculeRepository
        extends JpaRepository<Vehicule, Long> {

    // =========================================================
    // RECHERCHE PAR IMMATRICULATION / IDENTIFIANT
    // =========================================================

    /**
     * Recherche un véhicule ou matériel roulant
     * par son immatriculation / identifiant,
     * sans tenir compte des majuscules/minuscules.
     *
     * Exemples :
     * 1205TCA
     * 1205tca
     *
     * seront considérés comme identiques.
     */
    Optional<Vehicule> findByImmatriculationIgnoreCase(
            String immatriculation
    );


    // =========================================================
    // CONTROLE DOUBLON A LA CREATION
    // =========================================================

    /**
     * Vérifie si une immatriculation / un identifiant
     * existe déjà dans la base.
     */
    boolean existsByImmatriculationIgnoreCase(
            String immatriculation
    );


    // =========================================================
    // CONTROLE DOUBLON A LA MODIFICATION
    // =========================================================

    /**
     * Vérifie si une autre fiche utilise déjà
     * la même immatriculation.
     *
     * L'identifiant passé dans "id" est exclu
     * de la recherche.
     *
     * Utile lorsqu'on modifie un véhicule existant.
     */
    boolean existsByImmatriculationIgnoreCaseAndIdNot(
            String immatriculation,
            Long id
    );


    // =========================================================
    // VERROU VEHICULE POUR AFFECTATION
    // =========================================================

    /**
     * Charge un véhicule avec un verrou pessimiste d'écriture.
     *
     * Utilisé lors de la validation d'une réservation.
     *
     * Le but est d'éviter que deux validations simultanées
     * puissent affecter le même véhicule au même moment.
     *
     * Cette méthode doit être utilisée à l'intérieur
     * d'une méthode annotée @Transactional.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT v
        FROM Vehicule v
        WHERE v.id = :id
        """)
    Optional<Vehicule> findByIdForUpdate(
            @Param("id") Long id
    );
}