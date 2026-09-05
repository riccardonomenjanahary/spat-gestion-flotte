package com.vehicule.Spat.vehicule.spat_backend.dto;

public class ConsommationVehiculeResponse {

    private Long vehiculeId;
    private String immatriculation;
    private Double totalLitres;

    public ConsommationVehiculeResponse(Long vehiculeId, String immatriculation, Double totalLitres) {
        this.vehiculeId = vehiculeId;
        this.immatriculation = immatriculation;
        this.totalLitres = totalLitres;
    }

    public Long getVehiculeId() {
        return vehiculeId;
    }

    public void setVehiculeId(Long vehiculeId) {
        this.vehiculeId = vehiculeId;
    }

    public String getImmatriculation() {
        return immatriculation;
    }

    public void setImmatriculation(String immatriculation) {
        this.immatriculation = immatriculation;
    }

    public Double getTotalLitres() {
        return totalLitres;
    }

    public void setTotalLitres(Double totalLitres) {
        this.totalLitres = totalLitres;
    }
}