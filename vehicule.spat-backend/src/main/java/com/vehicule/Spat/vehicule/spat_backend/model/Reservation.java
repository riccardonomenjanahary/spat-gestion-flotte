package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservations")
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =====================================================
    // VEHICULE AFFECTE
    // =====================================================

    @ManyToOne
    @JoinColumn(name = "vehicule_id")
    private Vehicule vehicule;

    // =====================================================
    // CHAUFFEUR AFFECTE
    // =====================================================

    /**
     * Null si aucun chauffeur n'est demandé
     * ou tant que le Service Logistique n'a pas validé N1.
     */
    @ManyToOne
    @JoinColumn(name = "chauffeur_id")
    private Chauffeur chauffeur;

    // =====================================================
    // UTILISATEUR AYANT CREE LA DEMANDE
    // =====================================================

    @ManyToOne
    @JoinColumn(name = "demandeur_id", nullable = false)
    private Utilisateur demandeur;

    // =====================================================
    // PERIODE DE LA MISSION
    // =====================================================

    @Column(nullable = false)
    private LocalDateTime dateDebut;

    @Column(nullable = false)
    private LocalDateTime dateFin;

    // =====================================================
    // MISSION
    // =====================================================

    @Column(nullable = false)
    private String motif;

    // =====================================================
    // URGENCE
    // =====================================================

    @Column(nullable = false)
    private boolean demandeUrgente = false;

    @Column(length = 1000)
    private String motifUrgence;

    // =====================================================
    // STATUT
    // =====================================================

    /**
     * Statuts utilisés :
     *
     * EN_ATTENTE  : en attente du Chef Service Logistique
     * VALIDEE_N1  : validation niveau 1 effectuée
     * VALIDEE     : validation niveau 2 Chef DGAL effectuée
     * REFUSEE     : refusée au niveau 1
     */
    @Column(nullable = false)
    private String statut;

    // =====================================================
    // CREATION
    // =====================================================

    @Column(nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    // =====================================================
    // BENEFICIAIRE
    // =====================================================

    private String demandeurNom;
    private String demandeurPrenom;
    private String demandeurMatricule;
    private String demandeurEntite;
    private String demandeurTelephone;

    // =====================================================
    // DETAILS LOGISTIQUES
    // =====================================================

    private String destination;
    private String pointDepart;
    private Integer nombrePassagers;

    @Column(length = 2000)
    private String listePassagers;

    private String typeVehiculeSouhaite;

    private Boolean besoinChauffeur;

    @Column(length = 1000)
    private String observations;

    // =====================================================
    // REFUS NIVEAU 1
    // =====================================================

    @Column(length = 1000)
    private String motifRefus;

    @ManyToOne
    @JoinColumn(name = "refuse_par_id")
    private Utilisateur refusePar;

    private LocalDateTime dateRefus;

    // =====================================================
    // VALIDATION NIVEAU 1
    // =====================================================

    @ManyToOne
    @JoinColumn(name = "validation_n1_par_id")
    private Utilisateur validationN1Par;

    private LocalDateTime dateValidationN1;

    // =====================================================
    // VALIDATION NIVEAU 2 - CHEF DGAL
    // =====================================================

    /**
     * Chef DGAL ayant effectué la validation niveau 2.
     */
    @ManyToOne
    @JoinColumn(name = "validation_n2_par_id")
    private Utilisateur validationN2Par;

    /**
     * Date et heure serveur de la validation niveau 2.
     */
    private LocalDateTime dateValidationN2;

    // =====================================================
    // CONSTRUCTEUR
    // =====================================================

    public Reservation() {
    }

    // =====================================================
    // GETTERS / SETTERS
    // =====================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Vehicule getVehicule() {
        return vehicule;
    }

    public void setVehicule(Vehicule vehicule) {
        this.vehicule = vehicule;
    }

    public Chauffeur getChauffeur() {
        return chauffeur;
    }

    public void setChauffeur(Chauffeur chauffeur) {
        this.chauffeur = chauffeur;
    }

    public Utilisateur getDemandeur() {
        return demandeur;
    }

    public void setDemandeur(Utilisateur demandeur) {
        this.demandeur = demandeur;
    }

    public LocalDateTime getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(LocalDateTime dateDebut) {
        this.dateDebut = dateDebut;
    }

    public LocalDateTime getDateFin() {
        return dateFin;
    }

    public void setDateFin(LocalDateTime dateFin) {
        this.dateFin = dateFin;
    }

    public String getMotif() {
        return motif;
    }

    public void setMotif(String motif) {
        this.motif = motif;
    }

    public boolean isDemandeUrgente() {
        return demandeUrgente;
    }

    public void setDemandeUrgente(boolean demandeUrgente) {
        this.demandeUrgente = demandeUrgente;
    }

    public String getMotifUrgence() {
        return motifUrgence;
    }

    public void setMotifUrgence(String motifUrgence) {
        this.motifUrgence = motifUrgence;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }

    public String getDemandeurNom() {
        return demandeurNom;
    }

    public void setDemandeurNom(String demandeurNom) {
        this.demandeurNom = demandeurNom;
    }

    public String getDemandeurPrenom() {
        return demandeurPrenom;
    }

    public void setDemandeurPrenom(String demandeurPrenom) {
        this.demandeurPrenom = demandeurPrenom;
    }

    public String getDemandeurMatricule() {
        return demandeurMatricule;
    }

    public void setDemandeurMatricule(String demandeurMatricule) {
        this.demandeurMatricule = demandeurMatricule;
    }

    public String getDemandeurEntite() {
        return demandeurEntite;
    }

    public void setDemandeurEntite(String demandeurEntite) {
        this.demandeurEntite = demandeurEntite;
    }

    public String getDemandeurTelephone() {
        return demandeurTelephone;
    }

    public void setDemandeurTelephone(String demandeurTelephone) {
        this.demandeurTelephone = demandeurTelephone;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public String getPointDepart() {
        return pointDepart;
    }

    public void setPointDepart(String pointDepart) {
        this.pointDepart = pointDepart;
    }

    public Integer getNombrePassagers() {
        return nombrePassagers;
    }

    public void setNombrePassagers(Integer nombrePassagers) {
        this.nombrePassagers = nombrePassagers;
    }

    public String getListePassagers() {
        return listePassagers;
    }

    public void setListePassagers(String listePassagers) {
        this.listePassagers = listePassagers;
    }

    public String getTypeVehiculeSouhaite() {
        return typeVehiculeSouhaite;
    }

    public void setTypeVehiculeSouhaite(String typeVehiculeSouhaite) {
        this.typeVehiculeSouhaite = typeVehiculeSouhaite;
    }

    public Boolean getBesoinChauffeur() {
        return besoinChauffeur;
    }

    public void setBesoinChauffeur(Boolean besoinChauffeur) {
        this.besoinChauffeur = besoinChauffeur;
    }

    public String getObservations() {
        return observations;
    }

    public void setObservations(String observations) {
        this.observations = observations;
    }

    public String getMotifRefus() {
        return motifRefus;
    }

    public void setMotifRefus(String motifRefus) {
        this.motifRefus = motifRefus;
    }

    public Utilisateur getRefusePar() {
        return refusePar;
    }

    public void setRefusePar(Utilisateur refusePar) {
        this.refusePar = refusePar;
    }

    public LocalDateTime getDateRefus() {
        return dateRefus;
    }

    public void setDateRefus(LocalDateTime dateRefus) {
        this.dateRefus = dateRefus;
    }

    public Utilisateur getValidationN1Par() {
        return validationN1Par;
    }

    public void setValidationN1Par(Utilisateur validationN1Par) {
        this.validationN1Par = validationN1Par;
    }

    public LocalDateTime getDateValidationN1() {
        return dateValidationN1;
    }

    public void setDateValidationN1(LocalDateTime dateValidationN1) {
        this.dateValidationN1 = dateValidationN1;
    }

    public Utilisateur getValidationN2Par() {
        return validationN2Par;
    }

    public void setValidationN2Par(Utilisateur validationN2Par) {
        this.validationN2Par = validationN2Par;
    }

    public LocalDateTime getDateValidationN2() {
        return dateValidationN2;
    }

    public void setDateValidationN2(LocalDateTime dateValidationN2) {
        this.dateValidationN2 = dateValidationN2;
    }
}
