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
     * ou tant que le Service Logistique n'a pas affecté
     * de chauffeur.
     */
    @ManyToOne
    @JoinColumn(name = "chauffeur_id")
    private Chauffeur chauffeur;

    // =====================================================
    // UTILISATEUR AYANT CREE / SAISI LA DEMANDE
    // =====================================================

    /**
     * Pour une demande normale :
     * utilisateur ayant créé sa propre demande.
     *
     * Pour un ticket EXPRESS :
     * responsable flotte / Service Logistique ayant
     * enregistré l'urgence dans Parc Auto.
     */
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
    // URGENCE / DELAI
    // =====================================================

    /**
     * true uniquement lorsqu'il s'agit d'une
     * urgence opérationnelle réelle.
     *
     * Une demande déposée à moins de 24h n'est donc
     * pas automatiquement une urgence.
     */
    @Column(nullable = false)
    private boolean demandeUrgente = false;

    /**
     * Pour une demande TARDIVE :
     * justification du non-respect du délai de 24h.
     *
     * Pour une demande URGENTE :
     * justification de l'urgence opérationnelle.
     */
    @Column(length = 1000)
    private String motifUrgence;

    /**
     * PLANIFIEE :
     * demande normale faite dans le délai.
     *
     * TARDIVE :
     * demande faite à moins de 24h,
     * sans caractère d'urgence opérationnelle.
     *
     * URGENTE :
     * événement imprévu nécessitant une
     * prise en charge prioritaire.
     */
    @Column(name = "type_demande", length = 20)
    private String typeDemande = "PLANIFIEE";

    /**
     * true si la demande est créée moins de 24h
     * avant son départ.
     *
     * Cette notion reste indépendante
     * de l'urgence opérationnelle.
     */
    @Column(name = "hors_delai_24h")
    private Boolean horsDelai24h = false;

    // =====================================================
    // ZONE DE MISSION
    // =====================================================

    /**
     * VILLE_TOAMASINA :
     * mission réalisée dans la ville de Toamasina.
     *
     * HORS_TOAMASINA :
     * mission réalisée hors de la ville de Toamasina.
     */
    @Column(name = "zone_mission", length = 30)
    private String zoneMission;

    // =====================================================
    // MOBILISABILITE
    // =====================================================

    /**
     * FLEXIBLE :
     * mission pouvant éventuellement être réorganisée
     * par le Service Logistique en cas d'urgence.
     *
     * VERROUILLEE :
     * mission qui ne doit normalement pas être déplacée.
     *
     * Une mission urgente EXPRESS sera généralement
     * VERROUILLEE après sa création.
     *
     * ATTENTION :
     * FLEXIBLE ne signifie PAS qu'un véhicule peut
     * être doublement affecté.
     */
    @Column(name = "mobilisabilite", length = 20)
    private String mobilisabilite = "FLEXIBLE";

    // =====================================================
    // MODE DE CREATION
    // =====================================================

    /**
     * NORMAL :
     * demande créée à partir du formulaire classique.
     *
     * EXPRESS :
     * ticket créé rapidement par le Service Logistique
     * lorsqu'une urgence arrive par téléphone,
     * oralement ou par tout autre canal immédiat.
     */
    @Column(name = "mode_creation", length = 20)
    private String modeCreation = "NORMAL";

    // =====================================================
    // REGULARISATION
    // =====================================================

    /**
     * false :
     * dossier administrativement complet.
     *
     * true :
     * certaines informations doivent être complétées
     * après la mission.
     *
     * Les Tickets Express sont créés avec true.
     */
    @Column(name = "a_regulariser")
    private Boolean aRegulariser = false;

    // =====================================================
    // ORIGINE DE LA DEMANDE EXPRESS
    // =====================================================

    /**
     * Identifie la personne, Direction, Département
     * ou Service ayant demandé oralement / téléphoniquement
     * la mission urgente.
     *
     * Exemples :
     *
     * Direction Générale
     * Chef DGAL
     * Cabinet DG
     * Direction X
     *
     * Ce champ est principalement utilisé
     * avec modeCreation = EXPRESS.
     */
    @Column(name = "demande_express_par", length = 255)
    private String demandeExpressPar;

    // =====================================================
    // STATUT
    // =====================================================

    /**
     * Statuts actuellement utilisés :
     *
     * CIRCUIT NORMAL :
     *
     * EN_ATTENTE
     * EN_ATTENTE_AVIS_DID
     * VALIDEE_N1
     * VALIDEE
     * REFUSEE
     *
     * CIRCUIT EXPRESS :
     *
     * A_AFFECTER
     *
     * D'autres statuts opérationnels seront ajoutés
     * progressivement pour le dispatch :
     *
     * AFFECTEE
     * EN_MISSION
     * TERMINEE
     * A_REGULARISER
     * CLOTUREE
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

    /**
     * Ces informations sont obligatoires dans
     * le formulaire classique.
     *
     * Elles peuvent rester null temporairement
     * dans un Ticket Express et être complétées
     * lors de la régularisation.
     */
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

    @ManyToOne
    @JoinColumn(name = "validation_n2_par_id")
    private Utilisateur validationN2Par;

    private LocalDateTime dateValidationN2;

    // =====================================================
    // CONSTRUCTEUR
    // =====================================================

    public Reservation() {
    }

    // =====================================================
    // VALEURS PAR DEFAUT
    // =====================================================

    /**
     * Garantit des valeurs cohérentes aussi bien
     * pour les nouvelles réservations que pour
     * certaines anciennes lignes existant déjà en base.
     */
    @PrePersist
    @PreUpdate
    private void appliquerValeursParDefaut() {

        // -------------------------------------------------
        // TYPE DE DEMANDE
        // -------------------------------------------------

        if (typeDemande == null
                || typeDemande.isBlank()) {

            typeDemande =
                    demandeUrgente
                            ? "URGENTE"
                            : "PLANIFIEE";
        }

        // -------------------------------------------------
        // MOBILISABILITE
        // -------------------------------------------------

        if (mobilisabilite == null
                || mobilisabilite.isBlank()) {

            mobilisabilite =
                    "FLEXIBLE";
        }

        // -------------------------------------------------
        // DELAI 24H
        // -------------------------------------------------

        if (horsDelai24h == null) {

            horsDelai24h =
                    false;
        }

        // -------------------------------------------------
        // MODE DE CREATION
        // -------------------------------------------------

        if (modeCreation == null
                || modeCreation.isBlank()) {

            modeCreation =
                    "NORMAL";
        }

        // -------------------------------------------------
        // REGULARISATION
        // -------------------------------------------------

        if (aRegulariser == null) {

            aRegulariser =
                    false;
        }

        // -------------------------------------------------
        // DATE DE CREATION
        // -------------------------------------------------

        if (dateCreation == null) {

            dateCreation =
                    LocalDateTime.now();
        }
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


    // =====================================================
    // VEHICULE
    // =====================================================

    public Vehicule getVehicule() {
        return vehicule;
    }

    public void setVehicule(Vehicule vehicule) {
        this.vehicule = vehicule;
    }


    // =====================================================
    // CHAUFFEUR
    // =====================================================

    public Chauffeur getChauffeur() {
        return chauffeur;
    }

    public void setChauffeur(Chauffeur chauffeur) {
        this.chauffeur = chauffeur;
    }


    // =====================================================
    // DEMANDEUR
    // =====================================================

    public Utilisateur getDemandeur() {
        return demandeur;
    }

    public void setDemandeur(Utilisateur demandeur) {
        this.demandeur = demandeur;
    }


    // =====================================================
    // DATES MISSION
    // =====================================================

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


    // =====================================================
    // MOTIF
    // =====================================================

    public String getMotif() {
        return motif;
    }

    public void setMotif(String motif) {
        this.motif = motif;
    }


    // =====================================================
    // URGENCE
    // =====================================================

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


    // =====================================================
    // TYPE DE DEMANDE
    // =====================================================

    public String getTypeDemande() {

        if (typeDemande == null
                || typeDemande.isBlank()) {

            return demandeUrgente
                    ? "URGENTE"
                    : "PLANIFIEE";
        }

        return typeDemande;
    }

    public void setTypeDemande(String typeDemande) {
        this.typeDemande = typeDemande;
    }


    // =====================================================
    // DELAI 24H
    // =====================================================

    public Boolean getHorsDelai24h() {

        return horsDelai24h != null
                ? horsDelai24h
                : false;
    }

    public void setHorsDelai24h(Boolean horsDelai24h) {
        this.horsDelai24h = horsDelai24h;
    }


    // =====================================================
    // ZONE DE MISSION
    // =====================================================

    public String getZoneMission() {
        return zoneMission;
    }

    public void setZoneMission(String zoneMission) {
        this.zoneMission = zoneMission;
    }


    // =====================================================
    // MOBILISABILITE
    // =====================================================

    public String getMobilisabilite() {

        if (mobilisabilite == null
                || mobilisabilite.isBlank()) {

            return "FLEXIBLE";
        }

        return mobilisabilite;
    }

    public void setMobilisabilite(String mobilisabilite) {
        this.mobilisabilite = mobilisabilite;
    }


    // =====================================================
    // MODE DE CREATION
    // =====================================================

    public String getModeCreation() {

        if (modeCreation == null
                || modeCreation.isBlank()) {

            return "NORMAL";
        }

        return modeCreation;
    }

    public void setModeCreation(String modeCreation) {
        this.modeCreation = modeCreation;
    }


    // =====================================================
    // REGULARISATION
    // =====================================================

    public Boolean getARegulariser() {

        return aRegulariser != null
                ? aRegulariser
                : false;
    }

    public void setARegulariser(Boolean aRegulariser) {
        this.aRegulariser = aRegulariser;
    }


    // =====================================================
    // DEMANDE EXPRESS PAR
    // =====================================================

    public String getDemandeExpressPar() {
        return demandeExpressPar;
    }

    public void setDemandeExpressPar(String demandeExpressPar) {
        this.demandeExpressPar = demandeExpressPar;
    }


    // =====================================================
    // STATUT
    // =====================================================

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }


    // =====================================================
    // DATE CREATION
    // =====================================================

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }


    // =====================================================
    // BENEFICIAIRE
    // =====================================================

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


    // =====================================================
    // DETAILS LOGISTIQUES
    // =====================================================

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


    // =====================================================
    // REFUS NIVEAU 1
    // =====================================================

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


    // =====================================================
    // VALIDATION NIVEAU 1
    // =====================================================

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


    // =====================================================
    // VALIDATION NIVEAU 2
    // =====================================================

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
