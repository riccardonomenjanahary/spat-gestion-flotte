-- Ajout de la colonne fiche_controle pour stocker les données de la fiche de contrôle véhicule
ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS fiche_controle TEXT;