package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "maintenance")
public class Maintenance {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "vehicule_id", nullable = false)
    private Vehicule vehicule;

    private String natureIntervention;

    @Enumerated(EnumType.STRING)
    private StatutMaintenance statut = StatutMaintenance.EN_ATTENTE_AVIS_DID;

    // --- Avis du mécanicien diagnostiqueur ---
    private String avisTexte;
    private String avisAuteurEmail;
    private LocalDateTime avisDate;
    private String priorite; // "URGENTE" ou "NORMALE"

    // --- Planification (Chef Service Logistique) ---
    private String prestataire;
    private LocalDateTime dateIntervention;

    private LocalDateTime dateCreation = LocalDateTime.now();
    private LocalDateTime dateCloture;

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

    public String getNatureIntervention() {
        return natureIntervention;
    }

    public void setNatureIntervention(String natureIntervention) {
        this.natureIntervention = natureIntervention;
    }

    public StatutMaintenance getStatut() {
        return statut;
    }

    public void setStatut(StatutMaintenance statut) {
        this.statut = statut;
    }

    public String getAvisTexte() {
        return avisTexte;
    }

    public void setAvisTexte(String avisTexte) {
        this.avisTexte = avisTexte;
    }

    public String getAvisAuteurEmail() {
        return avisAuteurEmail;
    }

    public void setAvisAuteurEmail(String avisAuteurEmail) {
        this.avisAuteurEmail = avisAuteurEmail;
    }

    public LocalDateTime getAvisDate() {
        return avisDate;
    }

    public void setAvisDate(LocalDateTime avisDate) {
        this.avisDate = avisDate;
    }

    public String getPriorite() {
        return priorite;
    }

    public void setPriorite(String priorite) {
        this.priorite = priorite;
    }

    public String getPrestataire() {
        return prestataire;
    }

    public void setPrestataire(String prestataire) {
        this.prestataire = prestataire;
    }

    public LocalDateTime getDateIntervention() {
        return dateIntervention;
    }

    public void setDateIntervention(LocalDateTime dateIntervention) {
        this.dateIntervention = dateIntervention;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }

    public LocalDateTime getDateCloture() {
        return dateCloture;
    }

    public void setDateCloture(LocalDateTime dateCloture) {
        this.dateCloture = dateCloture;
    }
}