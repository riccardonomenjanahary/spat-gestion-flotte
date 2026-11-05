package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.EtatLieux;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EtatLieuxRepository extends JpaRepository<EtatLieux, Long> {

    List<EtatLieux> findByCarnetBordId(Long carnetBordId);

    List<EtatLieux> findByVehiculeIdOrderByDateRealisationDesc(Long vehiculeId);

    List<EtatLieux> findByCarnetBordIdAndMoment(Long carnetBordId, String moment);
}
