package com.vehicule.Spat.vehicule.spat_backend.model;

public enum StatutMaintenance {
    EN_ATTENTE_AVIS_DID,
    AVIS_FAVORABLE_DID,
    AVIS_DEFAVORABLE_DID,
    EN_ATTENTE_VALIDATION_N1,
    VALIDATION_N1_LOGISTIQUE,
    VALIDATION_N2_DGAL,
    VALIDEE,
    REFUSEE,
    PLANIFIEE,
    EN_COURS,
    CLOTUREE,
    // Circuit des demandes d'entretien : distinct du contrôle technique préalable.
    EN_ATTENTE_VALIDATION_ENTRETIEN,
    ENTRETIEN_AUTORISE,
    ENTRETIEN_TERMINE
}
