package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Requisition;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RequisitionRepository extends JpaRepository<Requisition, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Requisition r where r.id = :id")
    Optional<Requisition> findByIdForUpdate(@Param("id") Long id);

    List<Requisition> findByStatutOrderByDateRequisitionDesc(String statut);

    List<Requisition> findByVehiculeIdOrderByDateRequisitionDesc(Long vehiculeId);

    List<Requisition> findAllByOrderByDateRequisitionDesc();
}
