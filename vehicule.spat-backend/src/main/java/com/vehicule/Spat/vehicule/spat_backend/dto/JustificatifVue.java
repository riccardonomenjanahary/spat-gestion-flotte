package com.vehicule.Spat.vehicule.spat_backend.dto;

import com.vehicule.Spat.vehicule.spat_backend.model.Justificatif;

import java.time.LocalDateTime;
import java.util.UUID;

// =========================================================
// VUE D'UN JUSTIFICATIF (réponse API légère)
// =========================================================
//
// Sérialisation volontairement plate : on n'expose ni le
// fichier brut ni les entités complètes liées.

public class JustificatifVue {

    private Long id;
    private String type;
    private String libelle;
    private String nomFichier;
    private Long tailleOctets;
    private String contentType;

    private Long vehiculeId;
    private String vehiculeImmatriculation;

    private Long reservationId;
    private String reservationMotif;

    private UUID transactionCarburantId;

    private Long deposeParId;
    private String deposeParNom;
    private String deposeParEmail;
    private LocalDateTime dateDepot;

    private Boolean valide;
    private Long valideParId;
    private String valideParNom;
    private LocalDateTime dateValidation;
    private String commentaireValidation;

    public static JustificatifVue depuis(Justificatif j) {
        JustificatifVue vue = new JustificatifVue();

        vue.id = j.getId();
        vue.type = j.getType() == null ? null : j.getType().name();
        vue.libelle = j.getLibelle();
        vue.nomFichier = j.getNomFichier();
        vue.tailleOctets = j.getTailleOctets();
        vue.contentType = j.getContentType();

        if (j.getVehicule() != null) {
            vue.vehiculeId = j.getVehicule().getId();
            vue.vehiculeImmatriculation = j.getVehicule().getImmatriculation();
        }

        if (j.getReservation() != null) {
            vue.reservationId = j.getReservation().getId();
            vue.reservationMotif = j.getReservation().getMotif();
        }

        if (j.getTransactionCarburant() != null) {
            vue.transactionCarburantId = j.getTransactionCarburant().getId();
        }

        if (j.getDeposePar() != null) {
            vue.deposeParId = j.getDeposePar().getId();
            vue.deposeParNom = j.getDeposePar().getNomComplet();
            vue.deposeParEmail = j.getDeposePar().getEmail();
        }

        vue.dateDepot = j.getDateDepot();

        vue.valide = j.getValide();

        if (j.getValidePar() != null) {
            vue.valideParId = j.getValidePar().getId();
            vue.valideParNom = j.getValidePar().getNomComplet();
        }

        vue.dateValidation = j.getDateValidation();
        vue.commentaireValidation = j.getCommentaireValidation();

        return vue;
    }

    // =====================================================
    // GETTERS (sérialisation Jackson)
    // =====================================================

    public Long getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public String getLibelle() {
        return libelle;
    }

    public String getNomFichier() {
        return nomFichier;
    }

    public Long getTailleOctets() {
        return tailleOctets;
    }

    public String getContentType() {
        return contentType;
    }

    public Long getVehiculeId() {
        return vehiculeId;
    }

    public String getVehiculeImmatriculation() {
        return vehiculeImmatriculation;
    }

    public Long getReservationId() {
        return reservationId;
    }

    public String getReservationMotif() {
        return reservationMotif;
    }

    public UUID getTransactionCarburantId() {
        return transactionCarburantId;
    }

    public Long getDeposeParId() {
        return deposeParId;
    }

    public String getDeposeParNom() {
        return deposeParNom;
    }

    public String getDeposeParEmail() {
        return deposeParEmail;
    }

    public LocalDateTime getDateDepot() {
        return dateDepot;
    }

    public Boolean getValide() {
        return valide;
    }

    public Long getValideParId() {
        return valideParId;
    }

    public String getValideParNom() {
        return valideParNom;
    }

    public LocalDateTime getDateValidation() {
        return dateValidation;
    }

    public String getCommentaireValidation() {
        return commentaireValidation;
    }
}
