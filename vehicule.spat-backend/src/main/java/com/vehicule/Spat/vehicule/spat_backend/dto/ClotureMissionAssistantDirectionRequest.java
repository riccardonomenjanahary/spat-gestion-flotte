package com.vehicule.Spat.vehicule.spat_backend.dto;

import java.time.LocalTime;
import java.time.LocalDateTime;

public class ClotureMissionAssistantDirectionRequest {

    private LocalTime heureRetour;
    private LocalDateTime dateHeureRetour;
    private String incident;

    public LocalTime getHeureRetour() {
        return heureRetour;
    }

    public void setHeureRetour(LocalTime heureRetour) {
        this.heureRetour = heureRetour;
    }

    public LocalDateTime getDateHeureRetour() {
        return dateHeureRetour;
    }

    public void setDateHeureRetour(LocalDateTime dateHeureRetour) {
        this.dateHeureRetour = dateHeureRetour;
    }

    public String getIncident() {
        return incident;
    }

    public void setIncident(String incident) {
        this.incident = incident;
    }
}
