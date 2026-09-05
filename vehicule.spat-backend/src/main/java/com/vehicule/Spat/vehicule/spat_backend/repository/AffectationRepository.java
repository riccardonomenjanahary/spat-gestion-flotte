package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Affectation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AffectationRepository
        extends JpaRepository<Affectation, Long> {

    // =====================================================
    // LISTES
    // =====================================================

    List<Affectation> findByChauffeurId(
            Long chauffeurId
    );

    List<Affectation> findByVehiculeId(
            Long vehiculeId
    );

    // =====================================================
    // SUPPRESSIONS
    // =====================================================

    void deleteByVehiculeId(
            Long vehiculeId
    );

    void deleteByChauffeurId(
            Long chauffeurId
    );

    // =====================================================
    // CHEVAUCHEMENT CHAUFFEUR
    // =====================================================

    /**
     * Vérifie si un chauffeur possède déjà
     * une affectation réelle qui chevauche
     * la période demandée.
     *
     * ANNULEE ne bloque pas.
     */
    @Query("""
        SELECT COUNT(a) > 0
        FROM Affectation a

        WHERE a.chauffeur.id = :chauffeurId

        AND a.statut <> 'ANNULEE'

        AND a.dateDebut < :dateFin
        AND a.dateFin > :dateDebut
        """)
    boolean existeChevauchementChauffeur(
            @Param("chauffeurId")
            Long chauffeurId,

            @Param("dateDebut")
            LocalDateTime dateDebut,

            @Param("dateFin")
            LocalDateTime dateFin
    );

    // =====================================================
    // CHEVAUCHEMENT VEHICULE
    // =====================================================

    /**
     * Même protection pour les véhicules.
     *
     * Cela évite de proposer un véhicule déjà engagé
     * dans une Affectation existante.
     */
    @Query("""
        SELECT COUNT(a) > 0
        FROM Affectation a

        WHERE a.vehicule.id = :vehiculeId

        AND a.statut <> 'ANNULEE'

        AND a.dateDebut < :dateFin
        AND a.dateFin > :dateDebut
        """)
    boolean existeChevauchementVehicule(
            @Param("vehiculeId")
            Long vehiculeId,

            @Param("dateDebut")
            LocalDateTime dateDebut,

            @Param("dateFin")
            LocalDateTime dateFin
    );
}