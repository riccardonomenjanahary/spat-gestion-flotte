package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Maintenance;
import com.vehicule.Spat.vehicule.spat_backend.model.StatutMaintenance;
import com.vehicule.Spat.vehicule.spat_backend.repository.MaintenanceRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;

    public MaintenanceService(MaintenanceRepository maintenanceRepository) {
        this.maintenanceRepository = maintenanceRepository;
    }

    public Maintenance creer(Maintenance maintenance) {
        maintenance.setStatut(StatutMaintenance.EN_ATTENTE_AVIS_DID);
        maintenance.setDateCreation(LocalDateTime.now());
        return maintenanceRepository.save(maintenance);
    }

    public List<Maintenance> listerEnAttenteAvis() {
        return maintenanceRepository.findByStatut(StatutMaintenance.EN_ATTENTE_AVIS_DID);
    }

    public List<Maintenance> listerToutes() {
        return maintenanceRepository.findAll();
    }

    // --- RG-02 : le mécanicien enregistre son avis, ce qui débloque le passage à PLANIFIEE ---
    public Maintenance enregistrerAvis(UUID id, String avisTexte, String auteurEmail) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Maintenance introuvable : " + id));

        if (maintenance.getStatut() != StatutMaintenance.EN_ATTENTE_AVIS_DID) {
            throw new IllegalStateException("Cette maintenance n'est plus en attente d'avis.");
        }

        maintenance.setAvisTexte(avisTexte);
        maintenance.setAvisAuteurEmail(auteurEmail);
        maintenance.setAvisDate(LocalDateTime.now());
        maintenance.setStatut(StatutMaintenance.PLANIFIEE);

        return maintenanceRepository.save(maintenance);
    }

    // --- Garde RG-02 : personne, même ADMIN, ne peut forcer PLANIFIEE sans avis ---
    public Maintenance changerStatut(UUID id, StatutMaintenance nouveauStatut) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Maintenance introuvable : " + id));

        if (nouveauStatut == StatutMaintenance.PLANIFIEE && maintenance.getAvisTexte() == null) {
            throw new IllegalStateException("Impossible de planifier : l'avis du mécanicien diagnostiqueur n'a pas encore été enregistré.");
        }

        if (nouveauStatut == StatutMaintenance.CLOTUREE) {
            maintenance.setDateCloture(LocalDateTime.now());
        }

        maintenance.setStatut(nouveauStatut);
        return maintenanceRepository.save(maintenance);
    }
}
