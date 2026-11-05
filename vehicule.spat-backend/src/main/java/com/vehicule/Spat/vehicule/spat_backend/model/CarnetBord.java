package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Carnet de bord numérique.
 *
 * Chaque utilisation effective d'un véhicule est
 * enregistrée sur le portail : date, conducteur,
 * horaires de sortie et de retour, destination,
 * motif, kilométrage (ou niveau de charge pour
 * les motos électriques).
 */
@Entity
@Table(
        name = "carnets_bord",
        indexes = {
                @Index(name = "idx_carnet_vehicule", columnList = "vehicule_id"),
                @Index(name = "idx_carnet_reservation", columnList = "reservation_id"),
                @Index(name = "idx_carnet_date", columnList = "date_sortie")
        }
)
public class CarnetBord {

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
    // RESERVATION ASSOCIEE
    // =====================================================

    @ManyToOne
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    // =====================================================
    // CONDUCTEUR
    // =====================================================

    @Column(name = "conducteur_nom", nullable = false, length = 200)
    private String conducteurNom;

    @Column(name = "conducteur_matricule", length = 50)
    private String conducteurMatricule;

    // =====================================================
    // HORAIRES
    // =====================================================

    @Column(name = "date_sortie", nullable = false)
    private LocalDateTime dateSortie;

    @Column(name = "date_retour")
    private LocalDateTime dateRetour;

    // =====================================================
    // MISSION
    // =====================================================

    @Column(nullable = false, length = 500)
    private String destination;

    @Column(nullable = false, length = 1000)
    private String motif;

    // =====================================================
    // KILOMETRAGE / CHARGE
    // =====================================================

    @Column(name = "kilometrage_depart")
    private Long kilometrageDepart;

    @Column(name = "kilometrage_retour")
    private Long kilometrageRetour;

    /**
     * Niveau de charge en pourcentage pour les motos
     * électriques (0 à 100).
     */
    @Column(name = "niveau_charge_depart")
    private Integer niveauChargeDepart;

    @Column(name = "niveau_charge_retour")
    private Integer niveauChargeRetour;

    // =====================================================
    // STATUT
    // =====================================================

    /**
     * EN_COURS : véhicule sorti, pas encore revenu.
     * CLOTURE : retour enregistré.
     */
    @Column(nullable = false, length = 20)
    private String statut = "EN_COURS";

    // =====================================================
    // TRACABILITE
    // =====================================================

    @ManyToOne
    @JoinColumn(name = "saisi_par_id")
    private Utilisateur saisiPar;

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation;

    @PrePersist
    protected void avantCreation() {
        if (dateCreation == null) {
            dateCreation = LocalDateTime.now();
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

    public String getConducteurNom() { return conducteurNom; }
    public void setConducteurNom(String conducteurNom) { this.conducteurNom = conducteurNom; }

    public String getConducteurMatricule() { return conducteurMatricule; }
    public void setConducteurMatricule(String conducteurMatricule) { this.conducteurMatricule = conducteurMatricule; }

    public LocalDateTime getDateSortie() { return dateSortie; }
    public void setDateSortie(LocalDateTime dateSortie) { this.dateSortie = dateSortie; }

    public LocalDateTime getDateRetour() { return dateRetour; }
    public void setDateRetour(LocalDateTime dateRetour) { this.dateRetour = dateRetour; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getMotif() { return motif; }
    public void setMotif(String motif) { this.motif = motif; }

    public Long getKilometrageDepart() { return kilometrageDepart; }
    public void setKilometrageDepart(Long kilometrageDepart) { this.kilometrageDepart = kilometrageDepart; }

    public Long getKilometrageRetour() { return kilometrageRetour; }
    public void setKilometrageRetour(Long kilometrageRetour) { this.kilometrageRetour = kilometrageRetour; }

    public Integer getNiveauChargeDepart() { return niveauChargeDepart; }
    public void setNiveauChargeDepart(Integer niveauChargeDepart) { this.niveauChargeDepart = niveauChargeDepart; }

    public Integer getNiveauChargeRetour() { return niveauChargeRetour; }
    public void setNiveauChargeRetour(Integer niveauChargeRetour) { this.niveauChargeRetour = niveauChargeRetour; }

    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }

    public Utilisateur getSaisiPar() { return saisiPar; }
    public void setSaisiPar(Utilisateur saisiPar) { this.saisiPar = saisiPar; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }
}
