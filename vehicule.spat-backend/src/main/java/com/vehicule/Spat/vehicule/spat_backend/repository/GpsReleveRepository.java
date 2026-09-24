package com.vehicule.Spat.vehicule.spat_backend.repository;

import com.vehicule.Spat.vehicule.spat_backend.model.GpsReleve;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;

public interface GpsReleveRepository extends JpaRepository<GpsReleve, Long> {
    boolean existsByGpsDeviceIdAndTimestampGps(Long gpsDeviceId, Long timestampGps);
    List<GpsReleve> findByVehiculeIdAndDateGpsGreaterThanEqualAndDateGpsLessThanOrderByDateGpsAscIdAsc(
            Long vehiculeId, Instant debutInclus, Instant finExclue);
}

