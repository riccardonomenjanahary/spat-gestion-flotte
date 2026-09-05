package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository
        extends JpaRepository<Reservation, Long> {

    // =====================================================
    // LISTES
    // =====================================================

    List<Reservation>
    findByDemandeurIdOrderByDateCreationDesc(
            Long demandeurId
    );

    List<Reservation>
    findAllByOrderByDateCreationDesc();

    List<Reservation>
    findByStatutOrderByDateCreationDesc(
            String statut
    );

    // =====================================================
    // SUPPRESSIONS
    // =====================================================

    void deleteByVehiculeId(
            Long vehiculeId
    );

    void deleteByDemandeurId(
            Long demandeurId
    );

    // =====================================================
    // VERROU RESERVATION
    // =====================================================

    /**
     * Charge une réservation avec verrou d'écriture.
     *
     * Utilisé pendant la validation/refus afin
     * d'empêcher deux traitements simultanés
     * sur la même demande.
     *
     * Cette méthode doit être appelée dans
     * une méthode @Transactional.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT r
        FROM Reservation r
        WHERE r.id = :id
        """)
    Optional<Reservation> findByIdForUpdate(
            @Param("id") Long id
    );

    // =====================================================
    // CHEVAUCHEMENT VEHICULE
    // =====================================================

    /**
     * Une demande EN_ATTENTE ne bloque pas le véhicule.
     *
     * Seules les demandes déjà validées
     * avec affectation doivent bloquer le créneau.
     */
    @Query("""
        SELECT COUNT(r) > 0
        FROM Reservation r

        WHERE r.vehicule IS NOT NULL

        AND r.vehicule.id = :vehiculeId

        AND r.id <> :reservationId

        AND r.statut IN (
            'VALIDEE_N1',
            'VALIDEE'
        )

        AND r.dateDebut < :dateFin
        AND r.dateFin > :dateDebut
        """)
    boolean existeChevauchementVehicule(
            @Param("vehiculeId")
            Long vehiculeId,

            @Param("reservationId")
            Long reservationId,

            @Param("dateDebut")
            LocalDateTime dateDebut,

            @Param("dateFin")
            LocalDateTime dateFin
    );

    // =====================================================
    // CHEVAUCHEMENT CHAUFFEUR
    // =====================================================

    /**
     * Vérifie qu'un chauffeur n'est pas déjà
     * affecté à une autre réservation validée
     * pendant la même période.
     */
    @Query("""
        SELECT COUNT(r) > 0
        FROM Reservation r

        WHERE r.chauffeur IS NOT NULL

        AND r.chauffeur.id = :chauffeurId

        AND r.id <> :reservationId

        AND r.statut IN (
            'VALIDEE_N1',
            'VALIDEE'
        )

        AND r.dateDebut < :dateFin
        AND r.dateFin > :dateDebut
        """)
    boolean existeChevauchementChauffeur(
            @Param("chauffeurId")
            Long chauffeurId,

            @Param("reservationId")
            Long reservationId,

            @Param("dateDebut")
            LocalDateTime dateDebut,

            @Param("dateFin")
            LocalDateTime dateFin
    );
}