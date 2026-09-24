package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Maintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.StatutMaintenance;
import com.vehicule.Spat.vehicule.spat_backend.repository.MaintenanceRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.util.UUID;

@Service
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;
    private final NotificationService notificationService;

    public MaintenanceService(
            MaintenanceRepository maintenanceRepository,
            NotificationService notificationService
    ) {
        this.maintenanceRepository = maintenanceRepository;
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
        if (!"CHAUFFEUR".equals(provenance) && !"MECANICIEN_DID".equals(provenance)) {
            throw new IllegalArgumentException("Provenance de la demande invalide.");
        }
        if (maintenance.getVehicule() == null) {
            throw new IllegalArgumentException("Le véhicule est obligatoire.");
        }
        if (maintenance.getNatureIntervention() == null
                || maintenance.getNatureIntervention().isBlank()) {
            throw new IllegalArgumentException("La nature de l'intervention est obligatoire.");
        }
        maintenance.setOrigineDemande(provenance);
        maintenance.setDemandeurEntretien(identiteDemandeur);
        maintenance.setStatut(StatutMaintenance.EN_ATTENTE_VALIDATION_ENTRETIEN);
        maintenance.setDateCreation(LocalDateTime.now());
        Maintenance creee = maintenanceRepository.save(maintenance);
        notifier("CHEF_SERVICE_LOGISTIQUE", "DEMANDE_ENTRETIEN", "IMPORTANT",
                "Nouvelle demande d'entretien", reference(creee)
                        + " : demande transmise par " + provenanceLisible(creee)
                        + ". Consultez les détails et validez ou refusez la demande.", creee);
        return creee;
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
        }
        maintenance.setDateDecisionEntretien(LocalDateTime.now());
        Maintenance sauvegardee = maintenanceRepository.save(maintenance);
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
        maintenance.setDateCloture(LocalDateTime.now());
        maintenance.setStatut(StatutMaintenance.ENTRETIEN_TERMINE);
        Maintenance sauvegardee = maintenanceRepository.save(maintenance);
        notifier("CHEF_SERVICE_LOGISTIQUE", "ENTRETIEN_TERMINE", "SUCCES",
                "Entretien terminé", reference(sauvegardee)
                        + " : le mécanicien DID a terminé l'entretien. Consultez son compte rendu.",
                sauvegardee);
        return sauvegardee;
    }

    private Maintenance entretien(UUID id) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Entretien introuvable : " + id));
        if (maintenance.getOrigineDemande() == null
                || maintenance.getOrigineDemande().isBlank()) {
            throw new IllegalStateException("Ce dossier relève du circuit d'avis DID existant.");
        }
        return maintenance;
    }

    private String provenanceLisible(Maintenance m) {
        return "CHAUFFEUR".equals(m.getOrigineDemande()) ? "chauffeur" : "mécanicien DID";
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
        final String matricule = maintenance.getDemandeurEntretien() == null
                ? "" : maintenance.getDemandeurEntretien().trim();
        if (matricule.isEmpty()) {
            System.err.println("NOTIFICATION REFUS ENTRETIEN : demandeur absent pour le dossier "
                    + maintenance.getId());
            return;
        }

        final String lien = "MECANICIEN_DID".equals(maintenance.getOrigineDemande())
                ? "/mecanicien-did" : "/chauffeur";
        final Long reservationId = maintenance.getReservation() == null
                ? null : maintenance.getReservation().getId();
        final Long vehiculeId = maintenance.getVehicule() == null
                ? null : maintenance.getVehicule().getId();
        final String message = reference(maintenance)
                + " : votre demande d'entretien a été refusée par le Chef du Service Logistique. "
                + "Motif : " + maintenance.getMotifRefusEntretien();

        final Runnable envoyer = () -> {
            try {
                notificationService.creerPourMatriculeIsole(
                        matricule, "ENTRETIEN_REFUSE", "IMPORTANT",
                        "Votre demande d'entretien a été refusée", message,
                        lien, reservationId, null, vehiculeId, true);
                System.out.println("NOTIFICATION REFUS ENTRETIEN -> demandeur du dossier "
                        + maintenance.getId() + " : notification créée.");
            } catch (Exception e) {
                System.err.println("Demande d'entretien refusée et enregistrée, mais notification "
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
                    ? ". Le dossier peut passer a la validation N°1."
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
