package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Corrections et suppressions du répertoire LISTING INFO, indexées par matricule. */
@Entity
@Table(name = "personnel_modifications")
public class PersonnelModification {
    @Id
    @Column(length = 50)
    public String matricule;
    public String nom;
    public String prenom;
    public String direction;
    public String poste;
    public String categorie;
    public String email;
    @Column(nullable = false)
    public boolean supprime;
}
