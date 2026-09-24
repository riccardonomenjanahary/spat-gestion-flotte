package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions_carburant")
public class TransactionCarburant {

    @Id
    @GeneratedValue
    private UUID id;

    // =========================================================
    // VEHICULE
    // =========================================================

    @ManyToOne
    @JoinColumn(name = "vehicule_id", nullable = false)
    private Vehicule vehicule;

    // =========================================================
    // OPERATION
    // =========================================================

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeOperationCarburant type;

    @Column(nullable = false)
    private Double quantiteLitres;

    @Column(nullable = false)
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

    // Référence / numéro du justificatif
    private String justificatif;

    private String observation;

    // =========================================================
    // AGENT
    // =========================================================

    // Email / identité de l'utilisateur ayant saisi la transaction
    private String agentEmail;

    // =========================================================
    // ESPACE CHAUFFEUR
    // =========================================================
    //
    // Ces deux relations sont facultatives afin de ne pas casser
    // les transactions carburant déjà saisies par l'Agent Flotte.
    //
    // Elles sont renseignées uniquement lorsqu'une consommation
    // est déclarée depuis l'espace Chauffeur.
    // =========================================================

    @ManyToOne
    @JoinColumn(name = "chauffeur_id")
    private Chauffeur chauffeur;

    @ManyToOne
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    // =========================================================
    // DATE DE CREATION
    // =========================================================

    @Column(nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    // =========================================================
    // GETTERS / SETTERS
    // =========================================================

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Vehicule getVehicule() {
        return vehicule;
    }

    public void setVehicule(Vehicule vehicule) {
        this.vehicule = vehicule;
    }

    public TypeOperationCarburant getType() {
        return type;
    }

    public void setType(TypeOperationCarburant type) {
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

    public Chauffeur getChauffeur() {
        return chauffeur;
    }

    public void setChauffeur(Chauffeur chauffeur) {
        this.chauffeur = chauffeur;
    }

    public Reservation getReservation() {
        return reservation;
    }

    public void setReservation(Reservation reservation) {
        this.reservation = reservation;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }
}
