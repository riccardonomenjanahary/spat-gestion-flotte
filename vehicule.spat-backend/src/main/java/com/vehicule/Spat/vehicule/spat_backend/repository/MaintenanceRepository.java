package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Maintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.StatutMaintenance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MaintenanceRepository
        extends JpaRepository<Maintenance, UUID> {

    List<Maintenance> findByStatut(
            StatutMaintenance statut
    );
}