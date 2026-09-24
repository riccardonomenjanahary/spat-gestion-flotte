package com.vehicule.Spat.vehicule.spat_backend.dto;

public record GpsReleveHistoriqueResponse(
        Long id,
        Long vehiculeId,
        Long gpsDeviceId,
        String dateGps,
        Long timestampGps,
        Double latitude,
        Double longitude,
        Integer vitesse,
        Double altitude,
        Integer course,
        Double odometreKm,
        Double distanceTotale
) { }

