CREATE TABLE IF NOT EXISTS journal_modifications (
    id BIGSERIAL PRIMARY KEY,
    acteur_matricule VARCHAR(100) NOT NULL,
    acteur_role VARCHAR(60) NOT NULL,
    methode VARCHAR(10) NOT NULL,
    chemin VARCHAR(500) NOT NULL,
    statut_http SMALLINT NOT NULL,
    date_action TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journal_modifications_date_action
    ON journal_modifications (date_action DESC);
