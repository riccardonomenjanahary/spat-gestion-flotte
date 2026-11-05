package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Réquisition de véhicule par le DGAL.
 *
 * Le DGAL peut réquisitionner tout véhicule du
 * dispositif, avec notification aux assistantes et
 * demandeurs concernés et traçabilité du motif.
 */
@Entity
@Table(
        name = "requisitions",
        indexes = {
                @Index(name = "idx_requisition_vehicule", columnList = "vehicule_id"),
                @Index(name = "idx_requisition_date", columnList = "date_requisition")
        }
)
public class Requisition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =====================================================
    // VEHICULE REQUISITIONNE
    // =====================================================

    @ManyToOne(optional = false)
    @JoinColumn(name = "vehicule_id", nullable = false)
    private Vehicule vehicule;

    // =====================================================
    // RESERVATION IMPACTEE (si une réservation existante
    // est déplacée / annulée suite à la réquisition)
    // =====================================================

    @ManyToOne
    @JoinColumn(name = "reservation_impactee_id")
    private Reservation reservationImpactee;

    // =====================================================
    // MOTIF DE LA REQUISITION
    // =====================================================

    @Column(nullable = false, length = 2000)
    private String motif;

    // =====================================================
    // PERIODE
    // =====================================================

    @Column(name = "date_debut", nullable = false)
    private LocalDateTime dateDebut;

    @Column(name = "date_fin")
    private LocalDateTime dateFin;

    // =====================================================
    // BENEFICIAIRE
    // =====================================================

    @Column(name = "beneficiaire", length = 300)
    private String beneficiaire;

    @Column(length = 500)
    private String destination;

    // =====================================================
    // STATUT
    // =====================================================

    /**
     * ACTIVE : réquisition en cours.
     * TERMINEE : véhicule libéré.
     * ANNULEE : réquisition annulée.
     */
    @Column(nullable = false, length = 20)
    private String statut = "ACTIVE";

    // =====================================================
    // TRACABILITE
    // =====================================================

    @ManyToOne(optional = false)
    @JoinColumn(name = "requisitionne_par_id", nullable = false)
    private Utilisateur requisitionnePar;

    @Column(name = "date_requisition", nullable = false)
    private LocalDateTime dateRequisition;

    @Column(name = "notifications_envoyees")
    private Boolean notificationsEnvoyees = false;

    @PrePersist
    protected void avantCreation() {
        if (dateRequisition == null) {
            dateRequisition = LocalDateTime.now();
        }
    }

    // =====================================================
    // GETTERS / SETTERS
    // =====================================================

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Vehicule getVehicule() { return vehicule; }
    public void setVehicule(Vehicule vehicule) { this.vehicule = vehicule; }

    public Reservation getReservationImpactee() { return reservationImpactee; }
    public void setReservationImpactee(Reservation reservationImpactee) { this.reservationImpactee = reservationImpactee; }

    public String getMotif() { return motif; }
    public void setMotif(String motif) { this.motif = motif; }

    public LocalDateTime getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDateTime dateDebut) { this.dateDebut = dateDebut; }

    public LocalDateTime getDateFin() { return dateFin; }
    public void setDateFin(LocalDateTime dateFin) { this.dateFin = dateFin; }

    public String getBeneficiaire() { return beneficiaire; }
    public void setBeneficiaire(String beneficiaire) { this.beneficiaire = beneficiaire; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }

    public Utilisateur getRequisitionnePar() { return requisitionnePar; }
    public void setRequisitionnePar(Utilisateur requisitionnePar) { this.requisitionnePar = requisitionnePar; }

    public LocalDateTime getDateRequisition() { return dateRequisition; }
    public void setDateRequisition(LocalDateTime dateRequisition) { this.dateRequisition = dateRequisition; }

    public Boolean getNotificationsEnvoyees() { return notificationsEnvoyees; }
    public void setNotificationsEnvoyees(Boolean notificationsEnvoyees) { this.notificationsEnvoyees = notificationsEnvoyees; }
}
