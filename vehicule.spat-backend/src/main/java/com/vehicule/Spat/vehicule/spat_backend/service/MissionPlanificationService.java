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

        // Après la validation N2, les missions hors ville portent le statut
        // PLANIFIEE. Elles passent automatiquement en cours à l'heure de
        // départ, comme les missions rapides en ville.
        List<Reservation> missionsHorsVille = reservationRepository.findAllByOrderByDateCreationDesc().stream()
                .filter(mission -> "PLANIFIEE".equalsIgnoreCase(mission.getStatut()))
                .filter(mission -> mission.getDateDebut() != null && !mission.getDateDebut().isAfter(LocalDateTime.now()))
                .peek(mission -> mission.setStatut("EN_COURS"))
                .toList();
        if (!missionsHorsVille.isEmpty()) reservationRepository.saveAll(missionsHorsVille);

    }
}
