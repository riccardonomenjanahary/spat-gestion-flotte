package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "suivi_entretien_periodique",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_suivi_entretien_periodique_vehicule",
                        columnNames = "vehicule_id"
                )
        }
)
public class SuiviEntretienPeriodique {

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
            name = "vehicule_id",
            nullable = false,
            unique = true
    )
    private Vehicule vehicule;

    @Column(
            name = "kilometrage_dernier_entretien"
    )
    private Double kilometrageDernierEntretien;

    @Column(
            name = "prochaine_echeance_km"
    )
    private Double prochaineEcheanceKm;

    @Column(
            name = "dernier_kilometrage_connu"
    )
    private Double dernierKilometrageConnu;

    @Column(
            name = "entretien_periodique_ouvert",
            nullable = false
    )
    private Boolean entretienPeriodiqueOuvert = false;

    @Column(
            name = "kilometrage_declenchement"
    )
    private Double kilometrageDeclenchement;

    @Column(
            name = "date_declenchement"
    )
    private LocalDateTime dateDeclenchement;

    @Column(
            name = "date_mise_a_jour",
            nullable = false
    )
    private LocalDateTime dateMiseAJour;

    @PrePersist
    public void avantCreation() {
        dateMiseAJour =
                LocalDateTime.now();

        if (entretienPeriodiqueOuvert == null) {
            entretienPeriodiqueOuvert = false;
        }
    }

    @PreUpdate
    public void avantModification() {
        dateMiseAJour =
                LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Vehicule getVehicule() {
        return vehicule;
    }

    public void setVehicule(
            Vehicule vehicule
    ) {
        this.vehicule = vehicule;
    }

    public Double getKilometrageDernierEntretien() {
        return kilometrageDernierEntretien;
    }

    public void setKilometrageDernierEntretien(
            Double kilometrageDernierEntretien
    ) {
        this.kilometrageDernierEntretien =
                kilometrageDernierEntretien;
    }

    public Double getProchaineEcheanceKm() {
        return prochaineEcheanceKm;
    }

    public void setProchaineEcheanceKm(
            Double prochaineEcheanceKm
    ) {
        this.prochaineEcheanceKm =
                prochaineEcheanceKm;
    }

    public Double getDernierKilometrageConnu() {
        return dernierKilometrageConnu;
    }

    public void setDernierKilometrageConnu(
            Double dernierKilometrageConnu
    ) {
        this.dernierKilometrageConnu =
                dernierKilometrageConnu;
    }

    public Boolean getEntretienPeriodiqueOuvert() {
        return entretienPeriodiqueOuvert;
    }

    public void setEntretienPeriodiqueOuvert(
            Boolean entretienPeriodiqueOuvert
    ) {
        this.entretienPeriodiqueOuvert =
                entretienPeriodiqueOuvert;
    }

    public Double getKilometrageDeclenchement() {
        return kilometrageDeclenchement;
    }

    public void setKilometrageDeclenchement(
            Double kilometrageDeclenchement
    ) {
        this.kilometrageDeclenchement =
                kilometrageDeclenchement;
    }

    public LocalDateTime getDateDeclenchement() {
        return dateDeclenchement;
    }

    public void setDateDeclenchement(
            LocalDateTime dateDeclenchement
    ) {
        this.dateDeclenchement =
                dateDeclenchement;
    }

    public LocalDateTime getDateMiseAJour() {
        return dateMiseAJour;
    }
}
