package com.vehicule.Spat.vehicule.spat_backend.dto;

import java.time.LocalTime;

public class CreateMissionAssistantDirectionRequest {
    private Long conducteurMotoId;
    public Long getConducteurMotoId() { return conducteurMotoId; }
    public void setConducteurMotoId(Long id) { conducteurMotoId = id; }

    private String typeVehicule;
    private String prenom;
    private String nom;
    private String matricule;
    private String entite;
    private String motif;
    private LocalTime heureDepart;
    private boolean departImmediat;
    private Integer dureeEstimeeMinutes;
    private String motifUrgence;
    private String observations;
    private Boolean demandeUrgente = false;
    private java.time.LocalDateTime dateDebut;
    private String destination;
    public java.time.LocalDateTime getDateDebut() { return dateDebut; }
    public void setDateDebut(java.time.LocalDateTime date) { dateDebut = date; }
    public String getDestination() { return destination; }
    public void setDestination(String texte) { destination = texte; }
    public String getMotifUrgence() { return motifUrgence; }
    public void setMotifUrgence(String motif) { motifUrgence = motif; }
    public String getObservations() { return observations; }
    public void setObservations(String texte) { observations = texte; }
    public Boolean getDemandeUrgente() { return demandeUrgente; }
    public void setDemandeUrgente(Boolean urgente) { demandeUrgente = urgente; }

    public String getTypeVehicule() {
        return typeVehicule;
    }

    public void setTypeVehicule(String typeVehicule) {
        this.typeVehicule = typeVehicule;
    }

    public String getPrenom() {
        return prenom;
    }

    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getMatricule() {
        return matricule;
    }

    public void setMatricule(String matricule) {
        this.matricule = matricule;
    }

    public String getEntite() {
        return entite;
    }

    public void setEntite(String entite) {
        this.entite = entite;
    }

    public String getMotif() {
        return motif;
    }

    public void setMotif(String motif) {
        this.motif = motif;
    }

    public boolean isDepartImmediat() {
        return departImmediat;
    }

    public void setDepartImmediat(boolean departImmediat) {
        this.departImmediat = departImmediat;
    }

    public LocalTime getHeureDepart() {
        return heureDepart;
    }

    public void setHeureDepart(LocalTime heureDepart) {
        this.heureDepart = heureDepart;
    }

    public Integer getDureeEstimeeMinutes() {
        return dureeEstimeeMinutes;
    }

    public void setDureeEstimeeMinutes(Integer dureeEstimeeMinutes) {
        this.dureeEstimeeMinutes = dureeEstimeeMinutes;
    }
}
