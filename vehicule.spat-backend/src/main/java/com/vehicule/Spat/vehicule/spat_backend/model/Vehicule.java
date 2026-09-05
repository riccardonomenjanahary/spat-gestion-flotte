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

    /**
     * Catégorie du véhicule ou matériel roulant.
     *
     * Exemples actuels SPAT :
     * - Voiture de service
     * - Voiture de fonction
     * - Camion
     * - Engin
     * - Tracteur
     * - Autopompe
     * - Remorque
     * - Bus
     * - Ambulance
     *
     * String volontairement utilisé afin de permettre
     * l'ajout futur de nouvelles catégories sans modifier
     * obligatoirement le modèle Java.
     */
    @Column(nullable = false, length = 100)
    private String categorie;


    /**
     * Immatriculation ou identifiant du matériel.
     *
     * Exemples :
     * 1205TCA
     * 40560WWT
     * TRAX 966G
     * BOBCAT 272C
     * SIDES
     */
    @Column(nullable = false, unique = true, length = 150)
    private String immatriculation;


    /**
     * Correspond directement à la colonne
     * "Modèle / Type" du document SPAT.
     *
     * Exemples :
     * TOYOTA REVO
     * Toyota Sequoia
     * Fortuner VP
     * Benne à ordure
     * Pelle chargeuse
     * Renault Claas
     * Ambulance Port
     */
    @Column(name = "modele_type", nullable = false, length = 200)
    private String modeleType;


    /**
     * Type fonctionnel du véhicule utilisé lors
     * des demandes et affectations.
     *
     * Exemples :
     * - BERLINE
     * - 4X4
     * - UTILITAIRE
     * - MINIBUS
     * - AUTRE
     *
     * Ce champ permet de comparer le type souhaité
     * par le demandeur avec les véhicules réellement
     * disponibles.
     *
     * La valeur doit être renseignée avec les vraies
     * informations du véhicule.
     */
    @Column(name = "type_vehicule", length = 50)
    private String typeVehicule;


    /**
     * Année du véhicule.
     *
     * Integer et non int car certains matériels
     * n'ont pas d'année renseignée dans l'inventaire.
     */
    private Integer annee;


    /**
     * Affectation figurant dans l'inventaire.
     *
     * Exemples :
     * Garage
     * Garage / Missionnaire
     * DG SPAT
     * SG SPAT
     * DIREX
     * DID
     * DIR MARKETING
     * DRH
     * DDI
     * DFP
     * CEMEDI
     * Pompier
     */
    @Column(length = 255)
    private String affectation;


    /**
     * Correspond exactement à la colonne :
     *
     * "État général (observations)"
     *
     * Exemples :
     * Bon état
     * État moyen
     * État neuf
     * État mauvais
     * État moyen (Panne BV)
     * État neuf, pare-brise fissuré, stationné au garage
     * État moyen (En réparation)
     */
    @Column(
            name = "etat_general_observations",
            length = 1000
    )
    private String etatGeneralObservations;


    // =========================================================
    // STATUT OPERATIONNEL DANS LE PORTAIL
    // =========================================================

    /**
     * Ce champ ne vient pas directement du tableau
     * d'inventaire mais est nécessaire au portail.
     *
     * Il représente la disponibilité opérationnelle.
     *
     * Valeurs utilisées :
     *
     * DISPONIBLE
     * EN_MISSION
     * EN_MAINTENANCE
     * HORS_SERVICE
     * TRANSFERE
     * REFORME
     */
    @Column(nullable = false, length = 50)
    private String statut = "DISPONIBLE";


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
}