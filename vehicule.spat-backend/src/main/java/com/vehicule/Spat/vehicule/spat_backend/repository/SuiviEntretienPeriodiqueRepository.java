package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.SuiviEntretienPeriodique;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SuiviEntretienPeriodiqueRepository
        extends JpaRepository<SuiviEntretienPeriodique, Long> {

    Optional<SuiviEntretienPeriodique>
    findByVehiculeId(
            Long vehiculeId
    );
}

