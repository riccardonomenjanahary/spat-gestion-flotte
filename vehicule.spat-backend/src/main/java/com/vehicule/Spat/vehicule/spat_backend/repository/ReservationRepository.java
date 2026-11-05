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
import java.util.Collection;

@Repository
public interface ReservationRepository
        extends JpaRepository<Reservation, Long> {

    boolean existsByMotifAndDateDebut(String motif, LocalDateTime dateDebut);

    // =====================================================
    // LISTES
    // =====================================================

    List<Reservation>
    findByDemandeurIdOrderByDateCreationDesc(
            Long demandeurId
    );

    List<Reservation> findByVehiculeId(Long vehiculeId);

    List<Reservation>
    findAllByOrderByDateCreationDesc();

    List<Reservation>
    findByStatutOrderByDateCreationDesc(
            String statut
    );

    boolean existsByVehiculeIdAndStatutIn(
            Long vehiculeId,
            Collection<String> statuts
    );

    // =====================================================
    // ESPACE CHAUFFEUR
    // =====================================================

    /*
     * Dès qu'une mission est créée avec un véhicule,
     * le chauffeur affecté à ce véhicule est enregistré
     * dans Reservation.chauffeur.
     *
     * Cette requête alimente donc automatiquement
     * l'espace du chauffeur.
     */
    List<Reservation>
    findByChauffeurIdOrderByDateDebutDesc(
            Long chauffeurId
    );

    // =====================================================
    // PASSAGE FLEXIBLE -> PLANIFIEE
    // =====================================================

    @Query("""
        SELECT r
        FROM Reservation r
        WHERE r.zoneMission = 'VILLE_TOAMASINA'
          AND r.mobilisabilite = 'FLEXIBLE'
          AND r.dateDebut <= :maintenant
          AND r.statut <> 'REFUSEE'
        """)
    List<Reservation>
    findMissionsToamasinaFlexiblesArriveesAHeure(
            @Param("maintenant")
            LocalDateTime maintenant
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
     * EN_ATTENTE est inclus car le véhicule est déjà réservé à la création.
     * Pour les missions rapides de l'Assistant, dateFin correspond à la fin
     * estimée; les anciennes missions sans estimation restent bloquantes
     * jusqu'à leur clôture.
     *
     * Une mission FLEXIBLE peut être réorganisée en cas d'urgence,
     * mais elle ne doit pas créer une double affectation automatique.
     */
    @Query("""
        SELECT COUNT(r) > 0
        FROM Reservation r

        WHERE r.vehicule IS NOT NULL

        AND r.vehicule.id = :vehiculeId

        AND (
            :reservationId IS NULL
            OR r.id <> :reservationId
        )

        AND r.statut IN (
            'PLANIFIEE',
            'EN_COURS',
            'EN_ATTENTE',
            'EN_ATTENTE_AVIS_DID',
            'VALIDEE_N1',
                        'VALIDEE',
                        'CLOTUREE'
        )

                AND r.dateDebut < :dateFin
                AND (
                        r.dateFin > :dateDebut
                        OR (
                                r.modeCreation = 'ASSISTANT_DIRECTION'
                                AND r.statut = 'EN_ATTENTE'
                                AND r.dureeEstimeeMinutes IS NULL
                        )
                )
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

    @Query("""
        SELECT r FROM Reservation r
        WHERE r.vehicule IS NOT NULL
          AND r.vehicule.id = :vehiculeId
          AND (:reservationId IS NULL OR r.id <> :reservationId)
          AND r.statut IN ('PLANIFIEE','EN_COURS','EN_ATTENTE','EN_ATTENTE_AVIS_DID','VALIDEE_N1','VALIDEE','CLOTUREE')
          AND r.dateDebut < :dateFin
          AND (r.dateFin > :dateDebut OR (r.modeCreation = 'ASSISTANT_DIRECTION' AND r.statut = 'EN_ATTENTE' AND r.dureeEstimeeMinutes IS NULL))
        ORDER BY r.dateFin ASC
        """)
    List<Reservation> trouverChevauchementsVehicule(
            @Param("vehiculeId") Long vehiculeId,
            @Param("reservationId") Long reservationId,
            @Param("dateDebut") LocalDateTime dateDebut,
            @Param("dateFin") LocalDateTime dateFin
    );

    // =====================================================
    // CHEVAUCHEMENT CHAUFFEUR
    // =====================================================

    @Query("""
        SELECT COUNT(r) > 0
        FROM Reservation r

        WHERE r.chauffeur IS NOT NULL

        AND r.chauffeur.id = :chauffeurId

        AND (
            :reservationId IS NULL
            OR r.id <> :reservationId
        )

        AND r.statut IN (
            'PLANIFIEE',
            'EN_COURS',
            'EN_ATTENTE',
            'EN_ATTENTE_AVIS_DID',
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
