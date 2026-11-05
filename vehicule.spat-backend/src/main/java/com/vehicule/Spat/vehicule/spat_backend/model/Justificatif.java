package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

// =========================================================
// ENTITE JUSTIFICATIF
// =========================================================
//
// Pièce justificative du dispositif d'utilisation des
// véhicules : ordre de mission signé, reçu de carburant,
// documents administratifs du véhicule (carte grise,
// visite technique, assurance) ou toute autre pièce.
//
// Le fichier physique est stocké par StockageFichiersService
// (répertoire app.uploads.dir) ; seul le nom stocké est
// conservé ici.

@Entity
@Table(name = "justificatifs")
public class Justificatif {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =====================================================
    // TYPE
    // =====================================================

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TypeJustificatif type;

    // =====================================================
    // FICHIER
    // =====================================================

    // Nom original du fichier déposé (affichage).
    @Column(name = "nom_fichier", nullable = false, length = 260)
    private String nomFichier;

    // Nom technique du fichier sur le disque.
    @Column(name = "nom_stocke", nullable = false, length = 100)
    private String nomStocke;

    @Column(name = "taille_octets", nullable = false)
    private Long tailleOctets;

    // Type MIME vérifié à l'upload (pdf, jpg, png).
    @Column(name = "content_type", nullable = false, length = 150)
    private String contentType;

    // =====================================================
    // RATTACHEMENT (au moins une des trois cibles)
    // =====================================================

    @ManyToOne
    @JoinColumn(name = "vehicule_id")
    private Vehicule vehicule;

    @ManyToOne
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    @ManyToOne
    @JoinColumn(name = "transaction_carburant_id")
    private TransactionCarburant transactionCarburant;

    // =====================================================
    // TRACABILITE DU DEPOT
    // =====================================================

    @ManyToOne(optional = false)
    @JoinColumn(name = "depose_par_id", nullable = false)
    private Utilisateur deposePar;

    @Column(name = "date_depot", nullable = false)
    private LocalDateTime dateDepot = LocalDateTime.now();

    // =====================================================
    // VALIDATION (ordre de mission signé notamment)
    // =====================================================

    @Column(nullable = false)
    private Boolean valide = false;

    @ManyToOne
    @JoinColumn(name = "valide_par_id")
    private Utilisateur validePar;

    @Column(name = "date_validation")
    private LocalDateTime dateValidation;

    @Column(name = "commentaire_validation", length = 500)
    private String commentaireValidation;

    // =====================================================
    // LIBELLE LIBRE
    // =====================================================

    @Column(length = 300)
    private String libelle;

    // =====================================================
    // GETTERS / SETTERS
    // =====================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public TypeJustificatif getType() {
        return type;
    }

    public void setType(TypeJustificatif type) {
        this.type = type;
    }

    public String getNomFichier() {
        return nomFichier;
    }

    public void setNomFichier(String nomFichier) {
        this.nomFichier = nomFichier;
    }

    public String getNomStocke() {
        return nomStocke;
    }

    public void setNomStocke(String nomStocke) {
        this.nomStocke = nomStocke;
    }

    public Long getTailleOctets() {
        return tailleOctets;
    }

    public void setTailleOctets(Long tailleOctets) {
        this.tailleOctets = tailleOctets;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Vehicule getVehicule() {
        return vehicule;
    }

    public void setVehicule(Vehicule vehicule) {
        this.vehicule = vehicule;
    }

    public Reservation getReservation() {
        return reservation;
    }

    public void setReservation(Reservation reservation) {
        this.reservation = reservation;
    }

    public TransactionCarburant getTransactionCarburant() {
        return transactionCarburant;
    }

    public void setTransactionCarburant(TransactionCarburant transactionCarburant) {
        this.transactionCarburant = transactionCarburant;
    }

    public Utilisateur getDeposePar() {
        return deposePar;
    }

    public void setDeposePar(Utilisateur deposePar) {
        this.deposePar = deposePar;
    }

    public LocalDateTime getDateDepot() {
        return dateDepot;
    }

    public void setDateDepot(LocalDateTime dateDepot) {
        this.dateDepot = dateDepot;
    }

    public Boolean getValide() {
        return valide;
    }

    public void setValide(Boolean valide) {
        this.valide = valide;
    }

    public Utilisateur getValidePar() {
        return validePar;
    }

    public void setValidePar(Utilisateur validePar) {
        this.validePar = validePar;
    }

    public LocalDateTime getDateValidation() {
        return dateValidation;
    }

    public void setDateValidation(LocalDateTime dateValidation) {
        this.dateValidation = dateValidation;
    }

    public String getCommentaireValidation() {
        return commentaireValidation;
    }

    public void setCommentaireValidation(String commentaireValidation) {
        this.commentaireValidation = commentaireValidation;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }
}
