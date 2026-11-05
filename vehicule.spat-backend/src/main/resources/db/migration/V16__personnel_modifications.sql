CREATE TABLE IF NOT EXISTS personnel_modifications (
    matricule VARCHAR(50) PRIMARY KEY,
    nom VARCHAR(255),
    prenom VARCHAR(255),
    direction VARCHAR(255),
    poste VARCHAR(255),
    categorie VARCHAR(255),
    email VARCHAR(255),
    supprime BOOLEAN NOT NULL DEFAULT FALSE
);
