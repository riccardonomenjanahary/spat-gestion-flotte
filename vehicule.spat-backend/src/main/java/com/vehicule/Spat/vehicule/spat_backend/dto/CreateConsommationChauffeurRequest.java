package com.vehicule.Spat.vehicule.spat_backend.dto;

import java.time.LocalDate;

public class CreateConsommationChauffeurRequest {

    private Long reservationId;

    private Double quantiteLitres;

    private LocalDate dateOperation;

    private Double prixUnitaire;

    private Long kilometrage;

    private String station;

    private String justificatif;

    private String observation;

    public Long getReservationId() {
        return reservationId;
    }

    public void setReservationId(Long reservationId) {
        this.reservationId = reservationId;
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

    public Double getPrixUnitaire() {
        return prixUnitaire;
    }

    public void setPrixUnitaire(Double prixUnitaire) {
        this.prixUnitaire = prixUnitaire;
    }

    public Long getKilometrage() {
        return kilometrage;
    }

    public void setKilometrage(Long kilometrage) {
        this.kilometrage = kilometrage;
    }

    public String getStation() {
        return station;
    }

    public void setStation(String station) {
        this.station = station;
    }

    public String getJustificatif() {
        return justificatif;
    }

    public void setJustificatif(String justificatif) {
        this.justificatif = justificatif;
    }

    public String getObservation() {
        return observation;
    }

    public void setObservation(String observation) {
        this.observation = observation;
    }
}

