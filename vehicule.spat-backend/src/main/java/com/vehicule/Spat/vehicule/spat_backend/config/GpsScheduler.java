package com.vehicule.Spat.vehicule.spat_backend.config;

import com.vehicule.Spat.vehicule.spat_backend.service.GpsService;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;


@Configuration
@EnableScheduling
public class GpsScheduler {

    private final GpsService gpsService;


    public GpsScheduler(
            GpsService gpsService
    ) {

        this.gpsService =
                gpsService;
    }


    /**
     * Synchronisation GPS.
     *
     * Par défaut :
     * toutes les 5 secondes.
     *
     * La valeur est configurable dans :
     *
     * gps.refresh-ms
     */
    @Scheduled(
            fixedDelayString = "${gps.refresh-ms:5000}",
            initialDelayString = "${gps.initial-delay-ms:5000}"
    )
    public void synchroniserGps() {

        gpsService.rafraichirPositions();
    }
}
