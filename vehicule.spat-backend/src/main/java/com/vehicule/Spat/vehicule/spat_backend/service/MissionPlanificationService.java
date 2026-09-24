package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Reservation;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MissionPlanificationService {

    private final ReservationRepository reservationRepository;

    public MissionPlanificationService(
            ReservationRepository reservationRepository
    ) {
        this.reservationRepository = reservationRepository;
    }

    /**
     * Les missions dans Toamasina restent FLEXIBLE
     * jusqu'à leur heure de départ.
     *
     * À l'heure prévue, elles deviennent automatiquement
     * VERROUILLEE, ce qui est affiché comme "Planifiée".
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void planifierMissionsToamasinaArriveesAHeure() {

        List<Reservation> missions =
                reservationRepository
                        .findMissionsToamasinaFlexiblesArriveesAHeure(
                                LocalDateTime.now()
                        );

        for (Reservation mission : missions) {
            mission.setMobilisabilite(
                    "VERROUILLEE"
            );
        }

        if (!missions.isEmpty()) {
            reservationRepository.saveAll(
                    missions
            );
        }
    }
}
