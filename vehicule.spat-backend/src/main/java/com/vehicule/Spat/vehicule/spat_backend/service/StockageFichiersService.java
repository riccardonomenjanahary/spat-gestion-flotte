package com.vehicule.Spat.vehicule.spat_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

// =========================================================
// SERVICE DE STOCKAGE DES FICHIERS
// =========================================================
//
// Stockage local simple dans le répertoire app.uploads.dir
// (par défaut ./uploads). Chaque fichier reçoit un nom
// technique unique (UUID) afin d'éviter les collisions et
// les chemins traversants ; l'extension d'origine est
// conservée pour le téléchargement.

@Service
public class StockageFichiersService {

    // Extensions et types MIME acceptés (PDF, images).
    private static final Set<String> EXTENSIONS_AUTORISEES =
            Set.of("pdf", "jpg", "jpeg", "png");

    private static final Set<String> TYPES_MIME_AUTORISES =
            Set.of(
                    "application/pdf",
                    "image/jpeg",
                    "image/png"
            );

    // 15 Mo maximum, cohérent avec la limite multipart.
    private static final long TAILLE_MAX_OCTETS = 15L * 1024 * 1024;

    private final Path repertoireStockage;

    public StockageFichiersService(
            @Value("${app.uploads.dir:./uploads}") String dossierUploads
    ) {
        this.repertoireStockage = Paths.get(dossierUploads).toAbsolutePath().normalize();
    }

    public Path getRepertoireStockage() {
        return repertoireStockage;
    }

    // =========================================================
    // VALIDATION
    // =========================================================

    public void verifierFichier(MultipartFile fichier) {
        if (fichier == null || fichier.isEmpty()) {
            throw new IllegalArgumentException("Aucun fichier fourni.");
        }

        if (fichier.getSize() > TAILLE_MAX_OCTETS) {
            throw new IllegalArgumentException(
                    "Fichier trop volumineux (15 Mo maximum)."
            );
        }

        String nomOriginal = fichier.getOriginalFilename();

        if (nomOriginal == null || nomOriginal.isBlank()) {
            throw new IllegalArgumentException("Nom de fichier invalide.");
        }

        // Nom technique sans aucun chemin : on ne garde
        // que le dernier segment du nom fourni par le client.
        String segment = nomOriginal.replace("\\", "/");
        segment = segment.substring(segment.lastIndexOf('/') + 1);

        if (segment.isBlank()) {
            throw new IllegalArgumentException("Nom de fichier invalide.");
        }

        String extension = extraireExtension(segment);

        if (!EXTENSIONS_AUTORISEES.contains(extension)) {
            throw new IllegalArgumentException(
                    "Format non autorisé (PDF, JPG ou PNG uniquement) : ." + extension
            );
        }

        String typeMime = fichier.getContentType();

        if (typeMime == null
                || !TYPES_MIME_AUTORISES.contains(typeMime.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException(
                    "Type de contenu non autorisé (PDF, JPG ou PNG uniquement)."
            );
        }
    }

    // =========================================================
    // STOCKAGE
    // =========================================================

    public String stocker(MultipartFile fichier) {
        try {
            Files.createDirectories(repertoireStockage);

            String nomOriginal = fichier.getOriginalFilename();
            String segment = nomOriginal.replace("\\", "/");
            segment = segment.substring(segment.lastIndexOf('/') + 1);

            String extension = extraireExtension(segment);
            String nomStocke = UUID.randomUUID() + (extension.isEmpty() ? "" : "." + extension);

            Path cible = repertoireStockage.resolve(nomStocke).normalize();

            // Sécurité : le fichier doit rester dans le répertoire de stockage.
            if (!cible.startsWith(repertoireStockage)) {
                throw new IllegalArgumentException("Chemin de fichier invalide.");
            }

            try (OutputStream sortie = Files.newOutputStream(cible)) {
                sortie.write(fichier.getBytes());
            }

            return nomStocke;

        } catch (IOException e) {
            throw new IllegalStateException(
                    "Erreur lors de l'enregistrement du fichier : " + e.getMessage(), e
            );
        }
    }

    // =========================================================
    // LECTURE
    // =========================================================

    public Path resoudreChemin(String nomStocke) {
        if (nomStocke == null || nomStocke.isBlank()) {
            throw new IllegalArgumentException("Nom de fichier invalide.");
        }

        Path chemin = repertoireStockage.resolve(nomStocke).normalize();

        if (!chemin.startsWith(repertoireStockage)) {
            throw new IllegalArgumentException("Chemin de fichier invalide.");
        }

        return chemin;
    }

    public void supprimer(String nomStocke) {
        if (nomStocke == null || nomStocke.isBlank()) {
            return;
        }

        try {
            Files.deleteIfExists(resoudreChemin(nomStocke));
        } catch (IOException ignore) {
            // Le nettoyage du disque ne doit pas bloquer
            // la suppression de l'entité en base.
        }
    }

    // =========================================================
    // OUTILS
    // =========================================================

    private String extraireExtension(String nom) {
        int position = nom.lastIndexOf('.');

        if (position < 0 || position == nom.length() - 1) {
            throw new IllegalArgumentException(
                    "Le fichier doit porter une extension (PDF, JPG ou PNG)."
            );
        }

        return nom.substring(position + 1).toLowerCase(Locale.ROOT);
    }
}
