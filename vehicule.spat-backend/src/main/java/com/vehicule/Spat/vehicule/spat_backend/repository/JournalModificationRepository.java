package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.JournalModification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JournalModificationRepository extends JpaRepository<JournalModification, Long> {
    Page<JournalModification> findAllByOrderByDateActionDesc(Pageable pageable);
}
