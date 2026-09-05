package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Assurance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AssuranceRepository extends JpaRepository<Assurance, UUID> {
    List<Assurance> findByDateExpirationLessThanEqual(LocalDate date);
}
