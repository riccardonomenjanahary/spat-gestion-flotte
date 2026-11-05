package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Requisition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RequisitionRepository extends JpaRepository<Requisition, Long> {

    List<Requisition> findByStatutOrderByDateRequisitionDesc(String statut);

    List<Requisition> findByVehiculeIdOrderByDateRequisitionDesc(Long vehiculeId);

    List<Requisition> findAllByOrderByDateRequisitionDesc();
}
