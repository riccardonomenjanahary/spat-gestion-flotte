-- Configuration GPS initiale des véhicules équipés. Les valeurs existantes sont conservées.
DO $$
BEGIN
    IF to_regclass('public.vehicules') IS NOT NULL THEN
                UPDATE public.vehicules SET gps_equipe = TRUE, gps_device_id = 3760
                WHERE REPLACE(immatriculation, ' ', '') ILIKE '01614WWA' AND gps_device_id IS NULL
                    AND NOT EXISTS (SELECT 1 FROM public.vehicules v WHERE v.gps_device_id = 3760);
                UPDATE public.vehicules SET gps_equipe = TRUE, gps_device_id = 3761
                WHERE REPLACE(immatriculation, ' ', '') ILIKE '01615WWA' AND gps_device_id IS NULL
                    AND NOT EXISTS (SELECT 1 FROM public.vehicules v WHERE v.gps_device_id = 3761);
                UPDATE public.vehicules SET gps_equipe = TRUE, gps_device_id = 3762
                WHERE REPLACE(immatriculation, ' ', '') = '5174AH' AND gps_device_id IS NULL
                    AND NOT EXISTS (SELECT 1 FROM public.vehicules v WHERE v.gps_device_id = 3762);
                UPDATE public.vehicules SET gps_equipe = TRUE, gps_device_id = 3763
                WHERE REPLACE(immatriculation, ' ', '') = '6743AJ' AND gps_device_id IS NULL
                    AND NOT EXISTS (SELECT 1 FROM public.vehicules v WHERE v.gps_device_id = 3763);
                UPDATE public.vehicules SET gps_equipe = TRUE, gps_device_id = 3764
                WHERE REPLACE(immatriculation, ' ', '') = '1218TCA' AND gps_device_id IS NULL
                    AND NOT EXISTS (SELECT 1 FROM public.vehicules v WHERE v.gps_device_id = 3764);
                UPDATE public.vehicules SET gps_equipe = TRUE, gps_device_id = 3765
                WHERE REPLACE(immatriculation, ' ', '') = '6742AJ' AND gps_device_id IS NULL
                    AND NOT EXISTS (SELECT 1 FROM public.vehicules v WHERE v.gps_device_id = 3765);
                UPDATE public.vehicules SET gps_equipe = TRUE, gps_device_id = 3766
                WHERE REPLACE(immatriculation, ' ', '') = '5533AE' AND gps_device_id IS NULL
                    AND NOT EXISTS (SELECT 1 FROM public.vehicules v WHERE v.gps_device_id = 3766);
                UPDATE public.vehicules SET gps_equipe = TRUE, gps_device_id = 3767
                WHERE REPLACE(immatriculation, ' ', '') = '5334AJ' AND gps_device_id IS NULL
                    AND NOT EXISTS (SELECT 1 FROM public.vehicules v WHERE v.gps_device_id = 3767);
                UPDATE public.vehicules SET gps_equipe = TRUE, gps_device_id = 3768
                WHERE REPLACE(immatriculation, ' ', '') = '1205TCA' AND gps_device_id IS NULL
                    AND NOT EXISTS (SELECT 1 FROM public.vehicules v WHERE v.gps_device_id = 3768);
    END IF;
END $$;