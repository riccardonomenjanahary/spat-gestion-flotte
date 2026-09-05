package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.Sinistre;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SinistreRepository extends JpaRepository<Sinistre, UUID> {
}
