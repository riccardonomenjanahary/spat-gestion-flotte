package com.vehicule.Spat.vehicule.spat_backend.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

// =========================================================
// ENTITE FICHE SURETE
// =========================================================
//
// PDF de la fiche de bord (patrouille ou urgence) transmis
// par l'Agent de sûreté à la clôture d'une intervention,
// consultable par le Chef DGAL. Le fichier est stocké par
// StockageFichiersService ; seul le nom stocké est conservé.

@Entity
@Table(name = "fiches_surete")
public class FicheSurete {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 20)
    private String mission;

    @Column(length = 40)
    private String immatriculation;

    @Column(length = 30)
    private String debut;

    @Column(name = "cloturee_le", length = 30)
    private String clotureeLe;

    @Column(name = "nom_fichier", nullable = false, length = 260)
    private String nomFichier;

    @Column(name = "nom_stocke", nullable = false, length = 100)
    private String nomStocke;

    @Column(name = "taille_octets", nullable = false)
    private Long tailleOctets;

    @Column(name = "content_type", nullable = false, length = 150)
    private String contentType;

    @ManyToOne(optional = false)
    @JoinColumn(name = "depose_par_id", nullable = false)
    private Utilisateur deposePar;

    @Column(name = "date_depot", nullable = false)
    private LocalDateTime dateDepot;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMission() { return mission; }
    public void setMission(String mission) { this.mission = mission; }

    public String getImmatriculation() { return immatriculation; }
    public void setImmatriculation(String immatriculation) { this.immatriculation = immatriculation; }

    public String getDebut() { return debut; }
    public void setDebut(String debut) { this.debut = debut; }

    public String getClotureeLe() { return clotureeLe; }
    public void setClotureeLe(String clotureeLe) { this.clotureeLe = clotureeLe; }

    public String getNomFichier() { return nomFichier; }
    public void setNomFichier(String nomFichier) { this.nomFichier = nomFichier; }

    public String getNomStocke() { return nomStocke; }
    public void setNomStocke(String nomStocke) { this.nomStocke = nomStocke; }

    public Long getTailleOctets() { return tailleOctets; }
    public void setTailleOctets(Long tailleOctets) { this.tailleOctets = tailleOctets; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public Utilisateur getDeposePar() { return deposePar; }
    public void setDeposePar(Utilisateur deposePar) { this.deposePar = deposePar; }

    public LocalDateTime getDateDepot() { return dateDepot; }
    public void setDateDepot(LocalDateTime dateDepot) { this.dateDepot = dateDepot; }
}
