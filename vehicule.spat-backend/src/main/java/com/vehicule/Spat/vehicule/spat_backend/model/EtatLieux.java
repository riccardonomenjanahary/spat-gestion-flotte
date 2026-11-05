package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * État des lieux simplifié avant et après utilisation
 * d'un véhicule.
 *
 * Rattaché au carnet de bord correspondant.
 * Deux enregistrements par utilisation : un AVANT
 * (au départ) et un APRES (au retour).
 */
@Entity
@Table(
        name = "etats_lieux",
        indexes = {
                @Index(name = "idx_etat_lieux_carnet", columnList = "carnet_bord_id"),
                @Index(name = "idx_etat_lieux_vehicule", columnList = "vehicule_id")
        }
)
public class EtatLieux {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =====================================================
    // RATTACHEMENT
    // =====================================================

    @ManyToOne(optional = false)
    @JoinColumn(name = "carnet_bord_id", nullable = false)
    private CarnetBord carnetBord;

    @ManyToOne(optional = false)
    @JoinColumn(name = "vehicule_id", nullable = false)
    private Vehicule vehicule;

    // =====================================================
    // MOMENT
    // =====================================================

    /**
     * AVANT : état des lieux au départ.
     * APRES : état des lieux au retour.
     */
    @Column(nullable = false, length = 10)
    private String moment;

    // =====================================================
    // CONSTAT
    // =====================================================

    /**
     * BON, CORRECT, MAUVAIS
     */
    @Column(name = "etat_apparent", nullable = false, length = 30)
    private String etatApparent;

    /**
     * Niveau de carburant ou de charge : PLEIN,
     * TROIS_QUARTS, DEMI, QUART, RESERVE
     */
    @Column(name = "niveau_carburant_charge", length = 30)
    private String niveauCarburantCharge;

    /**
     * Présence des équipements obligatoires.
     */
    @Column(name = "equipements_ok")
    private Boolean equipementsOk = true;

    @Column(name = "detail_equipements", length = 1000)
    private String detailEquipements;

    /**
     * Signalement d'anomalie constatée.
     */
    @Column(name = "anomalie_signalee")
    private Boolean anomalieSignalee = false;

    @Column(name = "description_anomalie", length = 2000)
    private String descriptionAnomalie;

    // =====================================================
    // TRACABILITE
    // =====================================================

    @ManyToOne
    @JoinColumn(name = "realise_par_id")
    private Utilisateur realisePar;

    @Column(name = "date_realisation", nullable = false)
    private LocalDateTime dateRealisation;

    @PrePersist
    protected void avantCreation() {
        if (dateRealisation == null) {
            dateRealisation = LocalDateTime.now();
        }
    }

    // =====================================================
    // GETTERS / SETTERS
    // =====================================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public CarnetBord getCarnetBord() { return carnetBord; }
    public void setCarnetBord(CarnetBord carnetBord) { this.carnetBord = carnetBord; }

    public Vehicule getVehicule() { return vehicule; }
    public void setVehicule(Vehicule vehicule) { this.vehicule = vehicule; }

    public String getMoment() { return moment; }
    public void setMoment(String moment) { this.moment = moment; }

    public String getEtatApparent() { return etatApparent; }
    public void setEtatApparent(String etatApparent) { this.etatApparent = etatApparent; }

    public String getNiveauCarburantCharge() { return niveauCarburantCharge; }
    public void setNiveauCarburantCharge(String niveauCarburantCharge) { this.niveauCarburantCharge = niveauCarburantCharge; }

    public Boolean getEquipementsOk() { return equipementsOk; }
    public void setEquipementsOk(Boolean equipementsOk) { this.equipementsOk = equipementsOk; }

    public String getDetailEquipements() { return detailEquipements; }
    public void setDetailEquipements(String detailEquipements) { this.detailEquipements = detailEquipements; }

    public Boolean getAnomalieSignalee() { return anomalieSignalee; }
    public void setAnomalieSignalee(Boolean anomalieSignalee) { this.anomalieSignalee = anomalieSignalee; }

    public String getDescriptionAnomalie() { return descriptionAnomalie; }
    public void setDescriptionAnomalie(String descriptionAnomalie) { this.descriptionAnomalie = descriptionAnomalie; }

    public Utilisateur getRealisePar() { return realisePar; }
    public void setRealisePar(Utilisateur realisePar) { this.realisePar = realisePar; }

    public LocalDateTime getDateRealisation() { return dateRealisation; }
    public void setDateRealisation(LocalDateTime dateRealisation) { this.dateRealisation = dateRealisation; }
}
