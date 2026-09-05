package com.vehicule.Spat.vehicule.spat_backend.dto;

public class DecisionReservationRequest {

    /**
     * Valeurs autorisées :
     *
     * VALIDEE_N1
     * REFUSEE
     */
    private String statut;

    /**
     * Obligatoire pour VALIDEE_N1.
     */
    private Long vehiculeId;

    /**
     * Obligatoire pour VALIDEE_N1
     * uniquement lorsque la demande nécessite
     * un chauffeur.
     */
    private Long chauffeurId;

    /**
     * Obligatoire pour REFUSEE.
     */
    private String motifRefus;

    public DecisionReservationRequest() {
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public Long getVehiculeId() {
        return vehiculeId;
    }

    public void setVehiculeId(Long vehiculeId) {
        this.vehiculeId = vehiculeId;
    }

    public Long getChauffeurId() {
        return chauffeurId;
    }

    public void setChauffeurId(Long chauffeurId) {
        this.chauffeurId = chauffeurId;
    }

    public String getMotifRefus() {
        return motifRefus;
    }

    public void setMotifRefus(String motifRefus) {
        this.motifRefus = motifRefus;
    }
}