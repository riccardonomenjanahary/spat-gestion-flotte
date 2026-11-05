package com.vehicule.Spat.vehicule.spat_backend.model;

/**
 * Catégories officielles du dispositif d'utilisation
 * des véhicules formalisé par le DGAL.
 *
 * Les valeurs sont utilisées telles quelles dans la
 * colonne vehicules.categorie et dans les règles
 * métier (circuits, règles bloquantes).
 */
public final class CategorieVehicule {

    /**
     * Véhicule de patrouille et d'urgence (1205 TCA).
     * Réservé aux patrouilles de sûreté/sécurité
     * et aux situations d'urgence.
     */
    public static final String PATROUILLE_URGENCE =
            "Véhicule de patrouille et d'urgence";

    /**
     * Véhicules de mission (1614 WWA, 1615 WWA).
     * Traités par le Service Logistique du DGAL,
     * ordre de mission obligatoire.
     */
    public static final String MISSION =
            "Véhicule de mission";

    /**
     * Voitures de service mutualisées (6 véhicules),
     * affectées par groupe de Directions.
     */
    public static final String MUTUALISEE =
            "Voiture de service mutualisée";

    /**
     * Motos électriques, une par Direction hors DG.
     */
    public static final String MOTO_ELECTRIQUE =
            "Moto électrique";

    private CategorieVehicule() {
    }

    /**
     * Indique si la catégorie enregistrée correspond,
     * de manière insensible à la casse, à l'une des
     * quatre catégories du dispositif DGAL.
     */
    public static boolean estCategorieDispositif(String categorie) {
        return correspond(categorie, PATROUILLE_URGENCE)
                || correspond(categorie, MISSION)
                || correspond(categorie, MUTUALISEE)
                || correspond(categorie, MOTO_ELECTRIQUE);
    }

    /**
     * Une moto électrique du dispositif.
     */
    public static boolean estMotoElectrique(String categorie) {
        return correspond(categorie, MOTO_ELECTRIQUE);
    }

    /**
     * Un véhicule de mission du dispositif.
     */
    public static boolean estVehiculeMission(String categorie) {
        return correspond(categorie, MISSION);
    }

    /**
     * Un véhicule de patrouille et d'urgence.
     */
    public static boolean estVehiculePatrouille(String categorie) {
        return correspond(categorie, PATROUILLE_URGENCE);
    }

    /**
     * Une voiture de service mutualisée.
     */
    public static boolean estVoitureMutualisee(String categorie) {
        return correspond(categorie, MUTUALISEE);
    }

    private static boolean correspond(String categorie, String reference) {
        if (categorie == null) {
            return false;
        }
        return reference.equalsIgnoreCase(categorie.trim());
    }
}
