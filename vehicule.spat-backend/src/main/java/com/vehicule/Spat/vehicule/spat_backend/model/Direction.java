package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

/**
 * Direction de la SPAT.
 *
 * Le référentiel est initialisé par la migration
 * V6 avec les identifiants historiques 1 à 10
 * (utilisés par le calendrier partagé des
 * assistantes de Direction), puis complété par
 * les directions du dispositif DGAL.
 */
@Entity
@Table(name = "directions")
public class Direction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Code court unique, par exemple DG, SG, DIREX.
     */
    @Column(nullable = false, unique = true, length = 30)
    private String code;

    /**
     * Libellé complet de la Direction.
     */
    @Column(nullable = false, length = 150)
    private String nom;

    @Column(nullable = false)
    private boolean actif = true;

    public Direction() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }
}
