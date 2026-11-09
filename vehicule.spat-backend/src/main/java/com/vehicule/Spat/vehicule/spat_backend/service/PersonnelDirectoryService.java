package com.vehicule.Spat.vehicule.spat_backend.service;

import com.vehicule.Spat.vehicule.spat_backend.model.Direction;
import com.vehicule.Spat.vehicule.spat_backend.repository.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import java.text.Normalizer;
import java.util.*;

@Service
public class PersonnelDirectoryService {
    public record Personnel(String matricule, String nom, String prenom, String direction,
                            String poste, String categorie, String email) {}
    private final List<Personnel> source;
    private final PersonnelModificationRepository modifications;
    private final DirectionRepository directions;
    private final UtilisateurRepository utilisateurs;

    public PersonnelDirectoryService(PersonnelModificationRepository modifications, DirectionRepository directions,
                                     UtilisateurRepository utilisateurs) {
        this.modifications = modifications;
        this.directions = directions;
        this.utilisateurs = utilisateurs;
        try (var entree = new ClassPathResource("data/personnels.json").getInputStream()) {
            source = List.of(JsonMapper.builder().build().readValue(entree, Personnel[].class));
        } catch (Exception e) {
            throw new IllegalStateException("Le répertoire initial du personnel ne peut pas être chargé.", e);
        }
    }

    @Transactional(readOnly = true)
    public List<Personnel> pourDirection(Long directionId) {
        if (directionId == null) return List.of();
        Direction direction = directions.findById(directionId).orElse(null);
        if (direction == null || !direction.isActif()) return List.of();
        Map<String, Personnel> catalogue = new LinkedHashMap<>();
        source.forEach(p -> catalogue.put(p.matricule().trim(), p));
        for (var correction : modifications.findAll()) {
            if (correction.supprime) catalogue.remove(correction.matricule.trim());
            else catalogue.put(correction.matricule.trim(), new Personnel(correction.matricule.trim(),
                    texte(correction.nom), texte(correction.prenom), texte(correction.direction),
                    texte(correction.poste), texte(correction.categorie), texte(correction.email)));
        }
        Map<String, String> emails = new HashMap<>();
        utilisateurs.findAll().stream().filter(u -> directionId.equals(u.getDirectionId()) && u.getEmail() != null)
                .forEach(u -> emails.put(texte(u.getMatricule()), u.getEmail().trim()));
        return catalogue.values().stream().filter(p -> appartientDirection(p.direction(), direction))
                .map(p -> new Personnel(p.matricule(), p.nom(), p.prenom(), p.direction(), p.poste(), p.categorie(),
                        texte(p.email()).isBlank() ? emails.getOrDefault(p.matricule(), "") : p.email()))
                .toList();
    }

    public static boolean appartientDirection(String libelle, Direction direction) {
        if (direction == null) return false;
        String valeur = normaliser(libelle);
        if (valeur.isEmpty()) return false;
        if (valeur.equals(normaliser(direction.getCode())) || valeur.equals(normaliser(direction.getNom()))) return true;
        List<String> alias = switch (normaliser(direction.getCode())) {
            case "DG" -> List.of("DIR GENERALE", "DIRECTION GENERALE");
            case "AUDIT" -> List.of("DIR AUDIT ET GESTION RISQUES", "DIRECTION AUDIT ET GESTION DES RISQUES");
            case "DAJ" -> List.of("DIR AFFAIRES JURIDIQUES");
            case "DIRCAP" -> List.of("DIR CAP", "DIRECTION DE LA CAPITAINERIE");
            case "DID" -> List.of("DIR INFRASTRUCTURE ET DVPT", "DIR INFRASTRUCTURE ET DEVELOPPEMENT");
            case "MARKETING" -> List.of("DIR MARKETING");
            case "DIREX" -> List.of("DIR EXPLOITATION", "DIR EXPLOITATIONS");
            case "DFP" -> List.of("DIR FINANCIERE ET PERFORMANCE");
            case "DRH" -> List.of("DIR RESSOURCES HUMAINES");
            case "DDI" -> List.of("DIR DIGITALISATION INNOVATION", "DIR DIGITALISATION ET INNOVATION");
            case "SG" -> List.of("SECRETAIRE GENERAL", "SECRETARIAT GENERAL");
            case "DMC" -> List.of("DIR MARKETING ET COMMUNICATION");
            case "DAGR" -> List.of("DIR AFFAIRES GENERALES");
            default -> List.of();
        };
        return alias.stream().map(PersonnelDirectoryService::normaliser).anyMatch(valeur::equals);
    }

    private static String texte(String valeur) { return valeur == null ? "" : valeur.trim(); }
    private static String normaliser(String valeur) {
        return Normalizer.normalize(texte(valeur), Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "");
    }
}
