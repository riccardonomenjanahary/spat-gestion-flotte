package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "maintenance")
public class Maintenance {
    @Id @GeneratedValue
    private UUID id;
    @ManyToOne @JoinColumn(name = "vehicule_id", nullable = false)
    private Vehicule vehicule;
    @ManyToOne @JoinColumn(name = "reservation_id")
    private Reservation reservation;
    @Column(columnDefinition = "TEXT") private String natureIntervention;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private StatutMaintenance statut = StatutMaintenance.EN_ATTENTE_AVIS_DID;
    @Column(columnDefinition = "TEXT") private String diagnosticVisuel;
    @Column(columnDefinition = "TEXT") private String observationsMecanicien;
    @Column(columnDefinition = "TEXT") private String piecesNecessaires;
    private String decisionDID;
    private String mecanicienEmail;
    private LocalDateTime dateAvisDID;
    private String avisTexte;
    private String avisAuteurEmail;
    private LocalDateTime avisDate;
    private String priorite;
    private String prestataire;
    private LocalDateTime dateIntervention;
    private LocalDateTime dateCreation = LocalDateTime.now();
    private LocalDateTime dateCloture;

    // Circuit distinct : demande d'entretien chauffeur / mécanicien.
    // NULL sur les anciens contrôles DID et les dossiers périodiques existants.
    @Column(name = "origine_demande_entretien", length = 30)
    private String origineDemande;
    @Column(name = "demandeur_entretien", length = 180)
    private String demandeurEntretien;
    @Column(name = "date_decision_entretien")
    private LocalDateTime dateDecisionEntretien;
    @Column(name = "motif_refus_entretien", columnDefinition = "TEXT")
    private String motifRefusEntretien;
    @Column(name = "compte_rendu_entretien", columnDefinition = "TEXT")
    private String compteRenduEntretien;
    @Column(name = "mecanicien_entretien", length = 180)
    private String mecanicienEntretien;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Vehicule getVehicule() { return vehicule; }
    public void setVehicule(Vehicule vehicule) { this.vehicule = vehicule; }
    public Reservation getReservation() { return reservation; }
    public void setReservation(Reservation reservation) { this.reservation = reservation; }
    public String getNatureIntervention() { return natureIntervention; }
    public void setNatureIntervention(String natureIntervention) { this.natureIntervention = natureIntervention; }
    public StatutMaintenance getStatut() { return statut; }
    public void setStatut(StatutMaintenance statut) { this.statut = statut; }
    public String getDiagnosticVisuel() { return diagnosticVisuel; }
    public void setDiagnosticVisuel(String diagnosticVisuel) { this.diagnosticVisuel = diagnosticVisuel; }
    public String getObservationsMecanicien() { return observationsMecanicien; }
    public void setObservationsMecanicien(String observationsMecanicien) { this.observationsMecanicien = observationsMecanicien; }
    public String getPiecesNecessaires() { return piecesNecessaires; }
    public void setPiecesNecessaires(String piecesNecessaires) { this.piecesNecessaires = piecesNecessaires; }
    public String getDecisionDID() { return decisionDID; }
    public void setDecisionDID(String decisionDID) { this.decisionDID = decisionDID; }
    public String getMecanicienEmail() { return mecanicienEmail; }
    public void setMecanicienEmail(String mecanicienEmail) { this.mecanicienEmail = mecanicienEmail; }
    public LocalDateTime getDateAvisDID() { return dateAvisDID; }
    public void setDateAvisDID(LocalDateTime dateAvisDID) { this.dateAvisDID = dateAvisDID; }
    public String getAvisTexte() { return avisTexte; }
    public void setAvisTexte(String avisTexte) { this.avisTexte = avisTexte; }
    public String getAvisAuteurEmail() { return avisAuteurEmail; }
    public void setAvisAuteurEmail(String avisAuteurEmail) { this.avisAuteurEmail = avisAuteurEmail; }
    public LocalDateTime getAvisDate() { return avisDate; }
    public void setAvisDate(LocalDateTime avisDate) { this.avisDate = avisDate; }
    public String getPriorite() { return priorite; }
    public void setPriorite(String priorite) { this.priorite = priorite; }
    public String getPrestataire() { return prestataire; }
    public void setPrestataire(String prestataire) { this.prestataire = prestataire; }
    public LocalDateTime getDateIntervention() { return dateIntervention; }
    public void setDateIntervention(LocalDateTime dateIntervention) { this.dateIntervention = dateIntervention; }
    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }
    public LocalDateTime getDateCloture() { return dateCloture; }
    public void setDateCloture(LocalDateTime dateCloture) { this.dateCloture = dateCloture; }
    public String getOrigineDemande() { return origineDemande; }
    public void setOrigineDemande(String origineDemande) { this.origineDemande = origineDemande; }
    public String getDemandeurEntretien() { return demandeurEntretien; }
    public void setDemandeurEntretien(String demandeurEntretien) { this.demandeurEntretien = demandeurEntretien; }
    public LocalDateTime getDateDecisionEntretien() { return dateDecisionEntretien; }
    public void setDateDecisionEntretien(LocalDateTime dateDecisionEntretien) { this.dateDecisionEntretien = dateDecisionEntretien; }
    public String getMotifRefusEntretien() { return motifRefusEntretien; }
    public void setMotifRefusEntretien(String motifRefusEntretien) { this.motifRefusEntretien = motifRefusEntretien; }
    public String getCompteRenduEntretien() { return compteRenduEntretien; }
    public void setCompteRenduEntretien(String compteRenduEntretien) { this.compteRenduEntretien = compteRenduEntretien; }
    public String getMecanicienEntretien() { return mecanicienEntretien; }
    public void setMecanicienEntretien(String mecanicienEntretien) { this.mecanicienEntretien = mecanicienEntretien; }
}
