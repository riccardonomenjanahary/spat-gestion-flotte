package com.vehicule.Spat.vehicule.spat_backend.dto;

import java.time.LocalDate;

public class CreateCarburantRequest {

    private Long vehiculeId;

    // "DOTATION" ou "CONSOMMATION"
    private String type;

    private Double quantiteLitres;

    private LocalDate dateOperation;

    private String justificatif;

    public Long getVehiculeId() {
        return vehiculeId;
    }

    public void setVehiculeId(Long vehiculeId) {
        this.vehiculeId = vehiculeId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Double getQuantiteLitres() {
        return quantiteLitres;
    }

    public void setQuantiteLitres(Double quantiteLitres) {
        this.quantiteLitres = quantiteLitres;
    }

    public LocalDate getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(LocalDate dateOperation) {
        this.dateOperation = dateOperation;
    }

    public String getJustificatif() {
        return justificatif;
    }

    public void setJustificatif(String justificatif) {
        this.justificatif = justificatif;
    }
}