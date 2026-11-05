package com.vehicule.Spat.vehicule.spat_backend.controller;

import com.vehicule.Spat.vehicule.spat_backend.model.ConducteurAutorise;
import com.vehicule.Spat.vehicule.spat_backend.model.Direction;
import com.vehicule.Spat.vehicule.spat_backend.repository.ConducteurAutoriseRepository;
import com.vehicule.Spat.vehicule.spat_backend.repository.DirectionRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.core.io.FileSystemResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.multipart.MultipartFile;
import com.vehicule.Spat.vehicule.spat_backend.service.StockageFichiersService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Gestion des conducteurs autorisés pour les motos
 * électriques.
 *
 * La liste est validée par le Directeur de chaque
 * Direction.
 */
@RestController
@RequestMapping("/api/conducteurs-autorises")
public class ConducteurAutoriseController {

    private final ConducteurAutoriseRepository conducteurRepository;
    private final DirectionRepository directionRepository;
    private final com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository utilisateurs;
    private final com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService acces;
    private final StockageFichiersService stockage;

    @Autowired
    public ConducteurAutoriseController(
            ConducteurAutoriseRepository conducteurRepository,
            DirectionRepository directionRepository,
            com.vehicule.Spat.vehicule.spat_backend.repository.UtilisateurRepository utilisateurs,
            com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService acces,
            StockageFichiersService stockage
    ) {
        this.conducteurRepository = conducteurRepository;
        this.directionRepository = directionRepository;
        this.utilisateurs = utilisateurs;
        this.acces = acces;
        this.stockage = stockage;
    }

    private boolean directionVisible(Long id) {
        var u = acces.courant();
        return Set.of("ADMIN", "SUPER_ADMIN", "CHEF_SERVICE_LOGISTIQUE", "CHEF_DGAL", "CO_ADMIN", "DIRECTEUR_DFP")
                .contains(com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService.role(u))
                || id != null && id.equals(u.getDirectionId());
    }

    /**
     * Liste tous les conducteurs autorisés actifs.
     */
    @GetMapping
    public ResponseEntity<List<ConducteurAutorise>> listerTous() {
        return ResponseEntity.ok(
                conducteurRepository.findByActifTrue().stream()
                        .filter(c -> c.getDirection() != null && directionVisible(c.getDirection().getId())).toList()
        );
    }

    /**
     * Conducteurs autorisés par Direction.
     */
    @GetMapping("/direction/{directionId}")
    public ResponseEntity<List<ConducteurAutorise>> parDirection(
            @PathVariable Long directionId
    ) {
        if (!directionVisible(directionId)) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(
                conducteurRepository.findByDirectionIdAndActifTrue(directionId)
        );
    }

    /**
     * Conducteurs en attente de validation.
     */
    @GetMapping("/en-attente")
    public ResponseEntity<List<ConducteurAutorise>> enAttenteValidation() {
        return ResponseEntity.ok(
                conducteurRepository.findByValideAndActifTrue(false).stream()
                        .filter(c -> c.getDirection() != null && directionVisible(c.getDirection().getId())).toList()
        );
    }

    /**
     * Vérifier si un conducteur est autorisé pour une Direction.
     */
    @GetMapping("/verifier")
    public ResponseEntity<Map<String, Boolean>> verifier(
            @RequestParam String matricule,
            @RequestParam Long directionId
    ) {
        if (!directionVisible(directionId)) return ResponseEntity.status(403).build();
        boolean autorise = conducteurRepository
                .existsByMatriculeAndDirectionIdAndActifTrueAndValideTrue(matricule, directionId);
        return ResponseEntity.ok(Map.of("autorise", autorise));
    }

