-- Les chauffeurs restent des ressources métier gérées par la Logistique.
-- Aucun compte portail chauffeur ne doit rester utilisable.
UPDATE utilisateurs
SET actif = FALSE
WHERE UPPER(REPLACE(role, 'ROLE_', '')) = 'CHAUFFEUR';
