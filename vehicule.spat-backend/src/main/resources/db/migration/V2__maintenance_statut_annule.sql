-- Autorise le nouveau statut d'annulation dans les bases déjà initialisées.
-- Sur une base vide, Hibernate créera la table après l'exécution de Flyway.
DO $$
BEGIN
    IF to_regclass('public.maintenance') IS NOT NULL THEN
        ALTER TABLE public.maintenance DROP CONSTRAINT IF EXISTS maintenance_statut_check;
        ALTER TABLE public.maintenance
            ADD CONSTRAINT maintenance_statut_check CHECK (statut IN (
                'EN_ATTENTE_AVIS_DID',
                'AVIS_FAVORABLE_DID',
                'AVIS_DEFAVORABLE_DID',
                'EN_ATTENTE_VALIDATION_N1',
                'VALIDATION_N1_LOGISTIQUE',
                'VALIDATION_N2_DGAL',
                'VALIDEE',
                'REFUSEE',
                'PLANIFIEE',
                'EN_COURS',
                'CLOTUREE',
                'EN_ATTENTE_VALIDATION_ENTRETIEN',
                'ENTRETIEN_AUTORISE',
                'ENTRETIEN_TERMINE',
                'ENTRETIEN_ANNULE'
            ));
    END IF;
END $$;
