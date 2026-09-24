package com.vehicule.Spat.vehicule.spat_backend.dto;

public class CreateSignalementEntretienChauffeurRequest {

    private Long reservationId;
    private Long vehiculeId;

    private String typeProbleme;
    private String descriptionSignalement;
    private String niveauUrgence;

    private Double kilometrageSignale;

    public Long getReservationId() {
        return reservationId;
    }

    public void setReservationId(Long reservationId) {
        this.reservationId = reservationId;
    }

    public Long getVehiculeId() {
        return vehiculeId;
    }

    public void setVehiculeId(Long vehiculeId) {
        this.vehiculeId = vehiculeId;
    }

    public String getTypeProbleme() {
        return typeProbleme;
    }

    public void setTypeProbleme(String typeProbleme) {
        this.typeProbleme = typeProbleme;
    }

    public String getDescriptionSignalement() {
        return descriptionSignalement;
    }

    public void setDescriptionSignalement(String descriptionSignalement) {
        this.descriptionSignalement = descriptionSignalement;
    }

    public String getNiveauUrgence() {
        return niveauUrgence;
    }

    public void setNiveauUrgence(String niveauUrgence) {
        this.niveauUrgence = niveauUrgence;
    }

    public Double getKilometrageSignale() {
        return kilometrageSignale;
    }

    public void setKilometrageSignale(Double kilometrageSignale) {
        this.kilometrageSignale = kilometrageSignale;
    }
}
