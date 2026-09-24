package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.SignalementEntretienChauffeur;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SignalementEntretienChauffeurRepository
        extends JpaRepository<SignalementEntretienChauffeur, Long> {

    List<SignalementEntretienChauffeur>
    findByChauffeurIdOrderByDateSignalementDesc(
            Long chauffeurId
    );
}