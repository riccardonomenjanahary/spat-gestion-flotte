package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Direction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DirectionRepository extends JpaRepository<Direction, Long> {

    Optional<Direction> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);
}
