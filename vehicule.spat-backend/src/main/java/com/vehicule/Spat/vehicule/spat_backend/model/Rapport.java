package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "rapports")
public class Rapport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String periode;
    private String type;
    private String statut;
    private String date;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPeriode() { return periode; }
    public void setPeriode(String periode) { this.periode = periode; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
}