    /**
     * Ajouter un conducteur à la liste.
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> ajouter(@RequestBody Map<String, Object> body) {
        try {
            var auteur = acces.courant();
            Long directionId = body.get("directionId") != null ? Long.parseLong(body.get("directionId").toString()) : auteur.getDirectionId();
            if (directionId == null) return ResponseEntity.badRequest().body(Map.of("erreur", "Direction du compte non renseignée."));
            boolean administrateur = Set.of("ADMIN", "SUPER_ADMIN").contains(com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService.role(auteur));
            if (!administrateur && !directionId.equals(auteur.getDirectionId())) return ResponseEntity.status(403).build();
            if (!(body.get("matricule") instanceof String matricule) || matricule.isBlank()
                    || !(body.get("nomComplet") instanceof String nom) || nom.isBlank())
                return ResponseEntity.badRequest().body(Map.of("erreur", "Matricule et nom sont obligatoires."));
            if (conducteurRepository.findByMatriculeAndDirectionIdAndActifTrue(matricule.trim(), directionId).isPresent())
                return ResponseEntity.status(409).body(Map.of("erreur", "Ce conducteur figure déjà dans la liste."));
            Direction direction = directionRepository.findById(directionId)
                    .orElseThrow(() -> new RuntimeException("Direction introuvable"));

            ConducteurAutorise conducteur = new ConducteurAutorise();
            conducteur.setMatricule(matricule.trim());
            conducteur.setNomComplet(nom.trim());
            conducteur.setTelephone((String) body.get("telephone"));
            conducteur.setDirection(direction);
            conducteur.setNumeroPermis((String) body.get("numeroPermis"));
            conducteur.setCategoriePermis((String) body.get("categoriePermis"));

            if (body.containsKey("dateExpirationPermis") && body.get("dateExpirationPermis") != null) {
                conducteur.setDateExpirationPermis(
                        LocalDate.parse((String) body.get("dateExpirationPermis"))
                );
            }

            conducteur.setValide(false);
            conducteur.setActif(true);

            ConducteurAutorise saved = conducteurRepository.save(conducteur);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    Map.of("erreur", e.getMessage())
            );
        }
    }

    @GetMapping("/profil")
    public ResponseEntity<?> profil() {
        var auteur = acces.courant();
        if (auteur.getDirectionId() == null) return ResponseEntity.badRequest().body("Direction du compte non renseignée.");
        return directionRepository.findById(auteur.getDirectionId())
                .map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> proposerHabilitation(@RequestParam String nomComplet,
            @RequestParam String poste, @RequestParam(required = false) String matricule,
            @RequestParam("permis") MultipartFile permis) {
        var auteur = acces.courant();
        if (!Set.of("ASSISTANT_DIRECTION", "AGENT_PAR_INTERIM_ASSISTANT").contains(
                com.vehicule.Spat.vehicule.spat_backend.service.AccesParcoursService.role(auteur)))
            return ResponseEntity.status(403).build();
        if (auteur.getDirectionId() == null) return ResponseEntity.badRequest().body("Direction du compte non renseignée.");
        Direction direction = directionRepository.findById(auteur.getDirectionId()).orElse(null);
        if (direction == null) return ResponseEntity.badRequest().body("Direction introuvable.");
        if (nomComplet == null || nomComplet.isBlank() || nomComplet.trim().length() > 200
                || poste == null || poste.isBlank() || poste.trim().length() > 255
                || matricule != null && matricule.trim().length() > 50)
            return ResponseEntity.badRequest().body("Nom, poste ou matricule invalide.");
        try { stockage.verifierFichier(permis); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(e.getMessage()); }
        if (permis.getOriginalFilename().length() > 260)
            return ResponseEntity.badRequest().body("Nom du fichier trop long (260 caractères maximum).");
        String identifiant = matricule == null || matricule.isBlank() ? "MANUEL-" + UUID.randomUUID() : matricule.trim();
        ConducteurAutorise conducteur = conducteurRepository.findByMatriculeAndDirectionId(identifiant, direction.getId())
                .orElseGet(ConducteurAutorise::new);
        if (Boolean.TRUE.equals(conducteur.getValide()) && Boolean.TRUE.equals(conducteur.getActif()))
            return ResponseEntity.status(409).body("Ce conducteur est déjà habilité.");
        if (Boolean.TRUE.equals(conducteur.getActif()) && conducteur.getPermisNomStocke() != null)
            return ResponseEntity.status(409).body("Une demande d’habilitation est déjà en attente pour ce conducteur.");
        String ancienPermis = conducteur.getPermisNomStocke();
        String nomStocke = stockage.stocker(permis);
        conducteur.setMatricule(identifiant);
        conducteur.setNomComplet(nomComplet.trim());
        conducteur.setPoste(poste.trim());
        conducteur.setDirection(direction);
        conducteur.setPermisNomFichier(org.springframework.util.StringUtils.cleanPath(permis.getOriginalFilename()).replace('\\', '/').replaceAll("^.*/", ""));
        conducteur.setPermisNomStocke(nomStocke);
        conducteur.setPermisContentType(permis.getContentType());
        conducteur.setValide(false);
        conducteur.setActif(true);
        conducteur.setValidePar(null);
        conducteur.setDateValidation(null);
        try {
            ConducteurAutorise saved = conducteurRepository.saveAndFlush(conducteur);
            stockage.supprimer(ancienPermis);
            return ResponseEntity.ok(saved);
        } catch (RuntimeException e) {
            stockage.supprimer(nomStocke);
            throw e;
        }
    }

    @GetMapping("/{id}/permis")
    public ResponseEntity<?> permis(@PathVariable Long id) {
        ConducteurAutorise conducteur = conducteurRepository.findById(id).orElse(null);
        if (conducteur == null || conducteur.getPermisNomStocke() == null) return ResponseEntity.notFound().build();
        if (conducteur.getDirection() == null || !directionVisible(conducteur.getDirection().getId()))
            return ResponseEntity.status(403).build();
        var chemin = stockage.resoudreChemin(conducteur.getPermisNomStocke());
        if (!java.nio.file.Files.isRegularFile(chemin)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(conducteur.getPermisContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, org.springframework.http.ContentDisposition.attachment()
                        .filename(conducteur.getPermisNomFichier(), java.nio.charset.StandardCharsets.UTF_8).build().toString())
                .body(new FileSystemResource(chemin));
    }

    /**
     * Valider un conducteur (par le Directeur).
     */
    @PutMapping("/{id}/valider")
    public ResponseEntity<?> valider(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        try {
            ConducteurAutorise conducteur = conducteurRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Conducteur introuvable"));

            String matricule = org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication().getName();
            var directeur = utilisateurs.findByMatricule(matricule).orElse(null);
            if (directeur == null || !directeur.isActif() || directeur.getRole() == null
                    || !Set.of("CHEF_DIRECTION", "AGENT_PAR_INTERIM_CHEF").contains(directeur.getRole().replaceFirst("^ROLE_", ""))
                    || directeur.getDirectionId() == null || conducteur.getDirection() == null
                    || !directeur.getDirectionId().equals(conducteur.getDirection().getId()))
                return ResponseEntity.status(403).body(Map.of("erreur", "Seul le Directeur de la Direction concernée peut valider ce conducteur."));

            if (!Boolean.TRUE.equals(conducteur.getActif()) || conducteur.getPermisNomStocke() == null)
                return ResponseEntity.badRequest().body(Map.of("erreur", "Un permis doit être déposé avant la validation."));
            if (Boolean.TRUE.equals(conducteur.getValide())) return ResponseEntity.ok(conducteur);

            conducteur.setValide(true);
            conducteur.setValidePar(matricule);
            conducteur.setDateValidation(LocalDateTime.now());

            conducteurRepository.save(conducteur);
            return ResponseEntity.ok(conducteur);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    Map.of("erreur", e.getMessage())
            );
        }
    }

    /**
     * Désactiver un conducteur.
     */
    @PutMapping("/{id}/desactiver")
    public ResponseEntity<?> desactiver(@PathVariable Long id) {
        try {
            ConducteurAutorise conducteur = conducteurRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Conducteur introuvable"));
            if (conducteur.getDirection() == null || !directionVisible(conducteur.getDirection().getId()))
                return ResponseEntity.status(403).build();

            conducteur.setActif(false);
            conducteurRepository.save(conducteur);
            return ResponseEntity.ok(conducteur);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    Map.of("erreur", e.getMessage())
            );
        }
    }
}
