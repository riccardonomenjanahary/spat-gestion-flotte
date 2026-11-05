package com.vehicule.Spat.vehicule.spat_backend.dto;

import java.time.Instant;

public record JournalModificationResponse(
        Long id,
        String acteurMatricule,
        String acteurRole,
        String methode,
        String chemin,
        Integer statutHttp,
        Instant dateAction
) {}
