package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.CarnetBord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface CarnetBordRepository extends JpaRepository<CarnetBord, Long> {

    List<CarnetBord> findByVehiculeIdOrderByDateSortieDesc(Long vehiculeId);

    List<CarnetBord> findByReservationId(Long reservationId);

    List<CarnetBord> findByStatut(String statut);

    @Query("SELECT c FROM CarnetBord c WHERE c.dateSortie >= :debut AND c.dateSortie <= :fin ORDER BY c.dateSortie DESC")
    List<CarnetBord> findByPeriode(@Param("debut") LocalDateTime debut, @Param("fin") LocalDateTime fin);

    @Query("SELECT c FROM CarnetBord c WHERE c.vehicule.id = :vehiculeId AND c.statut = 'EN_COURS'")
    List<CarnetBord> findEnCoursByVehicule(@Param("vehiculeId") Long vehiculeId);
}
