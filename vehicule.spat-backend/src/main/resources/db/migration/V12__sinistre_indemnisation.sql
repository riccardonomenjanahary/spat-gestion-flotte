ALTER TABLE sinistres ADD COLUMN IF NOT EXISTS source_assurance varchar(40);
ALTER TABLE sinistres ADD COLUMN IF NOT EXISTS reference_police varchar(120);
ALTER TABLE sinistres ADD COLUMN IF NOT EXISTS statut_indemnisation varchar(40) DEFAULT 'NON_DEMANDEE';
ALTER TABLE sinistres ADD COLUMN IF NOT EXISTS montant_indemnisation numeric(15,2);
ALTER TABLE sinistres ADD COLUMN IF NOT EXISTS date_indemnisation date;
