package com.vehicule.Spat.vehicule.spat_backend.dto;

import java.util.List;

public record GpsHistoriqueResponse(
        Long vehiculeId,
        String date,
        List<GpsReleveHistoriqueResponse> positions,
        Double distanceJourKm
) { }

