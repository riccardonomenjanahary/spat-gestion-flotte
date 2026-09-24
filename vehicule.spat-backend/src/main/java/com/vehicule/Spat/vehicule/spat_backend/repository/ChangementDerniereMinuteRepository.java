package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.ChangementDerniereMinute;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChangementDerniereMinuteRepository extends JpaRepository<ChangementDerniereMinute, Long> {
    boolean existsByTicketInitialId(Long ticketInitialId);
    List<ChangementDerniereMinute> findAllByOrderByDateChangementDesc();
}
