package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.FicheSurete;
import com.vehicule.Spat.vehicule.spat_backend.model.Utilisateur;
import com.vehicule.Spat.vehicule.spat_backend.repository.FicheSureteRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository;
import com.vehicule.Spat.vehicule.spat_backend.service.StockageFichiersService;

import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// =========================================================
// CONTROLEUR FICHES SURETE
// =========================================================
//
// L'Agent de sûreté transmet le PDF de la fiche de bord à
// la clôture d'une intervention ; le Chef DGAL les consulte
// (droits définis dans SecurityConfig).

@RestController
@RequestMapping("/api/fiches-surete")
public class FicheSureteController {

    private final FicheSureteRepository ficheSureteRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final StockageFichiersService stockageFichiersService;

    public FicheSureteController(
            FicheSureteRepository ficheSureteRepository,
            UtilisateurRepository utilisateurRepository,
            StockageFichiersService stockageFichiersService
    ) {
        this.ficheSureteRepository = ficheSureteRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.stockageFichiersService = stockageFichiersService;
    }

    @PostMapping
    public ResponseEntity<?> deposer(
            @RequestParam("fichier") MultipartFile fichier,
            @RequestParam(value = "mission", required = false) String mission,
            @RequestParam(value = "immatriculation", required = false) String immatriculation,
            @RequestParam(value = "debut", required = false) String debut,
            @RequestParam(value = "clotureeLe", required = false) String clotureeLe,
            Authentication authentication
    ) {
        Utilisateur agent = utilisateurRepository
                .findByMatricule(authentication.getName())
                .orElse(null);

        if (agent == null) {
            return ResponseEntity.status(401).body("Utilisateur introuvable.");
        }

        try {
            stockageFichiersService.verifierFichier(fichier);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }

        if (!MediaType.APPLICATION_PDF_VALUE.equalsIgnoreCase(fichier.getContentType())) {
            return ResponseEntity.badRequest().body("La fiche de bord doit être un PDF.");
        }

        FicheSurete fiche = new FicheSurete();
        fiche.setMission(tronquer(mission, 20));
        fiche.setImmatriculation(tronquer(immatriculation, 40));
        fiche.setDebut(tronquer(debut, 30));
        fiche.setClotureeLe(tronquer(clotureeLe, 30));
        fiche.setNomFichier(tronquer(fichier.getOriginalFilename(), 260));
        fiche.setTailleOctets(fichier.getSize());
        fiche.setContentType(fichier.getContentType());
        fiche.setDeposePar(agent);
        fiche.setDateDepot(LocalDateTime.now());
        fiche.setNomStocke(stockageFichiersService.stocker(fichier));

        return ResponseEntity.ok(vue(ficheSureteRepository.save(fiche)));
    }

    @GetMapping
    public List<Map<String, Object>> lister() {
        return ficheSureteRepository.findAllByOrderByDateDepotDesc()
                .stream()
                .map(this::vue)
                .toList();
    }

    @GetMapping("/profil")
    public ResponseEntity<?> profil(Authentication authentication) {
        Utilisateur agent = utilisateurRepository.findByMatricule(authentication.getName()).orElse(null);
        if (agent == null) return ResponseEntity.status(401).body("Utilisateur introuvable.");
        return ResponseEntity.ok(Map.of(
                "nomComplet", agent.getNomComplet() == null ? "" : agent.getNomComplet(),
                "matricule", agent.getMatricule() == null ? "" : agent.getMatricule()
        ));
    }

    @GetMapping("/{id}/contenu")
    public ResponseEntity<?> contenu(@PathVariable Long id) {
        FicheSurete fiche = ficheSureteRepository.findById(id).orElse(null);

        if (fiche == null) {
            return ResponseEntity.notFound().build();
        }

        Path chemin = stockageFichiersService.resoudreChemin(fiche.getNomStocke());

        if (!Files.exists(chemin)) {
            return ResponseEntity.notFound().build();
        }

        String nomTelecharge = URLEncoder
                .encode(fiche.getNomFichier(), StandardCharsets.UTF_8)
                .replace("+", "%20");

        return ResponseEntity
                .ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename*=UTF-8''" + nomTelecharge)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new FileSystemResource(chemin.toFile()));
    }

    private Map<String, Object> vue(FicheSurete fiche) {
        Map<String, Object> vue = new LinkedHashMap<>();
        vue.put("id", fiche.getId());
        vue.put("mission", fiche.getMission());
        vue.put("immatriculation", fiche.getImmatriculation());
        vue.put("debut", fiche.getDebut());
        vue.put("clotureeLe", fiche.getClotureeLe());
        vue.put("nomFichier", fiche.getNomFichier());
        vue.put("tailleOctets", fiche.getTailleOctets());
        vue.put("deposeParNom", fiche.getDeposePar() == null ? null : fiche.getDeposePar().getNomComplet());
        vue.put("dateDepot", fiche.getDateDepot());
        return vue;
    }

    private static String tronquer(String valeur, int max) {
        if (valeur == null) return null;
        String propre = valeur.trim();
        return propre.length() > max ? propre.substring(0, max) : propre;
    }
}
