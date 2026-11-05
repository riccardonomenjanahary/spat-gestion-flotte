package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "journal_modifications")
public class JournalModification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "acteur_matricule", nullable = false, length = 100)
    private String acteurMatricule;

    @Column(name = "acteur_role", nullable = false, length = 60)
    private String acteurRole;

    @Column(nullable = false, length = 10)
    private String methode;

    @Column(nullable = false, length = 500)
    private String chemin;

    @Column(name = "statut_http", nullable = false)
    private Integer statutHttp;

    @Column(name = "date_action", nullable = false)
    private Instant dateAction;

    @PrePersist
    void initialiserDateAction() {
        if (dateAction == null) {
            dateAction = Instant.now();
        }
    }

    public Long getId() { return id; }
    public String getActeurMatricule() { return acteurMatricule; }
    public void setActeurMatricule(String acteurMatricule) { this.acteurMatricule = acteurMatricule; }
    public String getActeurRole() { return acteurRole; }
    public void setActeurRole(String acteurRole) { this.acteurRole = acteurRole; }
    public String getMethode() { return methode; }
    public void setMethode(String methode) { this.methode = methode; }
    public String getChemin() { return chemin; }
    public void setChemin(String chemin) { this.chemin = chemin; }
    public Integer getStatutHttp() { return statutHttp; }
    public void setStatutHttp(Integer statutHttp) { this.statutHttp = statutHttp; }
    public Instant getDateAction() { return dateAction; }
    public void setDateAction(Instant dateAction) { this.dateAction = dateAction; }
}
