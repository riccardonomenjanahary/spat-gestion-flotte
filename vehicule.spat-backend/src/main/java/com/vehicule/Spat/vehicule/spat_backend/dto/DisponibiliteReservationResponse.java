package com.vehicule.Spat.vehicule.spat_backend.dto;

import java.util.ArrayList;
import java.util.List;

public class DisponibiliteReservationResponse {

    private Long reservationId;

    private String typeSouhaite;

    private boolean typeSouhaiteDisponible;

    private String message;

    private boolean chauffeurRequis;

    private boolean chauffeurDisponible;

    private List<VehiculeDisponibleDto> vehiculesCorrespondants =
            new ArrayList<>();

    private List<VehiculeDisponibleDto> suggestionsVehicules =
            new ArrayList<>();

    private List<ChauffeurDisponibleDto> chauffeursDisponibles =
            new ArrayList<>();

    // =====================================================
    // CONSTRUCTEUR
    // =====================================================

    public DisponibiliteReservationResponse() {
    }

    // =====================================================
    // VEHICULE DISPONIBLE
    // =====================================================

    public static class VehiculeDisponibleDto {

        private Long id;

        private String immatriculation;

        private String categorie;

        private String modeleType;

        /**
         * Type réel renseigné sur le véhicule.
         *
         * Exemples :
         * 4X4
         * BERLINE
         * UTILITAIRE
         * MINIBUS
         * AUTRE
         */
        private String typeVehicule;

        private String statut;

        // -------------------------------------------------
        // CONSTRUCTEUR
        // -------------------------------------------------

        public VehiculeDisponibleDto() {
        }

        // -------------------------------------------------
        // GETTERS / SETTERS
        // -------------------------------------------------

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getImmatriculation() {
            return immatriculation;
        }

        public void setImmatriculation(String immatriculation) {
            this.immatriculation = immatriculation;
        }

        public String getCategorie() {
            return categorie;
        }

        public void setCategorie(String categorie) {
            this.categorie = categorie;
        }

        public String getModeleType() {
            return modeleType;
        }

        public void setModeleType(String modeleType) {
            this.modeleType = modeleType;
        }

        public String getTypeVehicule() {
            return typeVehicule;
        }

        public void setTypeVehicule(String typeVehicule) {
            this.typeVehicule = typeVehicule;
        }

        public String getStatut() {
            return statut;
        }

        public void setStatut(String statut) {
            this.statut = statut;
        }
    }

    // =====================================================
    // CHAUFFEUR DISPONIBLE
    // =====================================================

    public static class ChauffeurDisponibleDto {

        private Long id;

        private String matricule;

        private String nom;

        private String prenom;

        private String telephone;

        private String statut;

        // -------------------------------------------------
        // CONSTRUCTEUR
        // -------------------------------------------------

        public ChauffeurDisponibleDto() {
        }

        // -------------------------------------------------
        // GETTERS / SETTERS
        // -------------------------------------------------

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getMatricule() {
            return matricule;
        }

        public void setMatricule(String matricule) {
            this.matricule = matricule;
        }

        public String getNom() {
            return nom;
        }

        public void setNom(String nom) {
            this.nom = nom;
        }

        public String getPrenom() {
            return prenom;
        }

        public void setPrenom(String prenom) {
            this.prenom = prenom;
        }

        public String getTelephone() {
            return telephone;
        }

        public void setTelephone(String telephone) {
            this.telephone = telephone;
        }

        public String getStatut() {
            return statut;
        }

        public void setStatut(String statut) {
            this.statut = statut;
        }
    }

    // =====================================================
    // GETTERS / SETTERS PRINCIPAUX
    // =====================================================

    public Long getReservationId() {
        return reservationId;
    }

    public void setReservationId(Long reservationId) {
        this.reservationId = reservationId;
    }

    public String getTypeSouhaite() {
        return typeSouhaite;
    }

    public void setTypeSouhaite(String typeSouhaite) {
        this.typeSouhaite = typeSouhaite;
    }

    public boolean isTypeSouhaiteDisponible() {
        return typeSouhaiteDisponible;
    }

    public void setTypeSouhaiteDisponible(
            boolean typeSouhaiteDisponible
    ) {
        this.typeSouhaiteDisponible =
                typeSouhaiteDisponible;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isChauffeurRequis() {
        return chauffeurRequis;
    }

    public void setChauffeurRequis(
            boolean chauffeurRequis
    ) {
        this.chauffeurRequis =
                chauffeurRequis;
    }

    public boolean isChauffeurDisponible() {
        return chauffeurDisponible;
    }

    public void setChauffeurDisponible(
            boolean chauffeurDisponible
    ) {
        this.chauffeurDisponible =
                chauffeurDisponible;
    }

    public List<VehiculeDisponibleDto>
    getVehiculesCorrespondants() {

        return vehiculesCorrespondants;
    }

    public void setVehiculesCorrespondants(
            List<VehiculeDisponibleDto> vehiculesCorrespondants
    ) {
        this.vehiculesCorrespondants =
                vehiculesCorrespondants;
    }

    public List<VehiculeDisponibleDto>
    getSuggestionsVehicules() {

        return suggestionsVehicules;
    }

    public void setSuggestionsVehicules(
            List<VehiculeDisponibleDto> suggestionsVehicules
    ) {
        this.suggestionsVehicules =
                suggestionsVehicules;
    }

    public List<ChauffeurDisponibleDto>
    getChauffeursDisponibles() {

        return chauffeursDisponibles;
    }

    public void setChauffeursDisponibles(
            List<ChauffeurDisponibleDto> chauffeursDisponibles
    ) {
        this.chauffeursDisponibles =
                chauffeursDisponibles;
    }
}