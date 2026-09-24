package com.vehicule.Spat.vehicule.spat_backend.dto;

public class DemandeAvisDIDRequest {

    private Long vehiculeId;

    private Long chauffeurId;

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
}
