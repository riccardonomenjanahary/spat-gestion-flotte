package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "notifications",
        indexes = {
                @Index(name = "idx_notification_destinataire", columnList = "destinataire_matricule"),
                @Index(name = "idx_notification_non_lue", columnList = "destinataire_matricule, lu"),
                @Index(name = "idx_notification_date", columnList = "date_creation")
        }
)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String type;
    @Column(nullable = false, length = 20)
    private String niveau = "INFO";
    @Column(nullable = false, length = 180)
    private String titre;
    @Column(nullable = false, length = 2500)
    private String message;
    @Column(name = "destinataire_matricule", nullable = false, length = 100)
    private String destinataireMatricule;
    @Column(name = "destinataire_email", length = 255)
    private String destinataireEmail;
    @Column(name = "destinataire_role", length = 80)
    private String destinataireRole;
    @Column(length = 500)
    private String lien;
    @Column(name = "reservation_id")
    private Long reservationId;
    @Column(name = "maintenance_id")
    private Long maintenanceId;
    @Column(name = "vehicule_id")
    private Long vehiculeId;
    @Column(nullable = false)
    private Boolean lu = false;
    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation;
    @Column(name = "date_lecture")
    private LocalDateTime dateLecture;
    @Column(name = "email_envoye", nullable = false)
    private Boolean emailEnvoye = false;
    @Column(name = "date_email")
    private LocalDateTime dateEmail;
    @Column(name = "statut_email", nullable = false, length = 30)
    private String statutEmail = "NON_ENVOYE";
    @Column(name = "erreur_email", length = 2000)
    private String erreurEmail;

    // Colonnes nouvelles et facultatives pour une migration sans perte des anciennes notifications.
    @Column(name = "tentatives_email")
    private Integer tentativesEmail = 0;
    @Column(name = "prochaine_tentative_email")
    private LocalDateTime prochaineTentativeEmail;
    @Column(name = "date_dernier_essai_email")
    private LocalDateTime dateDernierEssaiEmail;

    @PrePersist
    public void prePersist() {
        if (dateCreation == null) dateCreation = LocalDateTime.now();
        if (lu == null) lu = false;
        if (emailEnvoye == null) emailEnvoye = false;
        if (niveau == null || niveau.isBlank()) niveau = "INFO";
        if (statutEmail == null || statutEmail.isBlank()) statutEmail = "NON_ENVOYE";
        if (tentativesEmail == null) tentativesEmail = 0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getNiveau() { return niveau; }
    public void setNiveau(String niveau) { this.niveau = niveau; }
    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getDestinataireMatricule() { return destinataireMatricule; }
    public void setDestinataireMatricule(String destinataireMatricule) { this.destinataireMatricule = destinataireMatricule; }
    public String getDestinataireEmail() { return destinataireEmail; }
    public void setDestinataireEmail(String destinataireEmail) { this.destinataireEmail = destinataireEmail; }
    public String getDestinataireRole() { return destinataireRole; }
    public void setDestinataireRole(String destinataireRole) { this.destinataireRole = destinataireRole; }
    public String getLien() { return lien; }
    public void setLien(String lien) { this.lien = lien; }
    public Long getReservationId() { return reservationId; }
    public void setReservationId(Long reservationId) { this.reservationId = reservationId; }
    public Long getMaintenanceId() { return maintenanceId; }
    public void setMaintenanceId(Long maintenanceId) { this.maintenanceId = maintenanceId; }
    public Long getVehiculeId() { return vehiculeId; }
    public void setVehiculeId(Long vehiculeId) { this.vehiculeId = vehiculeId; }
    public Boolean getLu() { return lu; }
    public void setLu(Boolean lu) { this.lu = lu; }
    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }
    public LocalDateTime getDateLecture() { return dateLecture; }
    public void setDateLecture(LocalDateTime dateLecture) { this.dateLecture = dateLecture; }
    public Boolean getEmailEnvoye() { return emailEnvoye; }
    public void setEmailEnvoye(Boolean emailEnvoye) { this.emailEnvoye = emailEnvoye; }
    public LocalDateTime getDateEmail() { return dateEmail; }
    public void setDateEmail(LocalDateTime dateEmail) { this.dateEmail = dateEmail; }
    public String getStatutEmail() { return statutEmail; }
    public void setStatutEmail(String statutEmail) { this.statutEmail = statutEmail; }
    public String getErreurEmail() { return erreurEmail; }
    public void setErreurEmail(String erreurEmail) { this.erreurEmail = erreurEmail; }
    public Integer getTentativesEmail() { return tentativesEmail; }
    public void setTentativesEmail(Integer tentativesEmail) { this.tentativesEmail = tentativesEmail; }
    public LocalDateTime getProchaineTentativeEmail() { return prochaineTentativeEmail; }
    public void setProchaineTentativeEmail(LocalDateTime prochaineTentativeEmail) { this.prochaineTentativeEmail = prochaineTentativeEmail; }
    public LocalDateTime getDateDernierEssaiEmail() { return dateDernierEssaiEmail; }
    public void setDateDernierEssaiEmail(LocalDateTime dateDernierEssaiEmail) { this.dateDernierEssaiEmail = dateDernierEssaiEmail; }
}
