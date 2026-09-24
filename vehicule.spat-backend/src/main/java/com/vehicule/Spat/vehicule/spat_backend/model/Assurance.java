package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

// =========================================================
// ENTITE ASSURANCE
// =========================================================

@Entity
@Table(name = "assurances")
public class Assurance {

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
    // INFORMATIONS DE LA POLICE
    // =====================================================

    @Column(
            name = "numero_police",
            nullable = false,
            length = 150
    )
    private String numeroPolice;

    @Column(name = "date_debut")
    private LocalDate dateDebut;

    @Column(
            name = "date_expiration",
            nullable = false
    )
    private LocalDate dateExpiration;

    @Column(
            name = "assureur",
            length = 200
    )
    private String assureur;

    @Column(
            name = "type_couverture",
            length = 200
    )
    private String typeCouverture;

    @Column(
            name = "montant_prime",
            precision = 19,
            scale = 2
    )
    private BigDecimal montantPrime;

    @Column(
            name = "observation",
            length = 2000
    )
    private String observation;

    /*
     * Référence, nom de fichier ou chemin du document.
     * Le véritable upload physique pourra être branché
     * ultérieurement sans casser ce modèle.
     */
    @Column(
            name = "document_police",
            length = 1000
    )
    private String documentPolice;

    // =====================================================
    // TRACABILITE SIMPLE
    // =====================================================

    @Column(
            name = "date_creation",
            nullable = false,
            updatable = false
    )
    private LocalDate dateCreation;

    @Column(name = "date_modification")
    private LocalDate dateModification;

    @PrePersist
    protected void avantCreation() {
        LocalDate maintenant = LocalDate.now();

        if (dateCreation == null) {
            dateCreation = maintenant;
        }

        dateModification = maintenant;
    }

    @PreUpdate
    protected void avantModification() {
        dateModification = LocalDate.now();
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

    public String getNumeroPolice() {
        return numeroPolice;
    }

    public void setNumeroPolice(String numeroPolice) {
        this.numeroPolice = numeroPolice;
    }

    public LocalDate getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(LocalDate dateDebut) {
        this.dateDebut = dateDebut;
    }

    public LocalDate getDateExpiration() {
        return dateExpiration;
    }

    public void setDateExpiration(LocalDate dateExpiration) {
        this.dateExpiration = dateExpiration;
    }

    public String getAssureur() {
        return assureur;
    }

    public void setAssureur(String assureur) {
        this.assureur = assureur;
    }

    public String getTypeCouverture() {
        return typeCouverture;
    }

    public void setTypeCouverture(String typeCouverture) {
        this.typeCouverture = typeCouverture;
    }

    public BigDecimal getMontantPrime() {
        return montantPrime;
    }

    public void setMontantPrime(BigDecimal montantPrime) {
        this.montantPrime = montantPrime;
    }

    public String getObservation() {
        return observation;
    }

    public void setObservation(String observation) {
        this.observation = observation;
    }

    public String getDocumentPolice() {
        return documentPolice;
    }

    public void setDocumentPolice(String documentPolice) {
        this.documentPolice = documentPolice;
    }

    public LocalDate getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDate dateCreation) {
        this.dateCreation = dateCreation;
    }

    public LocalDate getDateModification() {
        return dateModification;
    }

    public void setDateModification(LocalDate dateModification) {
        this.dateModification = dateModification;
    }
}
