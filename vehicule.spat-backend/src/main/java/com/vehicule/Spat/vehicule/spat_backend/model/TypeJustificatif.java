package com.vehicule.Spat.vehicule.spat_backend.model;

// =========================================================
// TYPES DE JUSTIFICATIFS DU DISPOSITIF DGAL
// =========================================================

public enum TypeJustificatif {

    // Ordre de mission signé, obligatoire pour
    // tout déplacement avec un véhicule de mission.
    ORDRE_MISSION,

    // Reçu de carburant / de recharge électrique.
    RECU_CARBURANT,

    // Documents administratifs du véhicule.
    CARTE_GRISE,
    VISITE_TECHNIQUE,
    ASSURANCE,

    // Tout autre justificatif.
    AUTRE
}
