package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Maintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.StatutMaintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.AffectationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.MaintenanceRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.ReservationRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.util.UUID;

@Service
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;
    private final VehiculeRepository vehiculeRepository;
    private final ReservationRepository reservationRepository;
    private final AffectationRepository affectationRepository;
    private final NotificationService notificationService;

    private static final Set<StatutMaintenance> STATUTS_ENTRETIEN_ACTIFS = Set.of(
            StatutMaintenance.EN_ATTENTE_VALIDATION_ENTRETIEN,
            StatutMaintenance.ENTRETIEN_AUTORISE,
            StatutMaintenance.ENTRETIEN_TERMINE
    );

    public MaintenanceService(
            MaintenanceRepository maintenanceRepository,
            VehiculeRepository vehiculeRepository,
            ReservationRepository reservationRepository,
            AffectationRepository affectationRepository,
            NotificationService notificationService
    ) {
        this.maintenanceRepository = maintenanceRepository;
        this.vehiculeRepository = vehiculeRepository;
        this.reservationRepository = reservationRepository;
        this.affectationRepository = affectationRepository;
        this.notificationService = notificationService;
    }

    // =====================================================
    // CREATION DEMANDE AVIS ENTRETIEN
    // Chef Service Logistique
    // =====================================================

    public Maintenance creer(
            Maintenance maintenance
    ) {

        maintenance.setStatut(
                StatutMaintenance.EN_ATTENTE_AVIS_DID
        );

        maintenance.setDateCreation(
                LocalDateTime.now()
        );

        return maintenanceRepository.save(
                maintenance
        );
    }

    // =====================================================
    // DEMANDES D'ENTRETIEN (distinctes du contrôle préalable DID)
    // =====================================================

    @Transactional
    public Maintenance creerDemandeEntretien(Maintenance maintenance,
                                             String provenance,
                                             String identiteDemandeur) {
        if (!"CHAUFFEUR".equals(provenance) && !"MECANICIEN_DID".equals(provenance)
                && !"ASSISTANT_DIRECTION".equals(provenance)) {
            throw new IllegalArgumentException("Provenance de la demande invalide.");
        }
        if (maintenance.getVehicule() == null) {
            throw new IllegalArgumentException("Le véhicule est obligatoire.");
        }
        if (maintenance.getNatureIntervention() == null
                || maintenance.getNatureIntervention().isBlank()) {
            throw new IllegalArgumentException("La nature de l'intervention est obligatoire.");
        }
        Long vehiculeId = maintenance.getVehicule().getId();
        Vehicule vehicule = vehiculeRepository.findById(vehiculeId)
                .orElseThrow(() -> new NoSuchElementException("Véhicule introuvable."));
        maintenance.setVehicule(vehicule);
        String statutAvantEntretien = maintenanceRepository
                .findByVehiculeIdAndOrigineDemandeIsNotNullAndStatutIn(
                        vehiculeId, STATUTS_ENTRETIEN_ACTIFS)
                .stream()
                .map(Maintenance::getStatutVehiculeAvantEntretien)
                .filter(statut -> statut != null && !statut.isBlank())
                .findFirst()
                .orElse(vehicule.getStatut());
        maintenance.setStatutVehiculeAvantEntretien(statutAvantEntretien);
        vehicule.setStatut("MAINTENANCE");
        vehiculeRepository.save(vehicule);
        maintenance.setOrigineDemande(provenance);
        maintenance.setDemandeurEntretien(identiteDemandeur);
        maintenance.setStatut(StatutMaintenance.EN_ATTENTE_VALIDATION_ENTRETIEN);
        maintenance.setDateCreation(LocalDateTime.now());
        Maintenance creee = maintenanceRepository.save(maintenance);
        notifier("CHEF_SERVICE_LOGISTIQUE", "DEMANDE_ENTRETIEN", "IMPORTANT",
                "Nouvelle demande d'entretien", reference(creee)
                        + " : demande transmise par " + provenanceLisible(creee)
                        + ". Consultez les détails et validez ou refusez la demande.", creee);
        notifierDirectionsRattacheesEntretien(creee);
        return creee;
    }

    /**
     * Informe les assistantes de direction des autres Directions rattachées
     * au véhicule qu'une demande d'entretien le concerne. La Direction à
     * l'origine de la demande (celle de l'assistant demandeur) est exclue
     * pour ne pas doubler l'information reçue par l'auteur.
     */
    private void notifierDirectionsRattacheesEntretien(Maintenance maintenance) {
        final Vehicule vehicule = maintenance.getVehicule();
        if (vehicule == null) {
            return;
        }
        Long directionAExclure = null;
        if ("ASSISTANT_DIRECTION".equals(maintenance.getOrigineDemande())
                && maintenance.getReservation() != null
                && maintenance.getReservation().getDemandeur() != null) {
            directionAExclure = maintenance.getReservation().getDemandeur().getDirectionId();
        }
        final Long directionExclue = directionAExclure;
        final Long reservationId = maintenance.getReservation() == null
                ? null : maintenance.getReservation().getId();
        final Long vehiculeId = vehicule.getId();
        final String message = reference(maintenance)
                + " : une demande d'entretien a été transmise par "
                + provenanceLisible(maintenance)
                + ". Le véhicule est immobilisé en attendant la validation.";
        final Runnable envoyer = () -> {
            try {
                int destinataires = notificationService.creerPourDirectionsVehiculeIsole(
                        vehicule, directionExclue, "DEMANDE_ENTRETIEN", "IMPORTANT",
                        "Nouvelle demande d'entretien", message,
                        "/assistant-direction", reservationId, null, false).size();
                System.out.println("NOTIFICATION ENTRETIEN -> directions rattachées : "
                        + destinataires + " destinataire(s) pour le véhicule " + vehiculeId);
            } catch (Exception e) {
                System.err.println("Demande d'entretien enregistrée, mais notification aux "
                        + "directions rattachées impossible pour le dossier "
                        + maintenance.getId() + " : " + e.getClass().getSimpleName()
                        + " : " + e.getMessage());
            }
        };
        executerApresCommit(envoyer);
    }

    @Transactional
    public Maintenance deciderDemandeEntretien(UUID id, boolean approuvee,
                                               String motifRefus) {
        Maintenance maintenance = entretien(id);
        if (maintenance.getStatut() != StatutMaintenance.EN_ATTENTE_VALIDATION_ENTRETIEN) {
            throw new IllegalStateException("Cette demande d'entretien n'est plus en attente de décision.");
        }
        if (!approuvee && (motifRefus == null || motifRefus.isBlank())) {
            throw new IllegalArgumentException("Le motif de refus est obligatoire.");
        }
        if (approuvee) {
            maintenance.setStatut(StatutMaintenance.ENTRETIEN_AUTORISE);
        } else {
            maintenance.setStatut(StatutMaintenance.REFUSEE);
            maintenance.setMotifRefusEntretien(motifRefus.trim());
            maintenance.setDateCloture(LocalDateTime.now());
        }
        maintenance.setDateDecisionEntretien(LocalDateTime.now());
        Maintenance sauvegardee = maintenanceRepository.save(maintenance);
        if (!approuvee) restaurerStatutVehicule(sauvegardee);
        if (approuvee) {
            notifier("MECANICIEN_DID", "ENTRETIEN_AUTORISE", "IMPORTANT",
                    "Demande d'entretien validée", reference(sauvegardee)
                            + " : la demande de " + provenanceLisible(sauvegardee)
                            + " est validée. Vous pouvez effectuer l'entretien.", sauvegardee);
        } else {
            // Refus : avertir UNIQUEMENT l'auteur de cette demande.
            // demandeurEntretien = authentication.getName() à la création
            // (matricule du chauffeur ou du mécanicien DID connecté).
            notifierDemandeur(sauvegardee);
        }
        return sauvegardee;
    }

    @Transactional
    public Maintenance terminerEntretien(UUID id, String compteRendu,
                                         String mecanicien) {
        Maintenance maintenance = entretien(id);
        if (maintenance.getStatut() != StatutMaintenance.ENTRETIEN_AUTORISE) {
            throw new IllegalStateException("Seul un entretien autorisé peut être terminé.");
        }
        if (compteRendu == null || compteRendu.isBlank()) {
            throw new IllegalArgumentException("Le compte rendu d'entretien est obligatoire.");
        }
        maintenance.setCompteRenduEntretien(compteRendu.trim());
        maintenance.setMecanicienEntretien(mecanicien);
        maintenance.setStatut(StatutMaintenance.ENTRETIEN_TERMINE);
        Maintenance sauvegardee = maintenanceRepository.save(maintenance);
        notifier("CHEF_SERVICE_LOGISTIQUE", "ENTRETIEN_TERMINE", "SUCCES",
                "Entretien terminé", reference(sauvegardee)
                        + " : le mécanicien DID a terminé l'entretien. Consultez son compte rendu.",
                sauvegardee);
        return sauvegardee;
    }

    @Transactional
    public Maintenance cloturerDemandeEntretien(UUID id) {
        Maintenance maintenance = entretien(id);
        if (maintenance.getStatut() != StatutMaintenance.ENTRETIEN_TERMINE) {
            throw new IllegalStateException("Seul un entretien terminé peut être clôturé par le Chef du Service Logistique.");
        }
        maintenance.setStatut(StatutMaintenance.CLOTUREE);
        maintenance.setDateCloture(LocalDateTime.now());
        Maintenance sauvegardee = maintenanceRepository.save(maintenance);
        // La clôture confirme que la réparation est terminée : une moto qui
        // était panne/indisponible avant l'entretien redevient sélectionnable.
        restaurerStatutVehicule(sauvegardee, true);
        return sauvegardee;
    }

    @Transactional
    public Maintenance annulerDemandeEntretien(UUID id, String motif) {
        Maintenance maintenance = entretien(id);
        if (maintenance.getStatut() != StatutMaintenance.EN_ATTENTE_VALIDATION_ENTRETIEN
                && maintenance.getStatut() != StatutMaintenance.ENTRETIEN_AUTORISE) {
            throw new IllegalStateException("Seule une demande en attente ou en cours peut être annulée.");
        }
        if (motif != null && !motif.isBlank()) {
            maintenance.setMotifRefusEntretien(motif.trim());
        }
        maintenance.setStatut(StatutMaintenance.ENTRETIEN_ANNULE);
        maintenance.setDateCloture(LocalDateTime.now());
        Maintenance sauvegardee = maintenanceRepository.save(maintenance);
        restaurerStatutVehicule(sauvegardee);
        notifierDemandeur(sauvegardee, true);
        return sauvegardee;
    }

    // =====================================================
    // FICHE DE CONTROLE VEHICULE
    // =====================================================

    @Transactional
    public Maintenance sauvegarderFicheControle(UUID id, String ficheControle) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Maintenance introuvable."));
        maintenance.setFicheControle(ficheControle);
        return maintenanceRepository.save(maintenance);
    }

    @Transactional
    public Maintenance controlerAvantMission(UUID id, String ficheControle, String mecanicien) {
        if (ficheControle == null || ficheControle.isBlank()) {
            throw new IllegalArgumentException("Les données de la fiche de contrôle sont obligatoires.");
        }
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Maintenance introuvable."));
        if (maintenance.getStatut() != StatutMaintenance.EN_ATTENTE_AVIS_DID) {
            throw new IllegalStateException("Cette inspection visuelle a déjà été traitée.");
        }
        maintenance.setFicheControle(ficheControle);
        maintenanceRepository.save(maintenance);

        // Le bouton « Contrôle avant mission » enregistre la fiche puis transmet
        // l'avis favorable au Chef Logistique pour la validation N°1.
        return enregistrerAvisDID(
                id,
                "Fiche de contrôle avant mission renseignée.",
                "Contrôle visuel avant mission effectué par le mécanicien DID.",
                "Aucune anomalie bloquante signalée dans la fiche.",
                "FAVORABLE",
                mecanicien
        );
    }

    @Transactional
    public Maintenance controlerApresMission(UUID id, String ficheControle, String mecanicien) {
        if (ficheControle == null || ficheControle.isBlank()) {
            throw new IllegalArgumentException("Les données de la fiche de contrôle sont obligatoires.");
        }
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Maintenance introuvable."));
        if (maintenance.getNatureIntervention() == null
                || !maintenance.getNatureIntervention().toLowerCase().contains("après mission")) {
            throw new IllegalStateException("Ce dossier est une inspection avant mission.");
        }
        if (maintenance.getStatut() != StatutMaintenance.EN_ATTENTE_AVIS_DID) {
            throw new IllegalStateException("Cette inspection d'arrivée a déjà été traitée.");
        }
        maintenance.setFicheControle(ficheControle);
        maintenanceRepository.save(maintenance);
        return enregistrerAvisDID(
                id,
                "Fiche de contrôle après mission renseignée.",
                "Contrôle visuel après mission effectué par le mécanicien DID.",
                "Aucune anomalie bloquante signalée dans la fiche d'arrivée.",
                "FAVORABLE",
                mecanicien
        );
    }

    private void restaurerStatutVehicule(Maintenance maintenance) {
        restaurerStatutVehicule(maintenance, false);
    }

    private void restaurerStatutVehicule(Maintenance maintenance, boolean entretienReussi) {
        Vehicule vehicule = maintenance.getVehicule();
        if (vehicule == null || vehicule.getId() == null) return;

        boolean autreDemandeActive = maintenanceRepository
                .existsByVehiculeIdAndIdNotAndOrigineDemandeIsNotNullAndStatutIn(
                        vehicule.getId(), maintenance.getId(), STATUTS_ENTRETIEN_ACTIFS);
        if (autreDemandeActive) return;

        String statutPrecedent = maintenance.getStatutVehiculeAvantEntretien();
        if (entretienReussi && statutPrecedent != null
                && Set.of("MAINTENANCE", "EN_MAINTENANCE", "EN_PANNE", "INDISPONIBLE")
                .contains(statutPrecedent.trim().toUpperCase())) {
            statutPrecedent = "DISPONIBLE";
        }
        if ("EN_MISSION".equalsIgnoreCase(statutPrecedent)) {
            boolean missionActive = reservationRepository
                    .existsByVehiculeIdAndStatutIn(vehicule.getId(), Set.of("VALIDEE", "PLANIFIEE"));
            boolean affectationActive = affectationRepository.findByVehiculeId(vehicule.getId())
                    .stream()
                    .anyMatch(affectation -> "ACTIVE".equalsIgnoreCase(affectation.getStatut()));
            if (!missionActive && !affectationActive) statutPrecedent = "DISPONIBLE";
        }
        vehicule.setStatut(statutPrecedent == null || statutPrecedent.isBlank()
                ? "DISPONIBLE" : statutPrecedent);
        vehiculeRepository.save(vehicule);
    }

    @Transactional
    public void synchroniserStatutApresMission(Vehicule vehicule) {
        if (vehicule == null || vehicule.getId() == null) return;
        String statut = vehicule.getStatut() == null ? "" : vehicule.getStatut().trim();
        if (Set.of("HORS_SERVICE", "TRANSFERE", "REFORME", "INDISPONIBLE", "REQUISITIONNE", "EN_PANNE").contains(statut.toUpperCase())) return;

        boolean entretienActif = maintenanceRepository
                .existsByVehiculeIdAndOrigineDemandeIsNotNullAndStatutIn(
                        vehicule.getId(), STATUTS_ENTRETIEN_ACTIFS);
        vehicule.setStatut(entretienActif ? "MAINTENANCE" : "DISPONIBLE");
        vehiculeRepository.save(vehicule);
    }

    private Maintenance entretien(UUID id) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Entretien introuvable : " + id));
        boolean periodique = maintenance.getNatureIntervention() != null
                && maintenance.getNatureIntervention().startsWith(
                        com.vehicule.Spat.vehicule.spat_backend.service.EntretienPeriodiqueService.PREFIXE_PERIODIQUE);
        if ((maintenance.getOrigineDemande() == null || maintenance.getOrigineDemande().isBlank()) && !periodique) {
            throw new IllegalStateException("Ce dossier relève du circuit d'avis DID existant.");
        }
        return maintenance;
    }

    private String provenanceLisible(Maintenance m) {
        return switch (String.valueOf(m.getOrigineDemande()).toUpperCase()) {
            case "CHAUFFEUR" -> "chauffeur";
            case "ASSISTANT_DIRECTION" -> "Assistant de direction";
            default -> "mécanicien DID";
        };
    }

    private String reference(Maintenance m) {
        String ticket = m.getReservation() != null
                ? "Ticket TKT-" + String.format("%05d", m.getReservation().getId())
                : "Dossier d'entretien " + m.getId();
        return ticket + " — véhicule " + (m.getVehicule() != null
                ? m.getVehicule().getImmatriculation() : "non renseigné");
    }

    /**
     * Le refus retourne au demandeur nominatif, et non à tous les chauffeurs
     * ou à tous les mécaniciens. L'envoi a lieu APRES le commit de la décision.
     */
    private void notifierDemandeur(Maintenance maintenance) {
        notifierDemandeur(maintenance, false);
    }

    private void notifierDemandeur(Maintenance maintenance, boolean annulation) {
        final String matricule = maintenance.getDemandeurEntretien() == null
                ? "" : maintenance.getDemandeurEntretien().trim();
        if (matricule.isEmpty()) {
            System.err.println("NOTIFICATION REFUS ENTRETIEN : demandeur absent pour le dossier "
                    + maintenance.getId());
            return;
        }

        final String lien = "MECANICIEN_DID".equals(maintenance.getOrigineDemande())
                ? "/mecanicien-did"
                : "ASSISTANT_DIRECTION".equals(maintenance.getOrigineDemande())
                ? "/assistant-direction" : "/chauffeur";
        final Long reservationId = maintenance.getReservation() == null
                ? null : maintenance.getReservation().getId();
        final Long vehiculeId = maintenance.getVehicule() == null
                ? null : maintenance.getVehicule().getId();
        final String message = reference(maintenance)
                + (annulation
                ? " : votre demande d'entretien a été annulée par le Chef du Service Logistique. Motif : "
                : " : votre demande d'entretien a été refusée par le Chef du Service Logistique. Motif : ")
                + (maintenance.getMotifRefusEntretien() == null ? "Non renseigné." : maintenance.getMotifRefusEntretien());
        final String type = annulation ? "ENTRETIEN_ANNULE" : "ENTRETIEN_REFUSE";
        final String titre = annulation
                ? "Votre demande d'entretien a été annulée"
                : "Votre demande d'entretien a été refusée";

        final Runnable envoyer = () -> {
            try {
                notificationService.creerPourMatriculeIsole(
                        matricule, type, "IMPORTANT",
                        titre, message,
                        lien, reservationId, null, vehiculeId, true);
                System.out.println("NOTIFICATION DECISION ENTRETIEN -> demandeur du dossier "
                        + maintenance.getId() + " : notification créée.");
            } catch (Exception e) {
                System.err.println("Décision d'entretien enregistrée, mais notification "
                        + "au demandeur impossible pour le dossier " + maintenance.getId()
                        + " : " + e.getClass().getSimpleName() + " : " + e.getMessage());
            }
        };
        executerApresCommit(envoyer);
    }

    private void executerApresCommit(Runnable action) {
        if (TransactionSynchronizationManager.isActualTransactionActive()
                && TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            action.run();
                        }
                    });
        } else {
            action.run();
        }
    }

    /**
     * Notifier APRES la validation de la transaction qui cree ou modifie
     * le dossier d'entretien. Les notifications sont enregistrees dans des
     * transactions independantes : une erreur d'email ou de notification
     * ne doit pas annuler la demande du chauffeur ou son signalement.
     */
    private void notifier(String role, String type, String niveau,
                          String titre, String message, Maintenance maintenance) {
        final String lien = "CHEF_SERVICE_LOGISTIQUE".equals(role)
                ? "/chef-service-logistique" : "/mecanicien-did";
        final Long ticketId = maintenance.getReservation() == null
                ? null : maintenance.getReservation().getId();
        // Maintenance.id est un UUID ; Notification.maintenanceId est un Long.
        final Long vehiculeId = maintenance.getVehicule() == null
                ? null : maintenance.getVehicule().getId();

        final Runnable envoyerNotification = () -> {
            try {
                int destinataires = notificationService.creerPourRoleIsole(
                        role, type, niveau, titre, message, lien,
                        ticketId, null, vehiculeId, true).size();
                System.out.println("NOTIFICATION ENTRETIEN -> " + role
                        + " : " + destinataires + " destinataire(s) pour " + titre);
                if (destinataires == 0) {
                    System.err.println("Aucune notification remise au role " + role
                            + " : verifier les utilisateurs actifs et les erreurs en console.");
                }
            } catch (Exception e) {
                System.err.println("Entretien enregistre mais notification impossible pour "
                        + role + " : " + e.getMessage());
            }
        };

        executerApresCommit(envoyerNotification);
    }

    // =====================================================
    // LISTE POUR MECANICIEN DID
    // =====================================================

    public List<Maintenance> listerEnAttenteAvis() {

        return maintenanceRepository.findByStatut(
                StatutMaintenance.EN_ATTENTE_AVIS_DID
        );
    }

    // =====================================================
    // LISTE DE TOUTES LES MAINTENANCES
    // =====================================================

    public List<Maintenance> listerToutes() {

        return maintenanceRepository.findAll();
    }

    // =====================================================
    // AVIS MECANICIEN DID
    // =====================================================

    public Maintenance enregistrerAvisDID(

            UUID id,

            String diagnosticVisuel,

            String observations,

            String piecesNecessaires,

            String decision,

            String emailMecanicien

    ) {

        Maintenance maintenance =
                maintenanceRepository.findById(id)
                        .orElseThrow(
                                () -> new NoSuchElementException(
                                        "Maintenance introuvable : "
                                                + id
                                )
                        );

        if (
                maintenance.getStatut()
                        != StatutMaintenance.EN_ATTENTE_AVIS_DID
        ) {

            throw new IllegalStateException(
                    "Cette demande DID a déjà été traitée."
            );
        }

        maintenance.setDiagnosticVisuel(
                diagnosticVisuel
        );

        maintenance.setObservationsMecanicien(
                observations
        );

        maintenance.setPiecesNecessaires(
                piecesNecessaires
        );

        maintenance.setDecisionDID(
                decision
        );

        maintenance.setMecanicienEmail(
                emailMecanicien
        );

        maintenance.setDateAvisDID(
                LocalDateTime.now()
        );

        // -------------------------------------------------
        // DECISION DID
        // -------------------------------------------------

        if (
                "FAVORABLE".equalsIgnoreCase(
                        decision
                )
        ) {

            maintenance.setStatut(
                    StatutMaintenance.EN_ATTENTE_VALIDATION_N1
            );

        } else {

            maintenance.setStatut(
                    StatutMaintenance.AVIS_DEFAVORABLE_DID
            );
        }

        // L'avis doit etre enregistre avant de notifier les destinataires.
        // On conserve le workflow des statuts existant.
        Maintenance sauvegardee = maintenanceRepository.save(
                maintenance
        );

        // -------------------------------------------------
        // NOTIFICATION DID -> CHEF DU SERVICE LOGISTIQUE
        // -------------------------------------------------
        // Maintenance.id est un UUID, tandis que le champ maintenanceId
        // des notifications est un Long : ne pas convertir cet UUID.
        // Le ticket lie (s'il existe) est transmis via reservationId.
        // Une panne de notification/email ne doit pas annuler l'avis DID.
        try {
            Long ticketId = sauvegardee.getReservation() != null
                    ? sauvegardee.getReservation().getId()
                    : null;

            Long vehiculeId = sauvegardee.getVehicule() != null
                    ? sauvegardee.getVehicule().getId()
                    : null;

            String reference = ticketId != null
                    ? "Ticket TKT-" + String.format("%05d", ticketId)
                    : "Dossier d'entretien " + sauvegardee.getId();

            String immatriculation = sauvegardee.getVehicule() != null
                    && sauvegardee.getVehicule().getImmatriculation() != null
                    ? sauvegardee.getVehicule().getImmatriculation()
                    : "vehicule non renseigne";

            boolean favorable = "FAVORABLE".equalsIgnoreCase(decision);

            String titre = favorable
                    ? "Avis DID favorable recu"
                    : "Avis DID defavorable recu";

            String message = reference
                    + " — vehicule " + immatriculation
                    + " : le mecanicien DID a enregistre un avis "
                    + (favorable ? "favorable" : "defavorable")
                    + (favorable
                    ? (sauvegardee.getNatureIntervention() != null && sauvegardee.getNatureIntervention().toLowerCase().contains("après mission")
                        ? ". L'inspection d'arrivée peut passer à la clôture définitive."
                        : ". Le dossier peut passer a la validation N°1.")
                    : ". Consultez le diagnostic avant toute decision.");

            var notifications = notificationService.creerPourRole(
                    "CHEF_SERVICE_LOGISTIQUE",
                    "AVIS_DID",
                    "IMPORTANT",
                    titre,
                    message,
                    "/chef-service-logistique",
                    ticketId,
                    null, // Maintenance utilise UUID; Notification.maintenanceId est Long.
                    vehiculeId,
                    true
            );

            System.out.println(
                    "NOTIFICATION AVIS DID -> " + reference
                            + " -> " + notifications.size()
                            + " destinataire(s) CHEF_SERVICE_LOGISTIQUE"
            );

        } catch (Exception e) {
            System.err.println(
                    "AVIS DID ENREGISTRE MAIS NOTIFICATION IMPOSSIBLE : "
                            + sauvegardee.getId() + " : " + e.getMessage()
            );
        }

        return sauvegardee;
    }

    // =====================================================
    // VALIDATION N1
    // CHEF SERVICE LOGISTIQUE
    // =====================================================

    public Maintenance validerN1(
            UUID id
    ) {

        Maintenance maintenance =
                maintenanceRepository.findById(id)
                        .orElseThrow(
                                () -> new NoSuchElementException(
                                        "Maintenance introuvable : "
                                                + id
                                )
                        );

        if (
                maintenance.getStatut()
                        != StatutMaintenance.EN_ATTENTE_VALIDATION_N1
        ) {

            throw new IllegalStateException(
                    "La validation N1 n'est pas autorisee."
            );
        }

        maintenance.setStatut(
                StatutMaintenance.VALIDATION_N1_LOGISTIQUE
        );

        return maintenanceRepository.save(
                maintenance
        );
    }

    // =====================================================
    // VALIDATION N2
    // CHEF DGAL
    // =====================================================

    public Maintenance validerN2(
            UUID id
    ) {

        Maintenance maintenance =
                maintenanceRepository.findById(id)
                        .orElseThrow(
                                () -> new NoSuchElementException(
                                        "Maintenance introuvable : "
                                                + id
                                )
                        );

        if (
                maintenance.getStatut()
                        != StatutMaintenance.VALIDATION_N1_LOGISTIQUE
        ) {

            throw new IllegalStateException(
                    "La validation N2 n'est pas autorisee."
            );
        }

        maintenance.setStatut(
                StatutMaintenance.VALIDATION_N2_DGAL
        );

        return maintenanceRepository.save(
                maintenance
        );
    }

    // =====================================================
    // VALIDATION FINALE
    // =====================================================

    public Maintenance validerDefinitivement(
            UUID id
    ) {

        Maintenance maintenance =
                maintenanceRepository.findById(id)
                        .orElseThrow(
                                () -> new NoSuchElementException(
                                        "Maintenance introuvable : "
                                                + id
                                )
                        );

        if (
                maintenance.getStatut()
                        != StatutMaintenance.VALIDATION_N2_DGAL
        ) {

            throw new IllegalStateException(
                    "La validation finale n'est pas autorisee."
            );
        }

        maintenance.setStatut(
                StatutMaintenance.VALIDEE
        );

        return maintenanceRepository.save(
                maintenance
        );
    }

    // =====================================================
    // CHANGEMENT STATUT MANUEL CONTROLE
    // =====================================================

    public Maintenance changerStatut(

            UUID id,

            StatutMaintenance nouveauStatut

    ) {

        Maintenance maintenance =
                maintenanceRepository.findById(id)
                        .orElseThrow(
                                () -> new NoSuchElementException(
                                        "Maintenance introuvable : "
                                                + id
                                )
                        );

        if (maintenance.getOrigineDemande() != null
                && !maintenance.getOrigineDemande().isBlank()) {
            throw new IllegalStateException(
                    "Une demande d'entretien doit suivre son circuit de validation et de clôture.");
        }

        if (
                nouveauStatut
                        == StatutMaintenance.CLOTUREE
        ) {

            maintenance.setDateCloture(
                    LocalDateTime.now()
            );
        }

        maintenance.setStatut(
                nouveauStatut
        );

        return maintenanceRepository.save(
                maintenance
        );
    }
}
