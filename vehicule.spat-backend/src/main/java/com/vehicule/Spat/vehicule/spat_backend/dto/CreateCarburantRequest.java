package com.vehicule.Spat.vehicule.spat_backend.dto;

import java.time.LocalDate;

public class CreateCarburantRequest {

    // =========================================================
    // VEHICULE
    // =========================================================

    private Long vehiculeId;

    // =========================================================
    // OPERATION
    // =========================================================

    // "DOTATION" ou "CONSOMMATION"
    private String type;

    private Double quantiteLitres;

    private LocalDate dateOperation;

    // =========================================================
    // INFORMATIONS FINANCIERES
    // =========================================================

    private Double prixUnitaire;

    private Double montantTotal;

    // =========================================================
    // KILOMETRAGE
    // =========================================================

    private Long kilometrage;

    // =========================================================
    // INFORMATIONS COMPLEMENTAIRES
    // =========================================================

    private String station;

    private String mission;

    private String justificatif;

    private String observation;

    // =========================================================
    // AGENT
    // =========================================================

    private String agentEmail;

    // =========================================================
    // GETTERS / SETTERS
    // =========================================================

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

    public Double getPrixUnitaire() {
        return prixUnitaire;
    }

    public void setPrixUnitaire(Double prixUnitaire) {
        this.prixUnitaire = prixUnitaire;
    }

    public Double getMontantTotal() {
        return montantTotal;
    }

    public void setMontantTotal(Double montantTotal) {
        this.montantTotal = montantTotal;
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

    public String getMission() {
        return mission;
    }

    public void setMission(String mission) {
        this.mission = mission;
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

    public String getAgentEmail() {
        return agentEmail;
    }

    public void setAgentEmail(String agentEmail) {
        this.agentEmail = agentEmail;
    }
}