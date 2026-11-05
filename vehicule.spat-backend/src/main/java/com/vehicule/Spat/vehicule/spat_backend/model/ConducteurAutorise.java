package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Conducteur autorisé pour les motos électriques.
 *
 * Collaborateur figurant sur la liste des conducteurs
 * autorisés, validée par le Directeur, pour les motos.
 */
@Entity
@Table(
        name = "conducteurs_autorises",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_conducteur_autorise",
                        columnNames = {"matricule", "direction_id"}
                )
        }
)
public class ConducteurAutorise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String matricule;

    @Column(name = "nom_complet", nullable = false, length = 200)
    private String nomComplet;

    @Column(length = 255)
    private String poste;
    @Column(length = 260)
    private String permisNomFichier;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(length = 100)
    private String permisNomStocke;
    @Column(length = 150)
    private String permisContentType;

    public String getPoste() { return poste; }
    public void setPoste(String poste) { this.poste = poste; }
    public String getPermisNomFichier() { return permisNomFichier; }
    public void setPermisNomFichier(String nom) { permisNomFichier = nom; }
    public String getPermisNomStocke() { return permisNomStocke; }
    public void setPermisNomStocke(String nom) { permisNomStocke = nom; }
    public String getPermisContentType() { return permisContentType; }
    public void setPermisContentType(String type) { permisContentType = type; }

    @Column(length = 20)
    private String telephone;

    // =====================================================
    // DIRECTION
    // =====================================================

    @ManyToOne(optional = false)
    @JoinColumn(name = "direction_id", nullable = false)
    private Direction direction;

    // =====================================================
    // PERMIS
    // =====================================================

    @Column(name = "numero_permis", length = 50)
    private String numeroPermis;

    @Column(name = "date_expiration_permis")
    private LocalDate dateExpirationPermis;

    @Column(name = "categorie_permis", length = 30)
    private String categoriePermis;

    // =====================================================
    // VALIDATION PAR LE DIRECTEUR
    // =====================================================

    @Column(nullable = false)
    private Boolean valide = false;

    @Column(name = "valide_par", length = 200)
    private String validePar;

    @Column(name = "date_validation")
    private LocalDateTime dateValidation;

    // =====================================================
    // STATUT
    // =====================================================

    @Column(nullable = false)
    private Boolean actif = true;

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

    public String getMatricule() { return matricule; }
    public void setMatricule(String matricule) { this.matricule = matricule; }

    public String getNomComplet() { return nomComplet; }
    public void setNomComplet(String nomComplet) { this.nomComplet = nomComplet; }

    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }

    public Direction getDirection() { return direction; }
    public void setDirection(Direction direction) { this.direction = direction; }

    public String getNumeroPermis() { return numeroPermis; }
    public void setNumeroPermis(String numeroPermis) { this.numeroPermis = numeroPermis; }

    public LocalDate getDateExpirationPermis() { return dateExpirationPermis; }
    public void setDateExpirationPermis(LocalDate dateExpirationPermis) { this.dateExpirationPermis = dateExpirationPermis; }

    public String getCategoriePermis() { return categoriePermis; }
    public void setCategoriePermis(String categoriePermis) { this.categoriePermis = categoriePermis; }

    public Boolean getValide() { return valide; }
    public void setValide(Boolean valide) { this.valide = valide; }

    public String getValidePar() { return validePar; }
    public void setValidePar(String validePar) { this.validePar = validePar; }

    public LocalDateTime getDateValidation() { return dateValidation; }
    public void setDateValidation(LocalDateTime dateValidation) { this.dateValidation = dateValidation; }

    public Boolean getActif() { return actif; }
    public void setActif(Boolean actif) { this.actif = actif; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }
}
