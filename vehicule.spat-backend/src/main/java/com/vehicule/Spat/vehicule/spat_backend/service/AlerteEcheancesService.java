package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Assurance;
import com.vehicule.Spat.vehicule.spat_backend.model.Vehicule;
import com.vehicule.Spat.vehicule.spat_backend.repository.AssuranceRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.VehiculeRepository;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Alertes préventives sur les échéances.
 *
 * Alertes J-30, J-15, J-7 sur les échéances d'assurance,
 * de visite technique et d'entretien, adressées au
 * Service Logistique.
 */
@Service
public class AlerteEcheancesService {

    private final VehiculeRepository vehiculeRepository;
    private final AssuranceRepository assuranceRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final NotificationService notificationService;

    public AlerteEcheancesService(
            VehiculeRepository vehiculeRepository,
            AssuranceRepository assuranceRepository,
            UtilisateurRepository utilisateurRepository,
            NotificationService notificationService
    ) {
        this.vehiculeRepository = vehiculeRepository;
        this.assuranceRepository = assuranceRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.notificationService = notificationService;
    }

    /**
     * Vérifie quotidiennement les échéances à venir
     * et envoie les alertes J-30, J-15, J-7.
     */
    @Scheduled(cron = "0 0 7 * * *", zone = "Indian/Antananarivo")
    @Transactional
    public void verifierEcheances() {

        LocalDate today = LocalDate.now(java.time.ZoneId.of("Indian/Antananarivo"));

        int[] alertesJours = {30, 15, 7};

        // =====================================================
        // VISITE TECHNIQUE
        // =====================================================

        List<Vehicule> vehicules = vehiculeRepository.findAll();
        for (Vehicule v : vehicules) {
            if (v.getDateProchainEntretien() != null) {
                for (int j : alertesJours) {
                    if (today.equals(v.getDateProchainEntretien().minusDays(j))) {
                        envoyerAlerteLogistique("ALERTE_ENTRETIEN", "Entretien J-" + j + " — " + v.getImmatriculation(),
                                "L'entretien du véhicule " + v.getImmatriculation() + " est prévu le "
                                        + v.getDateProchainEntretien() + ".", v.getId());
                    }
                }
            }
            if (v.getDateExpirationVisiteTechnique() == null) {
                continue;
            }

            for (int j : alertesJours) {
                LocalDate echeance = v.getDateExpirationVisiteTechnique();
                if (today.equals(echeance.minusDays(j))) {
                    envoyerAlerteLogistique(
                            "ALERTE_VISITE_TECHNIQUE",
                            "⚠️ Visite technique J-" + j + " — " + v.getImmatriculation(),
                            "La visite technique du véhicule " + v.getImmatriculation()
                                    + " expire le " + echeance + " (dans " + j + " jours).",
                            v.getId()
                    );
                }
            }

            // Alerte si déjà expiré
            if (today.isAfter(v.getDateExpirationVisiteTechnique())) {
                envoyerAlerteLogistique(
                        "ALERTE_VISITE_TECHNIQUE",
                        "🔴 Visite technique EXPIREE — " + v.getImmatriculation(),
                        "La visite technique du véhicule " + v.getImmatriculation()
                                + " est expirée depuis le "
                                + v.getDateExpirationVisiteTechnique()
                                + ". Le véhicule ne peut pas être affecté.",
                        v.getId()
                );
            }
        }

        // =====================================================
        // ASSURANCE
        // =====================================================

        List<Assurance> assurances = assuranceRepository.findAll();
        for (Assurance a : assurances) {
            if (a.getDateExpiration() == null) {
                continue;
            }

            for (int j : alertesJours) {
                if (today.equals(a.getDateExpiration().minusDays(j))) {
                    Vehicule v = a.getVehicule();
                    envoyerAlerteLogistique(
                            "ALERTE_ASSURANCE",
                            "⚠️ Assurance J-" + j + " — " + v.getImmatriculation(),
                            "L'assurance (police " + a.getNumeroPolice()
                                    + ") du véhicule " + v.getImmatriculation()
                                    + " expire le " + a.getDateExpiration()
                                    + " (dans " + j + " jours).",
                            v.getId()
                    );
                }
            }
        }
    }

    private void envoyerAlerteLogistique(
            String type,
            String titre,
            String message,
            Long vehiculeId
    ) {
        utilisateurRepository.findByRole("CHEF_SERVICE_LOGISTIQUE")
                .forEach(u -> {
                    try {
                        notificationService.creerNotification(
                                type,
                                "WARNING",
                                titre,
                                message,
                                u.getMatricule(),
                                u.getEmail(),
                                u.getRole(),
                                null,
                                null,
                                null,
                                vehiculeId
                        );
                    } catch (Exception ignored) {
                        // Continuer avec les autres destinataires
                    }
                });
    }
}
