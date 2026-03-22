-- ============================================================
-- FIX RLS — ressources_partages + ressources (accès client)
-- Colle dans Supabase Studio > SQL Editor > New query
-- ============================================================
--
-- PROBLÈME : Le client ne peut pas lire ses ressources partagées.
-- CAUSE :
--   1) La table `ressources` n'a qu'une policy SELECT pour le coach
--      (coach_id = auth.uid()). Quand le client fait un JOIN
--      ressources_partages → ressources, la RLS sur `ressources`
--      bloque car le client n'est pas le coach.
--   2) La policy SELECT du client sur `ressources_partages` peut
--      ne pas exister si le script initial a échoué.
--
-- SOLUTION : Ajouter des policies permettant au client de lire
-- les ressources qui lui ont été partagées.
-- ============================================================


-- ──────────────────────────────────────
-- 1. TABLE ressources_partages
-- ──────────────────────────────────────

-- S'assurer que RLS est activé
ALTER TABLE ressources_partages ENABLE ROW LEVEL SECURITY;

-- Recréer la policy SELECT du client (idempotent)
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE tablename = 'ressources_partages'
  AND policyname = 'Client voit ses partages'
) THEN
  CREATE POLICY "Client voit ses partages"
    ON ressources_partages FOR SELECT
    USING (client_id = auth.uid());
END IF;
END $$;

-- Recréer la policy SELECT du coach (idempotent)
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE tablename = 'ressources_partages'
  AND policyname = 'Coach voit les partages de ses ressources'
) THEN
  CREATE POLICY "Coach voit les partages de ses ressources"
    ON ressources_partages FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM ressources
      WHERE ressources.id = ressources_partages.ressource_id
      AND ressources.coach_id = auth.uid()
    ));
END IF;
END $$;

-- Recréer la policy INSERT du coach (idempotent)
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE tablename = 'ressources_partages'
  AND policyname = 'Coach crée des partages'
) THEN
  CREATE POLICY "Coach crée des partages"
    ON ressources_partages FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM ressources
      WHERE ressources.id = ressources_partages.ressource_id
      AND ressources.coach_id = auth.uid()
    ));
END IF;
END $$;

-- Recréer la policy DELETE du coach (idempotent)
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE tablename = 'ressources_partages'
  AND policyname = 'Coach supprime des partages'
) THEN
  CREATE POLICY "Coach supprime des partages"
    ON ressources_partages FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM ressources
      WHERE ressources.id = ressources_partages.ressource_id
      AND ressources.coach_id = auth.uid()
    ));
END IF;
END $$;


-- ──────────────────────────────────────
-- 2. TABLE ressources (FIX PRINCIPAL)
-- Le client doit pouvoir LIRE les ressources
-- qui lui ont été partagées via ressources_partages.
-- ──────────────────────────────────────

ALTER TABLE ressources ENABLE ROW LEVEL SECURITY;

-- Policy : le client peut lire les ressources qui lui sont partagées
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE tablename = 'ressources'
  AND policyname = 'Client voit ses ressources partagées'
) THEN
  CREATE POLICY "Client voit ses ressources partagées"
    ON ressources FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM ressources_partages
      WHERE ressources_partages.ressource_id = ressources.id
      AND ressources_partages.client_id = auth.uid()
    ));
END IF;
END $$;


-- ──────────────────────────────────────
-- 3. GRANT (sécurité)
-- ──────────────────────────────────────
GRANT SELECT, INSERT, DELETE ON ressources_partages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ressources TO authenticated;
