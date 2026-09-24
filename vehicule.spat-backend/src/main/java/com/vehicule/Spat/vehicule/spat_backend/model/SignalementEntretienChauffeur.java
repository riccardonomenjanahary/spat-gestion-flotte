package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "signalement_entretien_chauffeur",
        indexes = {
                @Index(
                        name = "idx_signalement_entretien_chauffeur",
                        columnList = "chauffeur_id"
                ),
                @Index(
                        name = "idx_signalement_entretien_vehicule",
                        columnList = "vehicule_id"
                ),
                @Index(
                        name = "idx_signalement_entretien_reservation",
                        columnList = "reservation_id"
                )
        }
)
public class SignalementEntretienChauffeur {

    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    private Long id;

    @OneToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "maintenance_id",
            nullable = false,
            unique = true
    )
    private Maintenance maintenance;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "reservation_id",
            nullable = false
    )
    private Reservation reservation;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "vehicule_id",
            nullable = false
    )
    private Vehicule vehicule;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "chauffeur_id",
            nullable = false
    )
    private Chauffeur chauffeur;

    @Column(
            name = "type_probleme",
            nullable = false,
            length = 80
    )
    private String typeProbleme;

    @Column(
            name = "description_signalement",
            nullable = false,
            length = 2000
    )
    private String descriptionSignalement;

    @Column(
            name = "niveau_urgence",
            nullable = false,
            length = 30
    )
    private String niveauUrgence = "NORMAL";

    @Column(
            name = "kilometrage_signale"
    )
    private Double kilometrageSignale;

    @Column(
            name = "date_signalement",
            nullable = false
    )
    private LocalDateTime dateSignalement;

    @PrePersist
    public void avantCreation() {

        if (dateSignalement == null) {
            dateSignalement =
                    LocalDateTime.now();
        }

        if (niveauUrgence == null
                || niveauUrgence.isBlank()) {
            niveauUrgence = "NORMAL";
        }
    }

    public Long getId() {
        return id;
    }

    public Maintenance getMaintenance() {
        return maintenance;
    }

    public void setMaintenance(
            Maintenance maintenance
    ) {
        this.maintenance = maintenance;
    }

    public Reservation getReservation() {
        return reservation;
    }

    public void setReservation(
            Reservation reservation
    ) {
        this.reservation = reservation;
    }

    public Vehicule getVehicule() {
        return vehicule;
    }

    public void setVehicule(
            Vehicule vehicule
    ) {
        this.vehicule = vehicule;
    }

    public Chauffeur getChauffeur() {
        return chauffeur;
    }

    public void setChauffeur(
            Chauffeur chauffeur
    ) {
        this.chauffeur = chauffeur;
    }

    public String getTypeProbleme() {
        return typeProbleme;
    }

    public void setTypeProbleme(
            String typeProbleme
    ) {
        this.typeProbleme = typeProbleme;
    }

    public String getDescriptionSignalement() {
        return descriptionSignalement;
    }

    public void setDescriptionSignalement(
            String descriptionSignalement
    ) {
        this.descriptionSignalement =
                descriptionSignalement;
    }

    public String getNiveauUrgence() {
        return niveauUrgence;
    }

    public void setNiveauUrgence(
            String niveauUrgence
    ) {
        this.niveauUrgence =
                niveauUrgence;
    }

    public Double getKilometrageSignale() {
        return kilometrageSignale;
    }

    public void setKilometrageSignale(
            Double kilometrageSignale
    ) {
        this.kilometrageSignale =
                kilometrageSignale;
    }

    public LocalDateTime getDateSignalement() {
        return dateSignalement;
    }

    public void setDateSignalement(
            LocalDateTime dateSignalement
    ) {
        this.dateSignalement =
                dateSignalement;
    }
}

