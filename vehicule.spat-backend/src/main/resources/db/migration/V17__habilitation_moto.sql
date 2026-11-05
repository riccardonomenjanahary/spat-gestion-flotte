ALTER TABLE conducteurs_autorises ADD COLUMN IF NOT EXISTS poste VARCHAR(255);
ALTER TABLE conducteurs_autorises ADD COLUMN IF NOT EXISTS permis_nom_fichier VARCHAR(260);
ALTER TABLE conducteurs_autorises ADD COLUMN IF NOT EXISTS permis_nom_stocke VARCHAR(100);
ALTER TABLE conducteurs_autorises ADD COLUMN IF NOT EXISTS permis_content_type VARCHAR(150);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS conducteur_moto_id BIGINT REFERENCES conducteurs_autorises(id);
