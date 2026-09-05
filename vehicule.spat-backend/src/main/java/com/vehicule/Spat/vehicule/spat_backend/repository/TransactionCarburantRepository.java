package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.TransactionCarburant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TransactionCarburantRepository extends JpaRepository<TransactionCarburant, UUID> {

    List<TransactionCarburant> findByVehiculeIdOrderByDateOperationDesc(Long vehiculeId);

    List<TransactionCarburant> findAllByOrderByDateOperationDesc();

    List<TransactionCarburant> findByDateOperationBetween(LocalDate debut, LocalDate fin);
}