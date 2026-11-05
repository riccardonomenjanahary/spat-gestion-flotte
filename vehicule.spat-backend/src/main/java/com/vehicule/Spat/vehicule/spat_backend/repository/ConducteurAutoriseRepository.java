package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.ConducteurAutorise;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConducteurAutoriseRepository extends JpaRepository<ConducteurAutorise, Long> {
    Optional<ConducteurAutorise> findByMatriculeAndDirectionId(String matricule, Long directionId);

    List<ConducteurAutorise> findByDirectionIdAndActifTrue(Long directionId);

    List<ConducteurAutorise> findByActifTrue();

    Optional<ConducteurAutorise> findByMatriculeAndDirectionIdAndActifTrue(String matricule, Long directionId);

    boolean existsByMatriculeAndDirectionIdAndActifTrueAndValideTrue(String matricule, Long directionId);

    List<ConducteurAutorise> findByValideAndActifTrue(Boolean valide);
}
