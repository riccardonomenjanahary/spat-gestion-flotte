package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Maintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.SuiviEntretienPeriodique;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.SuiviEntretienPeriodiqueRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class EntretienPeriodiqueService {

    public static final double INTERVALLE_KM =
            5000.0;

    public static final double ALERTE_AVANT_KM =
            500.0;

    public static final String PREFIXE_PERIODIQUE =
            "[PERIODIQUE_5000]";

    private final SuiviEntretienPeriodiqueRepository
            suiviRepository;

    private final MaintenanceService
            maintenanceService;

        private final NotificationService notificationService;

    @PersistenceContext
    private EntityManager entityManager;

    public EntretienPeriodiqueService(
            SuiviEntretienPeriodiqueRepository suiviRepository,
            MaintenanceService maintenanceService,
            NotificationService notificationService
    ) {
        this.suiviRepository =
                suiviRepository;

        this.maintenanceService =
                maintenanceService;

        this.notificationService = notificationService;
    }

    // =========================================================
    // ENREGISTREMENT DU DERNIER KILOMETRAGE COMPTEUR
    // =========================================================

    /*
     * IMPORTANT :
     * on ne somme PAS des distances saisies manuellement.
     *
     * Le chauffeur saisit la valeur ACTUELLE du compteur.
     *
     * Distance depuis le relevé précédent :
     * dernierKilometrageActuel - dernierKilometragePrecedent
     *
     * Distance depuis le dernier entretien :
     * dernierKilometrageActuel - kilometrageDernierEntretien
     *
     * Le seuil périodique est atteint lorsque cette dernière
     * différence est >= 5 000 km.
     */
    // Un relevé inférieur au précédent est une erreur de saisie métier :
    // ne pas marquer la transaction appelante rollback-only si le contrôleur
    // intercepte l'IllegalArgumentException pour répondre HTTP 400.
    // Les véritables erreurs SQL et les autres exceptions restent annulantes.
    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public SuiviEntretienPeriodique enregistrerKilometrage(
            Vehicule vehicule,
            Double kilometrage
    ) {

        if (vehicule == null
                || vehicule.getId() == null) {

            throw new IllegalArgumentException(
                    "Le véhicule est obligatoire pour le suivi kilométrique."
            );
        }

        if (kilometrage == null
                || kilometrage < 0) {

            throw new IllegalArgumentException(
                    "Le dernier kilométrage compteur est obligatoire et doit être positif."
            );
        }

        SuiviEntretienPeriodique suivi =
                suiviRepository
                        .findByVehiculeId(
                                vehicule.getId()
                        )
                        .orElse(null);

        /*
         * Première utilisation du module :
         * en l'absence d'historique d'entretien connu,
         * le premier kilométrage saisi devient la référence
         * initiale pour le suivi futur.
         *
         * Le Chef du Service Logistique peut ensuite corriger
         * cette référence avec l'endpoint /reference si le
         * kilométrage réel du dernier entretien est connu.
         */
        if (suivi == null) {

            suivi =
                    new SuiviEntretienPeriodique();

            suivi.setVehicule(
                    vehicule
            );

            suivi.setKilometrageDernierEntretien(
                    0.0
            );

            suivi.setProchaineEcheanceKm(
                    INTERVALLE_KM
            );

            suivi.setDernierKilometrageConnu(
                    kilometrage
            );

            suivi.setKilometrageBaseCycle(kilometrage);

            suivi.setEntretienPeriodiqueOuvert(
                    false
            );

            return suiviRepository.save(
                    suivi
            );
        }

        Double precedent =
                suivi.getDernierKilometrageConnu();

        if (precedent != null
                && kilometrage + 0.001 < precedent) {

            throw new IllegalArgumentException(
                    "Le kilométrage saisi ("
                            + formaterKm(kilometrage)
                            + " km) est inférieur au dernier relevé connu ("
                            + formaterKm(precedent)
                            + " km)."
            );
        }

        suivi.setDernierKilometrageConnu(
                kilometrage
        );

        // Compatibilité des suivis créés avant l'introduction du compteur de cycle.
        if (suivi.getKilometrageBaseCycle() == null) {
            Double baseHistorique = suivi.getKilometrageDernierEntretien();
            suivi.setKilometrageBaseCycle(baseHistorique == null ? kilometrage : baseHistorique);
            suivi.setKilometrageDernierEntretien(0.0);
            suivi.setProchaineEcheanceKm(INTERVALLE_KM);
        }

        // Vérifie d'abord si un dossier périodique précédent a été clôturé.
        synchroniserCloture(
                suivi
        );

        if (suivi.getProchaineEcheanceKm() == null) {

            suivi.setProchaineEcheanceKm(
                    INTERVALLE_KM
            );
        }

        double baseCycle = suivi.getKilometrageBaseCycle() == null
                ? kilometrage : suivi.getKilometrageBaseCycle();
        double kilometrageCycle = Math.max(0, kilometrage - baseCycle);

        boolean entretienOuvert =
                Boolean.TRUE.equals(
                        suivi.getEntretienPeriodiqueOuvert()
                );

        if (!entretienOuvert
                && kilometrageCycle
                >= suivi.getProchaineEcheanceKm()) {

            creerDossierPeriodique(
                                suivi,
                                        kilometrage
            );
        }

        return suiviRepository.save(
                suivi
        );
    }

    // =========================================================
    // INITIALISATION / CORRECTION DE LA REFERENCE
    // =========================================================

    @Transactional
    public SuiviEntretienPeriodique initialiserReference(
            Vehicule vehicule,
            Double kilometrageDernierEntretien
    ) {

        if (vehicule == null
                || vehicule.getId() == null) {

            throw new IllegalArgumentException(
                    "Le véhicule est obligatoire."
            );
        }

        if (kilometrageDernierEntretien == null
                || kilometrageDernierEntretien < 0) {

            throw new IllegalArgumentException(
                    "Le kilométrage du dernier entretien est invalide."
            );
        }

        SuiviEntretienPeriodique suivi =
                suiviRepository
                        .findByVehiculeId(
                                vehicule.getId()
                        )
                        .orElseGet(
                                SuiviEntretienPeriodique::new
                        );

        suivi.setVehicule(
                vehicule
        );

        suivi.setKilometrageDernierEntretien(
                0.0
        );

        suivi.setKilometrageBaseCycle(kilometrageDernierEntretien);

        suivi.setProchaineEcheanceKm(
                INTERVALLE_KM
        );

        if (suivi.getDernierKilometrageConnu() == null
                || suivi.getDernierKilometrageConnu()
                < kilometrageDernierEntretien) {

            suivi.setDernierKilometrageConnu(
                    kilometrageDernierEntretien
            );
        }

        suivi.setEntretienPeriodiqueOuvert(
                existeDossierPeriodiqueActif(
                        vehicule.getId()
                )
        );

        suivi.setKilometrageDeclenchement(
                null
        );

        suivi.setDateDeclenchement(
                null
        );

        return suiviRepository.save(
                suivi
        );
    }

    // =========================================================
    // SYNCHRONISATION DE LA CLOTURE
    // =========================================================

    private void synchroniserCloture(
            SuiviEntretienPeriodique suivi
    ) {

        if (!Boolean.TRUE.equals(
                suivi.getEntretienPeriodiqueOuvert()
        )) {
            return;
        }

        List<Maintenance> dossiers = entityManager.createQuery(
                        "SELECT m FROM Maintenance m WHERE m.vehicule.id = :vehiculeId AND m.natureIntervention LIKE :prefixe",
                        Maintenance.class)
                .setParameter("vehiculeId", suivi.getVehicule().getId())
                .setParameter("prefixe", PREFIXE_PERIODIQUE + "%")
                .getResultList();
        boolean toujoursActif = dossiers.stream().anyMatch(maintenance ->
                !"CLOTUREE".equalsIgnoreCase(String.valueOf(maintenance.getStatut())));

        if (toujoursActif) {
            return;
        }

                boolean clotureDepuisDeclenchement = suivi.getDateDeclenchement() != null
                                && dossiers.stream().anyMatch(maintenance ->
                                                "CLOTUREE".equalsIgnoreCase(String.valueOf(maintenance.getStatut()))
                                                                && maintenance.getDateCreation() != null
                                                                && !maintenance.getDateCreation().isBefore(suivi.getDateDeclenchement()));
                if (clotureDepuisDeclenchement) {
                        reinitialiserCycle(suivi);
                } else {
                        // Une annulation ou un refus n'est pas un entretien réalisé :
                        // conserver le compteur et rendre l'échéance disponible à nouveau.
                        suivi.setEntretienPeriodiqueOuvert(false);
                        suivi.setKilometrageDeclenchement(null);
                        suivi.setDateDeclenchement(null);
                }
    }

    // =========================================================
    // CREATION AUTOMATIQUE DU DOSSIER MAINTENANCE
    // =========================================================

    private void creerDossierPeriodique(
            SuiviEntretienPeriodique suivi,
            Double kilometrage
    ) {

        if (existeDossierPeriodiqueActif(
                suivi
                        .getVehicule()
                        .getId()
        )) {

            suivi.setEntretienPeriodiqueOuvert(
                    true
            );

            return;
        }

        Maintenance maintenance =
                new Maintenance();

        maintenance.setVehicule(
                suivi.getVehicule()
        );

        maintenance.setNatureIntervention(
                PREFIXE_PERIODIQUE
                        + " Entretien périodique - seuil de 5 000 km atteint"
                        + " | kilométrage compteur : "
                        + formaterKm(kilometrage)
                        + " km"
        );

        maintenanceService.creer(
                maintenance
        );

        notifierEntretienPeriodique(suivi, kilometrage);

        suivi.setEntretienPeriodiqueOuvert(
                true
        );

        suivi.setKilometrageDeclenchement(
                kilometrage
        );

        suivi.setDateDeclenchement(
                LocalDateTime.now()
        );
    }

        /** Réinitialise uniquement le compteur du cycle périodique; l'odomètre absolu et les dossiers restent intacts. */
        @Transactional
        public void reinitialiserCycleDepuisMaintenance(java.util.UUID maintenanceId) {
                Maintenance maintenance = entityManager.find(Maintenance.class, maintenanceId);
                if (maintenance == null || !estPeriodique(maintenance)) return;
                SuiviEntretienPeriodique suivi = suiviRepository.findByVehiculeId(maintenance.getVehicule().getId()).orElse(null);
                if (suivi != null) reinitialiserCycle(suivi);
        }

        @Transactional
        public Maintenance transmettrePeriodiqueAuDid(java.util.UUID maintenanceId) {
                Maintenance maintenance = entityManager.find(Maintenance.class, maintenanceId);
                if (maintenance == null || !estPeriodique(maintenance))
                        throw new IllegalArgumentException("Dossier d'entretien périodique introuvable.");
                if (maintenance.getStatut() != com.vehicule.Spat.vehicule.spat_backend.model.StatutMaintenance.EN_ATTENTE_AVIS_DID)
                        throw new IllegalStateException("Ce dossier périodique a déjà été transmis.");
                maintenance.setStatut(com.vehicule.Spat.vehicule.spat_backend.model.StatutMaintenance.ENTRETIEN_AUTORISE);
                Maintenance sauvegardee = entityManager.merge(maintenance);
                try {
                        notificationService.creerPourRole("MECANICIEN_DID", "ENTRETIEN_PERIODIQUE", "IMPORTANT",
                                        "Entretien périodique à effectuer — " + maintenance.getVehicule().getImmatriculation(),
                                        maintenance.getNatureIntervention() + ". Le Chef du Service Logistique vous demande de réaliser l'entretien.",
                                        "/mecanicien-did", null, null, maintenance.getVehicule().getId(), false);
                } catch (Exception e) {
                        System.err.println("Dossier périodique transmis, notification DID impossible : " + e.getMessage());
                }
                return sauvegardee;
        }

        public boolean estPeriodique(Maintenance maintenance) {
                return maintenance != null && maintenance.getNatureIntervention() != null
                                && maintenance.getNatureIntervention().startsWith(PREFIXE_PERIODIQUE);
        }

        private void reinitialiserCycle(SuiviEntretienPeriodique suivi) {
                if (suivi.getDernierKilometrageConnu() != null) {
                        suivi.setKilometrageBaseCycle(suivi.getDernierKilometrageConnu());
                }
                suivi.setKilometrageDernierEntretien(0.0);
                suivi.setProchaineEcheanceKm(INTERVALLE_KM);
                suivi.setEntretienPeriodiqueOuvert(false);
                suivi.setKilometrageDeclenchement(null);
                suivi.setDateDeclenchement(null);
                suiviRepository.save(suivi);
        }

        private void notifierEntretienPeriodique(
                        SuiviEntretienPeriodique suivi,
                        Double kilometrage
        ) {
                Vehicule vehicule = suivi.getVehicule();
                String immatriculation = vehicule == null || vehicule.getImmatriculation() == null
                                ? "véhicule non identifié" : vehicule.getImmatriculation();
                String titre = "Entretien périodique requis — " + immatriculation;
                String message = "Le véhicule " + immatriculation + " a atteint "
                                + formaterKm(kilometrage) + " km. Le seuil d'entretien périodique de "
                                + formaterKm(suivi.getProchaineEcheanceKm()) + " km est atteint. "
                                + "Un dossier de maintenance a été créé pour traitement.";
                Long vehiculeId = vehicule == null ? null : vehicule.getId();

                Runnable notifier = () -> {
                        notifierRoleEntretien("MECANICIEN_DID", titre, message, vehiculeId, "/mecanicien-did");
                        notifierRoleEntretien("CHEF_SERVICE_LOGISTIQUE", titre, message, vehiculeId, "/chef-service-logistique");
                };

                if (TransactionSynchronizationManager.isActualTransactionActive()
                                && TransactionSynchronizationManager.isSynchronizationActive()) {
                        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                                @Override
                                public void afterCommit() {
                                        notifier.run();
                                }
                        });
                } else {
                        notifier.run();
                }
        }

        private void notifierRoleEntretien(String role, String titre, String message,
                                                                           Long vehiculeId, String lien) {
                try {
                        notificationService.creerPourRoleIsole(
                                        role, "ENTRETIEN_PERIODIQUE", "IMPORTANT", titre, message,
                                        lien, null, null, vehiculeId, false);
                } catch (Exception e) {
                        System.err.println("Entretien périodique enregistré, notification impossible pour "
                                        + role + " : " + e.getMessage());
                }
        }

    // =========================================================
    // DETECTION D'UN DOSSIER PERIODIQUE ACTIF
    // =========================================================

    private boolean existeDossierPeriodiqueActif(
            Long vehiculeId
    ) {

        List<Maintenance> dossiers =
                entityManager
                        .createQuery(
                                """
                                SELECT m
                                FROM Maintenance m
                                WHERE m.vehicule.id = :vehiculeId
                                  AND m.natureIntervention LIKE :prefixe
                                """,
                                Maintenance.class
                        )
                        .setParameter(
                                "vehiculeId",
                                vehiculeId
                        )
                        .setParameter(
                                "prefixe",
                                PREFIXE_PERIODIQUE + "%"
                        )
                        .getResultList();

        return dossiers
                .stream()
                .anyMatch(
                        maintenance ->
                                !"CLOTUREE"
                                        .equalsIgnoreCase(
                                                String.valueOf(
                                                        maintenance.getStatut()
                                                )
                                        )
                );
    }

    // =========================================================
    // CONSULTATION
    // =========================================================

    @Transactional(readOnly = true)
    public SuiviEntretienPeriodique trouverParVehicule(
            Long vehiculeId
    ) {

        return suiviRepository
                .findByVehiculeId(
                        vehiculeId
                )
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<SuiviEntretienPeriodique> lister() {

        return suiviRepository
                .findAll()
                .stream()
                .sorted(
                        Comparator.comparing(
                                suivi ->
                                        suivi
                                                .getVehicule()
                                                .getImmatriculation(),
                                Comparator.nullsLast(
                                        String.CASE_INSENSITIVE_ORDER
                                )
                        )
                )
                .toList();
    }

    /** Charge les relations LAZY et construit la réponse dans la même
     * transaction, afin d'éviter une LazyInitializationException au contrôleur. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listerResumes() {
        return suiviRepository.findAll().stream()
                .sorted(Comparator.comparing(
                        suivi -> suivi.getVehicule() == null ? null : suivi.getVehicule().getImmatriculation(),
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(this::resume)
                .toList();
    }

    public Map<String, Object> resume(
            SuiviEntretienPeriodique suivi
    ) {

        Map<String, Object> result =
                new LinkedHashMap<>();

        if (suivi == null) {
            return result;
        }

        Vehicule vehicule =
                suivi.getVehicule();

        Map<String, Object> vehiculeMap =
                new LinkedHashMap<>();

        if (vehicule != null) {

            vehiculeMap.put(
                    "id",
                    vehicule.getId()
            );

            vehiculeMap.put(
                    "immatriculation",
                    vehicule.getImmatriculation()
            );

            vehiculeMap.put(
                    "modeleType",
                    vehicule.getModeleType()
            );

            vehiculeMap.put(
                    "categorie",
                    vehicule.getCategorie()
            );
        }

        Double actuel =
                suivi.getDernierKilometrageConnu();

        Double prochaine =
                suivi.getProchaineEcheanceKm();

        Double baseCycle = suivi.getKilometrageBaseCycle() != null
                ? suivi.getKilometrageBaseCycle()
                : suivi.getKilometrageDernierEntretien();
        Double kilometrageCycle = actuel == null ? null
                : baseCycle == null ? 0.0 : Math.max(0.0, actuel - baseCycle);

        Double restant =
                actuel != null
                        && prochaine != null
                        ? prochaine - (kilometrageCycle == null ? 0 : kilometrageCycle)
                        : null;

        String statut;

        if (Boolean.TRUE.equals(
                suivi.getEntretienPeriodiqueOuvert()
        )) {

            statut =
                    "ENTRETIEN_OUVERT";

        } else if (actuel == null
                || prochaine == null) {

            statut =
                    "NON_INITIALISE";

        } else if (restant <= 0) {

            statut =
                    "A_FAIRE";

        } else if (restant <= ALERTE_AVANT_KM) {

            statut =
                    "BIENTOT";

        } else {

            statut =
                    "NORMAL";
        }

        result.put(
                "id",
                suivi.getId()
        );

        result.put(
                "vehicule",
                vehiculeMap
        );

        result.put(
                "kilometrageDernierEntretien",
                suivi.getKilometrageDernierEntretien()
        );

        result.put(
                "prochaineEcheanceKm",
                prochaine
        );

        result.put(
                "dernierKilometrageConnu",
                actuel
        );

        result.put("kilometrageBaseCycle", baseCycle);
        result.put("kilometrageDepuisDernierEntretien", kilometrageCycle);

        result.put(
                "kilometresRestants",
                restant
        );

        result.put(
                "entretienPeriodiqueOuvert",
                suivi.getEntretienPeriodiqueOuvert()
        );

        result.put(
                "kilometrageDeclenchement",
                suivi.getKilometrageDeclenchement()
        );

        result.put(
                "dateDeclenchement",
                suivi.getDateDeclenchement()
        );

        result.put(
                "statut",
                statut
        );

        result.put(
                "intervalleKm",
                INTERVALLE_KM
        );

        return result;
    }

    private String formaterKm(
            Double kilometrage
    ) {

        if (kilometrage == null) {
            return "0";
        }

        if (Math.floor(kilometrage)
                == kilometrage) {

            return String.format(
                    "%.0f",
                    kilometrage
            );
        }

        return String.format(
                "%.1f",
                kilometrage
        );
    }
}

