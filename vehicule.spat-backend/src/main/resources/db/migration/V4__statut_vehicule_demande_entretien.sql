ALTER TABLE maintenance
    ADD COLUMN IF NOT EXISTS statut_vehicule_avant_entretien VARCHAR(50);

UPDATE maintenance m
SET statut_vehicule_avant_entretien = v.statut
FROM vehicules v
WHERE m.vehicule_id = v.id
  AND m.origine_demande_entretien IS NOT NULL
  AND m.statut IN (
      'EN_ATTENTE_VALIDATION_ENTRETIEN',
      'ENTRETIEN_AUTORISE',
      'ENTRETIEN_TERMINE'
  )
  AND m.statut_vehicule_avant_entretien IS NULL;

UPDATE vehicules v
SET statut = 'MAINTENANCE'
WHERE EXISTS (
    SELECT 1
    FROM maintenance m
    WHERE m.vehicule_id = v.id
      AND m.origine_demande_entretien IS NOT NULL
      AND m.statut IN (
          'EN_ATTENTE_VALIDATION_ENTRETIEN',
          'ENTRETIEN_AUTORISE',
          'ENTRETIEN_TERMINE'
      )
);
