package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.CarnetBord;
import com.vehicule.Spat.vehicule.spat_backend.model.GpsReleve;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.CarnetBordRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.GpsReleveRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

/**
 * Rapprochement entre le kilométrage déclaré dans le
 * carnet de bord et les données GPS.
 *
 * Signale les écarts supérieurs au seuil configurable.
 */
@Service
public class RapprochementGpsService {

    /**
     * Seuil d'écart en km au-delà duquel un
     * signalement est généré.
     */
    private static final double SEUIL_ECART_KM = 10.0;

    private final CarnetBordRepository carnetBordRepository;
    private final GpsReleveRepository gpsReleveRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final NotificationService notificationService;

    public RapprochementGpsService(
            CarnetBordRepository carnetBordRepository,
            GpsReleveRepository gpsReleveRepository,
            UtilisateurRepository utilisateurRepository,
            NotificationService notificationService
    ) {
        this.carnetBordRepository = carnetBordRepository;
        this.gpsReleveRepository = gpsReleveRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.notificationService = notificationService;
    }

    /**
     * Toutes les 6 heures, vérifie les carnets de bord
     * clôturés récemment et compare le kilométrage
     * déclaré aux données GPS.
     */
    @Scheduled(fixedRate = 21600000) // 6 heures
    @Transactional(readOnly = true)
    public void verifierEcarts() {

        LocalDateTime depuis = LocalDateTime.now().minusHours(24);
        LocalDateTime jusqua = LocalDateTime.now();

        List<CarnetBord> carnets = carnetBordRepository
                .findByPeriode(depuis, jusqua);

        for (CarnetBord carnet : carnets) {
            if (!"CLOTURE".equals(carnet.getStatut())) {
                continue;
            }
            if (carnet.getKilometrageDepart() == null
                    || carnet.getKilometrageRetour() == null) {
                continue;
            }

            Vehicule vehicule = carnet.getVehicule();
            if (vehicule.getGpsDeviceId() == null
                    || !Boolean.TRUE.equals(vehicule.getGpsEquipe())) {
                continue;
            }

            long kmDeclare = carnet.getKilometrageRetour()
                    - carnet.getKilometrageDepart();

            // Rechercher les relevés GPS sur la période
            Instant debut = carnet.getDateSortie()
                    .atZone(ZoneId.of("Indian/Antananarivo"))
                    .toInstant();
            Instant fin = carnet.getDateRetour()
                    .atZone(ZoneId.of("Indian/Antananarivo"))
                    .toInstant();

            List<GpsReleve> releves = gpsReleveRepository
                    .findByGpsDeviceIdAndDateGpsBetweenOrderByDateGpsAsc(
                            vehicule.getGpsDeviceId(), debut, fin
                    );

            if (releves.isEmpty()) {
                continue;
            }

            // Calculer la distance GPS parcourue
            double distanceGps = calculerDistanceGps(releves);

            double ecart = Math.abs(kmDeclare - distanceGps);

            if (ecart > SEUIL_ECART_KM) {
                utilisateurRepository.findByRole("CHEF_SERVICE_LOGISTIQUE")
                        .forEach(u -> {
                            try {
                                notificationService.creerNotification(
                                        "ECART_KILOMETRAGE_GPS",
                                        "WARNING",
                                        "⚠️ Écart kilométrage/GPS — "
                                                + vehicule.getImmatriculation(),
                                        String.format(
                                                "Écart détecté sur le véhicule %s : "
                                                        + "%d km déclarés vs %.1f km GPS "
                                                        + "(écart : %.1f km). "
                                                        + "Conducteur : %s, Date : %s.",
                                                vehicule.getImmatriculation(),
                                                kmDeclare,
                                                distanceGps,
                                                ecart,
                                                carnet.getConducteurNom(),
                                                carnet.getDateSortie().toLocalDate()
                                        ),
                                        u.getMatricule(),
                                        u.getEmail(),
                                        u.getRole(),
                                        null,
                                        null,
                                        null,
                                        vehicule.getId()
                                );
                            } catch (Exception ignored) {
                            }
                        });
            }
        }
    }

    /**
     * Calcule la distance totale à partir des relevés GPS
     * en utilisant la formule de Haversine.
     */
    private double calculerDistanceGps(List<GpsReleve> releves) {
        double totalKm = 0;
        for (int i = 1; i < releves.size(); i++) {
            GpsReleve prev = releves.get(i - 1);
            GpsReleve curr = releves.get(i);

            if (prev.getLatitude() == null || prev.getLongitude() == null
                    || curr.getLatitude() == null || curr.getLongitude() == null) {
                continue;
            }

            totalKm += haversine(
                    prev.getLatitude(), prev.getLongitude(),
                    curr.getLatitude(), curr.getLongitude()
            );
        }
        return totalKm;
    }

    /**
     * Formule de Haversine pour calculer la distance
     * entre deux points GPS en kilomètres.
     */
    private double haversine(
            double lat1, double lon1,
            double lat2, double lon2
    ) {
        double R = 6371.0; // Rayon de la Terre en km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2)
                * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
