package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.FicheSurete;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FicheSureteRepository extends JpaRepository<FicheSurete, Long> {

    List<FicheSurete> findAllByOrderByDateDepotDesc();
}
