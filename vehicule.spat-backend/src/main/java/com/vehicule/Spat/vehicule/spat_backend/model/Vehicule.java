package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "vehicules")
public class Vehicule {

    // =========================================================
    // IDENTIFIANT TECHNIQUE
    // =========================================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    // =========================================================
    // INFORMATIONS DE L'INVENTAIRE SPAT
    // =========================================================

    @Column(nullable = false, length = 100)
    private String categorie;

    @Column(nullable = false, unique = true, length = 150)
    private String immatriculation;

    @Column(name = "modele_type", nullable = false, length = 200)
    private String modeleType;

    @Column(name = "type_vehicule", length = 50)
    private String typeVehicule;

    private Integer annee;

    @Column(length = 255)
    private String affectation;

    @Column(
            name = "etat_general_observations",
            length = 1000
    )
    private String etatGeneralObservations;


    // =========================================================
    // STATUT OPERATIONNEL
    // =========================================================

    @Column(nullable = false, length = 50)
    private String statut = "DISPONIBLE";


    // =========================================================
    // CONFIGURATION GPS
    // =========================================================

    /**
     * Indique si le véhicule dispose d'un traceur GPS
     * configuré dans le portail SPAT.
     *
     * Les véhicules non équipés restent à false.
     */
    @Column(name = "gps_equipe")
    private Boolean gpsEquipe = false;


    /**
     * Identifiant interne du traceur sur gps-gps.online.
     *
     * Exemple :
     * 1218 TCA -> 3761
     *
     * Cet identifiant est fixe et permet au backend
     * d'associer les données GPS au bon véhicule SPAT.
     */
    @Column(name = "gps_device_id", unique = true)
    private Long gpsDeviceId;


    // =========================================================
    // CONSTRUCTEUR
    // =========================================================

    public Vehicule() {
    }


    // =========================================================
    // GETTERS / SETTERS
    // =========================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }


    public String getCategorie() {
        return categorie;
    }

    public void setCategorie(String categorie) {
        this.categorie = categorie;
    }


    public String getImmatriculation() {
        return immatriculation;
    }

    public void setImmatriculation(String immatriculation) {
        this.immatriculation = immatriculation;
    }


    public String getModeleType() {
        return modeleType;
    }

    public void setModeleType(String modeleType) {
        this.modeleType = modeleType;
    }


    public String getTypeVehicule() {
        return typeVehicule;
    }

    public void setTypeVehicule(String typeVehicule) {
        this.typeVehicule = typeVehicule;
    }


    public Integer getAnnee() {
        return annee;
    }

    public void setAnnee(Integer annee) {
        this.annee = annee;
    }


    public String getAffectation() {
        return affectation;
    }

    public void setAffectation(String affectation) {
        this.affectation = affectation;
    }


    public String getEtatGeneralObservations() {
        return etatGeneralObservations;
    }

    public void setEtatGeneralObservations(
            String etatGeneralObservations
    ) {
        this.etatGeneralObservations =
                etatGeneralObservations;
    }


    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }


    // =========================================================
    // GPS
    // =========================================================

    public Boolean getGpsEquipe() {
        return gpsEquipe;
    }

    public void setGpsEquipe(Boolean gpsEquipe) {
        this.gpsEquipe = gpsEquipe;
    }


    public Long getGpsDeviceId() {
        return gpsDeviceId;
    }

    public void setGpsDeviceId(Long gpsDeviceId) {
        this.gpsDeviceId = gpsDeviceId;
    }
}