package com.vehicule.Spat.vehicule.spat_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "utilisateurs")
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nom_complet", nullable = false)
    private String nomComplet;

    @Column(nullable = false, unique = true)
    private String matricule;

    @Column(unique = true)
    private String email;

    @Column(nullable = false)
    private String role;

    @JsonIgnore
    @Column(name = "mot_de_passe", nullable = false)
    private String motDePasse;

    @Column(name = "service_id")
    private Long serviceId;

    @Column(name = "departement_id")
    private Long departementId;

    @Column(name = "direction_id")
    private Long directionId;

    @Column(nullable = false)
    private boolean actif = true;

    @Column(name = "doit_changer_mot_de_passe", nullable = false)
    private boolean doitChangerMotDePasse = false;

    @JsonIgnore
    @Column(name = "mot_de_passe_temporaire_hash", length = 100)
    private String motDePasseTemporaireHash;

    @JsonIgnore
    @Column(name = "mot_de_passe_temporaire_expire_le")
    private LocalDateTime motDePasseTemporaireExpireLe;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNomComplet() {
        return nomComplet;
    }

    public void setNomComplet(String nomComplet) {
        this.nomComplet = nomComplet;
    }

    public String getMatricule() {
        return matricule;
    }

    public void setMatricule(String matricule) {
        this.matricule = matricule;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getMotDePasse() {
        return motDePasse;
    }

    public void setMotDePasse(String motDePasse) {
        this.motDePasse = motDePasse;
    }

    public Long getServiceId() {
        return serviceId;
    }

    public void setServiceId(Long serviceId) {
        this.serviceId = serviceId;
    }

    public Long getDepartementId() {
        return departementId;
    }

    public void setDepartementId(Long departementId) {
        this.departementId = departementId;
    }

    public Long getDirectionId() {
        return directionId;
    }

    public void setDirectionId(Long directionId) {
        this.directionId = directionId;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }

    public boolean isDoitChangerMotDePasse() {
        return doitChangerMotDePasse;
    }

    public void setDoitChangerMotDePasse(boolean doitChangerMotDePasse) {
        this.doitChangerMotDePasse = doitChangerMotDePasse;
    }

    public String getMotDePasseTemporaireHash() {
        return motDePasseTemporaireHash;
    }

    public void setMotDePasseTemporaireHash(String motDePasseTemporaireHash) {
        this.motDePasseTemporaireHash = motDePasseTemporaireHash;
    }

    public LocalDateTime getMotDePasseTemporaireExpireLe() {
        return motDePasseTemporaireExpireLe;
    }

    public void setMotDePasseTemporaireExpireLe(LocalDateTime motDePasseTemporaireExpireLe) {
        this.motDePasseTemporaireExpireLe = motDePasseTemporaireExpireLe;
    }
}
