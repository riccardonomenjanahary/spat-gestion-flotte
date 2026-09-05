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

    @ManyToOne
    @JoinColumn(name = "vehicule_id", nullable = false)
    private Vehicule vehicule;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeOperationCarburant type;

    @Column(nullable = false)
    private Double quantiteLitres;

    @Column(nullable = false)
    private LocalDate dateOperation;

    // Référence/numéro du justificatif (facture, ticket) — pas d'upload
    // de fichier réel pour l'instant, juste une référence textuelle.
    private String justificatif;

    // Email de l'agent qui a saisi la transaction (via le JWT)
    private String agentEmail;

    @Column(nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

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

    public String getJustificatif() {
        return justificatif;
    }

    public void setJustificatif(String justificatif) {
        this.justificatif = justificatif;
    }

    public String getAgentEmail() {
        return agentEmail;
    }

    public void setAgentEmail(String agentEmail) {
        this.agentEmail = agentEmail;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }
}