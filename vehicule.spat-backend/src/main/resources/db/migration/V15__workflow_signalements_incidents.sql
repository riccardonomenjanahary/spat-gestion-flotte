ALTER TABLE public.signalements_incidents
    ADD COLUMN IF NOT EXISTS date_validation timestamp(6) without time zone,
    ADD COLUMN IF NOT EXISTS valide_par character varying(100),
    ADD COLUMN IF NOT EXISTS date_planification timestamp(6) without time zone,
    ADD COLUMN IF NOT EXISTS planifie_par character varying(100),
    ADD COLUMN IF NOT EXISTS pris_en_charge_par character varying(100),
    ADD COLUMN IF NOT EXISTS cloture_par character varying(100),
    ADD COLUMN IF NOT EXISTS statut_vehicule_avant_incident character varying(50);

ALTER TABLE public.suivi_entretien_periodique
    ADD COLUMN IF NOT EXISTS kilometrage_base_cycle double precision;
