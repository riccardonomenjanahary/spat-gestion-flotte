package com.vehicule.Spat.vehicule.spat_backend.dto;

public class LoginRequest {
    private String numMatricule;
    private String motDePasse;

    // Getters et Setters
    public String getNumMatricule() {
        return numMatricule;
    }

    public void setNumMatricule(String numMatricule) {
        this.numMatricule = numMatricule;
    }

    public String getMotDePasse() {
        return motDePasse;
    }

    public void setMotDePasse(String motDePasse) {
        this.motDePasse = motDePasse;
    }
}