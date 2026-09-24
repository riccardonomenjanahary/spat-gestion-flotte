package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Chauffeur;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChauffeurRepository
        extends JpaRepository<Chauffeur, Long> {

    // =========================================================
    // RECHERCHE PAR MATRICULE
    // =========================================================
    //
    // Utilisé par l'espace chauffeur pour faire le lien entre
    // l'utilisateur connecté (matricule contenu dans le JWT)
    // et la fiche Chauffeur correspondante.
    // =========================================================

    Optional<Chauffeur> findByMatricule(String matricule);

    // =========================================================
    // VERROU CHAUFFEUR POUR AFFECTATION
    // =========================================================

    /**
     * Charge un chauffeur avec un verrou pessimiste d'écriture.
     *
     * Utilisé au moment de la validation niveau 1
     * d'une demande de véhicule.
     *
     * Cela permet d'éviter que deux validations simultanées
     * puissent affecter le même chauffeur sur un même créneau.
     *
     * Cette méthode doit être appelée dans une transaction
     * (@Transactional).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT c
        FROM Chauffeur c
        WHERE c.id = :id
        """)
    Optional<Chauffeur> findByIdForUpdate(
            @Param("id") Long id
    );
}
