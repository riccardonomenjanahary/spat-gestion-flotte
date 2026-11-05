package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Maintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.StatutMaintenance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Collection;
import java.util.UUID;

public interface MaintenanceRepository
        extends JpaRepository<Maintenance, UUID> {

    boolean existsByReservationId(Long reservationId);

    List<Maintenance> findByReservationId(Long reservationId);

    List<Maintenance> findByStatut(
            StatutMaintenance statut
    );

    boolean existsByVehiculeIdAndOrigineDemandeIsNotNullAndStatutIn(
            Long vehiculeId,
            Collection<StatutMaintenance> statuts
    );

    List<Maintenance> findByVehiculeIdAndOrigineDemandeIsNotNullAndStatutIn(
            Long vehiculeId,
            Collection<StatutMaintenance> statuts
    );

    boolean existsByVehiculeIdAndIdNotAndOrigineDemandeIsNotNullAndStatutIn(
            Long vehiculeId,
            UUID id,
            Collection<StatutMaintenance> statuts
    );
}
