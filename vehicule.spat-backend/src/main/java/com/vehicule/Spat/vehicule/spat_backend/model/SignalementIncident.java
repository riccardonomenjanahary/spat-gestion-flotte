package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Signalement immédiat d'incident sur un véhicule :
 * panne, dommage, contravention, accident.
 *
 * Le signalement alerte automatiquement le Service
 * Logistique du DGAL et l'assistante de Direction
 * concernée, et passe le véhicule en statut
 * INDISPONIBLE.
 */
@Entity
@Table(
        name = "signalements_incidents",
        indexes = {
                @Index(name = "idx_signalement_vehicule", columnList = "vehicule_id"),
                @Index(name = "idx_signalement_date", columnList = "date_signalement")
        }
)
public class SignalementIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =====================================================
    // VEHICULE
    // =====================================================

    @ManyToOne(optional = false)
    @JoinColumn(name = "vehicule_id", nullable = false)
    private Vehicule vehicule;

    // =====================================================
    // RESERVATION EN COURS (si applicable)
    // =====================================================

    @ManyToOne
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    // =====================================================
    // TYPE D'INCIDENT
    // =====================================================

    /**
     * PANNE, DOMMAGE, CONTRAVENTION, ACCIDENT
     */
    @Column(name = "type_incident", nullable = false, length = 30)
    private String typeIncident;

    // =====================================================
    // DETAILS
    // =====================================================

    @Column(nullable = false, length = 3000)
    private String description;

    @Column(length = 300)
    private String lieu;

    @Column(name = "date_incident")
    private LocalDateTime dateIncident;

    /**
     * Niveau de gravité : FAIBLE, MOYEN, GRAVE, CRITIQUE
     */
    @Column(length = 20)
    private String gravite = "MOYEN";

    // =====================================================
    // STATUT
    // =====================================================

    /**
     * SIGNALE : vient d'être signalé.
     * EN_TRAITEMENT : pris en charge par le Service Logistique.
     * RESOLU : problème résolu, véhicule réopérationnel.
     * CLOTURE : dossier clos.
     */
    @Column(nullable = false, length = 30)
    private String statut = "SIGNALE";

    @Column(name = "commentaire_resolution", length = 2000)
    private String commentaireResolution;

    @Column(name = "date_resolution")
    private LocalDateTime dateResolution;

    @Column(name = "date_validation")
    private LocalDateTime dateValidation;

    @Column(name = "valide_par", length = 100)
    private String validePar;

    @Column(name = "date_planification")
    private LocalDateTime datePlanification;

    @Column(name = "planifie_par", length = 100)
    private String planifiePar;

    @Column(name = "pris_en_charge_par", length = 100)
    private String prisEnChargePar;

    @Column(name = "cloture_par", length = 100)
    private String cloturePar;

    @Column(name = "statut_vehicule_avant_incident", length = 50)
    private String statutVehiculeAvantIncident;

    // =====================================================
    // TRACABILITE
    // =====================================================

    @ManyToOne(optional = false)
    @JoinColumn(name = "signale_par_id", nullable = false)
    private Utilisateur signalePar;

    @Column(name = "date_signalement", nullable = false)
    private LocalDateTime dateSignalement;

    @Column(name = "notification_envoyee")
    private Boolean notificationEnvoyee = false;

    @PrePersist
    protected void avantCreation() {
        if (dateSignalement == null) {
            dateSignalement = LocalDateTime.now();
        }
    }

    // =====================================================
    // GETTERS / SETTERS
    // =====================================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Vehicule getVehicule() { return vehicule; }
    public void setVehicule(Vehicule vehicule) { this.vehicule = vehicule; }

    public Reservation getReservation() { return reservation; }
    public void setReservation(Reservation reservation) { this.reservation = reservation; }

    public String getTypeIncident() { return typeIncident; }
    public void setTypeIncident(String typeIncident) { this.typeIncident = typeIncident; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getLieu() { return lieu; }
    public void setLieu(String lieu) { this.lieu = lieu; }

    public LocalDateTime getDateIncident() { return dateIncident; }
    public void setDateIncident(LocalDateTime dateIncident) { this.dateIncident = dateIncident; }

    public String getGravite() { return gravite; }
    public void setGravite(String gravite) { this.gravite = gravite; }

    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }

    public String getCommentaireResolution() { return commentaireResolution; }
    public void setCommentaireResolution(String commentaireResolution) { this.commentaireResolution = commentaireResolution; }

    public LocalDateTime getDateResolution() { return dateResolution; }
    public void setDateResolution(LocalDateTime dateResolution) { this.dateResolution = dateResolution; }
    public LocalDateTime getDateValidation() { return dateValidation; }
    public void setDateValidation(LocalDateTime dateValidation) { this.dateValidation = dateValidation; }
    public String getValidePar() { return validePar; }
    public void setValidePar(String validePar) { this.validePar = validePar; }
    public LocalDateTime getDatePlanification() { return datePlanification; }
    public void setDatePlanification(LocalDateTime datePlanification) { this.datePlanification = datePlanification; }
    public String getPlanifiePar() { return planifiePar; }
    public void setPlanifiePar(String planifiePar) { this.planifiePar = planifiePar; }
    public String getPrisEnChargePar() { return prisEnChargePar; }
    public void setPrisEnChargePar(String prisEnChargePar) { this.prisEnChargePar = prisEnChargePar; }
    public String getCloturePar() { return cloturePar; }
    public void setCloturePar(String cloturePar) { this.cloturePar = cloturePar; }
    public String getStatutVehiculeAvantIncident() { return statutVehiculeAvantIncident; }
    public void setStatutVehiculeAvantIncident(String statutVehiculeAvantIncident) { this.statutVehiculeAvantIncident = statutVehiculeAvantIncident; }

    public Utilisateur getSignalePar() { return signalePar; }
    public void setSignalePar(Utilisateur signalePar) { this.signalePar = signalePar; }

    public LocalDateTime getDateSignalement() { return dateSignalement; }
    public void setDateSignalement(LocalDateTime dateSignalement) { this.dateSignalement = dateSignalement; }

    public Boolean getNotificationEnvoyee() { return notificationEnvoyee; }
    public void setNotificationEnvoyee(Boolean notificationEnvoyee) { this.notificationEnvoyee = notificationEnvoyee; }
}
