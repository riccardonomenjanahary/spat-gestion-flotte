package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "sinistres")
public class Sinistre {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "vehicule_id", nullable = false)
    private Vehicule vehicule;

    private LocalDate dateSinistre;

    private String conducteur;

    @Column(length = 2000)
    private String circonstance;

    private String constatReference; // référence du constat joint (pièce à venir)

    private LocalDate dateCreation = LocalDate.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Vehicule getVehicule() { return vehicule; }
    public void setVehicule(Vehicule vehicule) { this.vehicule = vehicule; }

    public LocalDate getDateSinistre() { return dateSinistre; }
    public void setDateSinistre(LocalDate dateSinistre) { this.dateSinistre = dateSinistre; }

    public String getConducteur() { return conducteur; }
    public void setConducteur(String conducteur) { this.conducteur = conducteur; }

    public String getCirconstance() { return circonstance; }
    public void setCirconstance(String circonstance) { this.circonstance = circonstance; }

    public String getConstatReference() { return constatReference; }
    public void setConstatReference(String constatReference) { this.constatReference = constatReference; }

    public LocalDate getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDate dateCreation) { this.dateCreation = dateCreation; }
}
