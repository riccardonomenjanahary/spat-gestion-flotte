package com.vehicule.Spat.vehicule.spat_backend.dto;

import java.time.LocalDateTime;

public class CreateUrgenceExpressRequest {

    /**
     * Personne / Direction / Service ayant demandé
     * la mission urgente par téléphone ou oralement.
     *
     * Exemple :
     * "Direction Générale"
     * "Chef du DGAL"
     * "Cabinet DG"
     */
    private String demandePar;

    /**
     * Objet très court de la mission.
     *
     * Exemple :
     * "Récupérer le pilote à l'aéroport"
     */
    private String motif;

    private String pointDepart;

    private String destination;

    /**
     * Facultatif.
     *
     * Si null, le backend considère que
     * le départ est immédiat.
     */
    private LocalDateTime dateDebut;

    /**
     * Obligatoire.
     *
     * Même en urgence, une heure de retour estimée
     * est nécessaire afin de calculer ensuite
     * la disponibilité du véhicule et du chauffeur.
     */
    private LocalDateTime dateFin;

    private Integer nombrePassagers;

    /**
     * Si non renseigné, le backend considérera
     * qu'un chauffeur est nécessaire.
     */
    private Boolean besoinChauffeur;

    /**
     * Facultatif.
     *
     * Exemple :
     * BERLINE
     * 4X4
     * UTILITAIRE
     * MINIBUS
     */
    private String typeVehiculeSouhaite;

    private String observations;


    public String getDemandePar() {
        return demandePar;
    }

    public void setDemandePar(String demandePar) {
        this.demandePar = demandePar;
    }


    public String getMotif() {
        return motif;
    }

    public void setMotif(String motif) {
        this.motif = motif;
    }


    public String getPointDepart() {
        return pointDepart;
    }

    public void setPointDepart(String pointDepart) {
        this.pointDepart = pointDepart;
    }


    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }


    public LocalDateTime getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(LocalDateTime dateDebut) {
        this.dateDebut = dateDebut;
    }


    public LocalDateTime getDateFin() {
        return dateFin;
    }

    public void setDateFin(LocalDateTime dateFin) {
        this.dateFin = dateFin;
    }


    public Integer getNombrePassagers() {
        return nombrePassagers;
    }

    public void setNombrePassagers(Integer nombrePassagers) {
        this.nombrePassagers = nombrePassagers;
    }


    public Boolean getBesoinChauffeur() {
        return besoinChauffeur;
    }

    public void setBesoinChauffeur(Boolean besoinChauffeur) {
        this.besoinChauffeur = besoinChauffeur;
    }


    public String getTypeVehiculeSouhaite() {
        return typeVehiculeSouhaite;
    }

    public void setTypeVehiculeSouhaite(String typeVehiculeSouhaite) {
        this.typeVehiculeSouhaite = typeVehiculeSouhaite;
    }


    public String getObservations() {
        return observations;
    }

    public void setObservations(String observations) {
        this.observations = observations;
    }
}