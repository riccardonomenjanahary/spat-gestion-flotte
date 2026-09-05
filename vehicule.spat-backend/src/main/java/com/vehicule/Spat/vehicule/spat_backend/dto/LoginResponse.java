package com.vehicule.Spat.vehicule.spat_backend.dto;

public class LoginResponse {

    private String token;
    private String role;
    private String numMatricule;

    public LoginResponse(String token, String role, String numMatricule) {
        this.token = token;
        this.role = role;
        this.numMatricule = numMatricule;
    }

    public String getToken() { return token; }
    public String getRole() { return role; }
    public String getNumMatricule() { return numMatricule; }
}