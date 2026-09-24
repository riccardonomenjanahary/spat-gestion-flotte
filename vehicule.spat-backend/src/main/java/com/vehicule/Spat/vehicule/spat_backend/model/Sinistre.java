package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.UUID;

// =========================================================
// ENTITE SINISTRE
// =========================================================

@Entity
@Table(name = "sinistres")
public class Sinistre {

    @Id
    @GeneratedValue
    private UUID id;

    // =====================================================
    // VEHICULE
    // =====================================================

    @ManyToOne(optional = false)
    @JoinColumn(
            name = "vehicule_id",
            nullable = false
    )
    private Vehicule vehicule;

    // =====================================================
    // DOSSIER SINISTRE
    // =====================================================

    @Column(
            name = "numero_dossier",
            unique = true,
            length = 80
    )
    private String numeroDossier;

    @Column(
            name = "date_sinistre",
            nullable = false
    )
    private LocalDate dateSinistre;

    @Column(
            name = "conducteur",
            nullable = false,
            length = 200
    )
    private String conducteur;

    @Column(
            name = "lieu",
            length = 300
    )
    private String lieu;

    @Column(
            name = "circonstance",
            length = 4000
    )
    private String circonstance;

    @Column(
            name = "description",
            length = 4000
    )
    private String description;

    /*
     * Référence textuelle conservée pour compatibilité
     * avec les anciens dossiers déjà présents en base.
     */
    @Column(
            name = "constat_reference",
            length = 1000
    )
    private String constatReference;

    /*
     * Référence / nom de fichier / chemin du constat amiable
     * utilisé par le frontend enrichi.
     */
    @Column(
            name = "constat_amiable",
            length = 1000
    )
    private String constatAmiable;

    @Column(
            name = "observation",
            length = 3000
    )
    private String observation;

    @Column(
            name = "statut",
            nullable = false,
            length = 50
    )
    private String statut;

    // =====================================================
    // TRACABILITE
    // =====================================================

    @Column(
            name = "date_creation",
            nullable = false,
            updatable = false
    )
    private LocalDate dateCreation;

    @Column(name = "date_cloture")
    private LocalDate dateCloture;

    @PrePersist
    protected void avantCreation() {

        if (dateCreation == null) {
            dateCreation = LocalDate.now();
        }

        if (statut == null || statut.isBlank()) {
            statut = "OUVERT";
        }

        if (numeroDossier == null || numeroDossier.isBlank()) {
            numeroDossier =
                    "SIN-"
                            + UUID.randomUUID()
                            .toString()
                            .substring(0, 8)
                            .toUpperCase();
        }
    }

    // =====================================================
    // GETTERS / SETTERS
    // =====================================================

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

    public String getNumeroDossier() {
        return numeroDossier;
    }

    public void setNumeroDossier(String numeroDossier) {
        this.numeroDossier = numeroDossier;
    }

    public LocalDate getDateSinistre() {
        return dateSinistre;
    }

    public void setDateSinistre(LocalDate dateSinistre) {
        this.dateSinistre = dateSinistre;
    }

    public String getConducteur() {
        return conducteur;
    }

    public void setConducteur(String conducteur) {
        this.conducteur = conducteur;
    }

    public String getLieu() {
        return lieu;
    }

    public void setLieu(String lieu) {
        this.lieu = lieu;
    }

    public String getCirconstance() {
        return circonstance;
    }

    public void setCirconstance(String circonstance) {
        this.circonstance = circonstance;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getConstatReference() {
        return constatReference;
    }

    public void setConstatReference(String constatReference) {
        this.constatReference = constatReference;
    }

    public String getConstatAmiable() {
        return constatAmiable;
    }

    public void setConstatAmiable(String constatAmiable) {
        this.constatAmiable = constatAmiable;
    }

    public String getObservation() {
        return observation;
    }

    public void setObservation(String observation) {
        this.observation = observation;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public LocalDate getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDate dateCreation) {
        this.dateCreation = dateCreation;
    }

    public LocalDate getDateCloture() {
        return dateCloture;
    }

    public void setDateCloture(LocalDate dateCloture) {
        this.dateCloture = dateCloture;
    }
}
