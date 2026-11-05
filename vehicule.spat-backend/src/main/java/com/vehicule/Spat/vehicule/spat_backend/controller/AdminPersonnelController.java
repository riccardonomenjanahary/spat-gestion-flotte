package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.PersonnelModification;
import com.vehicule.Spat.vehicule.spat_backend.repository.PersonnelModificationRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/personnels")
public class AdminPersonnelController {
    private final PersonnelModificationRepository repository;

    public AdminPersonnelController(PersonnelModificationRepository repository) {
        this.repository = repository;
    }

    private void verifierSuperAdmin(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(authority -> "ROLE_SUPER_ADMIN".equals(authority.getAuthority()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }

    public record Modification(
            @NotBlank @Size(max = 255) String nom,
            @Size(max = 255) String prenom,
            @Size(max = 255) String direction,
            @Size(max = 255) String poste,
            @Size(max = 255) String categorie,
            @Email @Size(max = 255) String email) {}

    @GetMapping
    public List<PersonnelModification> lister(Authentication authentication) {
        verifierSuperAdmin(authentication);
        return repository.findAll();
    }

    @PutMapping("/{matricule}")
    public PersonnelModification modifier(@PathVariable String matricule,
            @Valid @RequestBody Modification donnees, Authentication authentication) {
        verifierSuperAdmin(authentication);
        verifierMatricule(matricule);
        PersonnelModification personnel = new PersonnelModification();
        personnel.matricule = matricule;
        personnel.nom = donnees.nom().trim();
        personnel.prenom = nettoyer(donnees.prenom());
        personnel.direction = nettoyer(donnees.direction());
        personnel.poste = nettoyer(donnees.poste());
        personnel.categorie = nettoyer(donnees.categorie());
        personnel.email = nettoyer(donnees.email());
        return repository.save(personnel);
    }

    @DeleteMapping("/{matricule}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void supprimer(@PathVariable String matricule, Authentication authentication) {
        verifierSuperAdmin(authentication);
        verifierMatricule(matricule);
        PersonnelModification personnel = repository.findById(matricule).orElseGet(PersonnelModification::new);
        personnel.matricule = matricule;
        personnel.supprime = true;
        repository.save(personnel);
    }

    private void verifierMatricule(String matricule) {
        if (matricule.isBlank() || matricule.length() > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Matricule invalide.");
        }
    }

    private String nettoyer(String valeur) {
        return valeur == null ? "" : valeur.trim();
    }
}
