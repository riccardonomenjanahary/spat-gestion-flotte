package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.SignalementIncident;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SignalementIncidentRepository extends JpaRepository<SignalementIncident, Long> {

    boolean existsByVehiculeIdAndIdNotAndStatutNotIn(Long vehiculeId, Long id, java.util.Collection<String> statuts);

    List<SignalementIncident> findByVehiculeIdOrderByDateSignalementDesc(Long vehiculeId);

    List<SignalementIncident> findByStatutOrderByDateSignalementDesc(String statut);

    List<SignalementIncident> findAllByOrderByDateSignalementDesc();

    long countByStatut(String statut);
}
