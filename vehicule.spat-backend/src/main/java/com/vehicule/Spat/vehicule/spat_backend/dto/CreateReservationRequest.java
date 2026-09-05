package com.vehicule.Spat.vehicule.spat_backend.dto;

import java.time.LocalDateTime;

public class CreateReservationRequest {

    private Long vehiculeId; // optionnel désormais — affecté après validation

    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private String motif; // Objet de la mission
    private String motifUrgence;

    private String demandeurNom;
    private String demandeurPrenom;
    private String demandeurMatricule;
    private String demandeurEntite;
    private String demandeurTelephone;

    private String destination;
    private String pointDepart;
    private Integer nombrePassagers;
    private String listePassagers;
    private String typeVehiculeSouhaite;
    private Boolean besoinChauffeur;
    private String observations;

    public Long getVehiculeId() { return vehiculeId; }
    public void setVehiculeId(Long vehiculeId) { this.vehiculeId = vehiculeId; }

    public LocalDateTime getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDateTime dateDebut) { this.dateDebut = dateDebut; }

    public LocalDateTime getDateFin() { return dateFin; }
    public void setDateFin(LocalDateTime dateFin) { this.dateFin = dateFin; }

    public String getMotif() { return motif; }
    public void setMotif(String motif) { this.motif = motif; }

    public String getMotifUrgence() { return motifUrgence; }
    public void setMotifUrgence(String motifUrgence) { this.motifUrgence = motifUrgence; }

    public String getDemandeurNom() { return demandeurNom; }
    public void setDemandeurNom(String demandeurNom) { this.demandeurNom = demandeurNom; }

    public String getDemandeurPrenom() { return demandeurPrenom; }
    public void setDemandeurPrenom(String demandeurPrenom) { this.demandeurPrenom = demandeurPrenom; }

    public String getDemandeurMatricule() { return demandeurMatricule; }
    public void setDemandeurMatricule(String demandeurMatricule) { this.demandeurMatricule = demandeurMatricule; }

    public String getDemandeurEntite() { return demandeurEntite; }
    public void setDemandeurEntite(String demandeurEntite) { this.demandeurEntite = demandeurEntite; }

    public String getDemandeurTelephone() { return demandeurTelephone; }
    public void setDemandeurTelephone(String demandeurTelephone) { this.demandeurTelephone = demandeurTelephone; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getPointDepart() { return pointDepart; }
    public void setPointDepart(String pointDepart) { this.pointDepart = pointDepart; }

    public Integer getNombrePassagers() { return nombrePassagers; }
    public void setNombrePassagers(Integer nombrePassagers) { this.nombrePassagers = nombrePassagers; }

    public String getListePassagers() { return listePassagers; }
    public void setListePassagers(String listePassagers) { this.listePassagers = listePassagers; }

    public String getTypeVehiculeSouhaite() { return typeVehiculeSouhaite; }
    public void setTypeVehiculeSouhaite(String typeVehiculeSouhaite) { this.typeVehiculeSouhaite = typeVehiculeSouhaite; }

    public Boolean getBesoinChauffeur() { return besoinChauffeur; }
    public void setBesoinChauffeur(Boolean besoinChauffeur) { this.besoinChauffeur = besoinChauffeur; }

    public String getObservations() { return observations; }
    public void setObservations(String observations) { this.observations = observations; }
}