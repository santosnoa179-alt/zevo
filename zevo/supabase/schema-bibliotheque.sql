-- ============================================================
-- ZEVO — Bibliothèque de ressources (version robuste)
-- Colle ce fichier dans Supabase Studio > SQL Editor > New query
-- ============================================================
-- Ce script est 100% idempotent (safe à re-exécuter).


-- ============================================================
-- 1. TABLE RESSOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS ressources (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    uuid        REFERENCES coaches(id) ON DELETE CASCADE NOT NULL,
  titre       text        NOT NULL,
  type        text        CHECK (type IN ('pdf','video','lien','image','guide')),
  url         text,
  categorie   text,
  description text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ressources_coach ON ressources(coach_id);

-- ============================================================
-- 2. TABLE RESSOURCES_PARTAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS ressources_partages (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ressource_id uuid        REFERENCES ressources(id) ON DELETE CASCADE NOT NULL,
  client_id    uuid        REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  partage_at   timestamptz DEFAULT now(),
  UNIQUE(ressource_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_partages_client    ON ressources_partages(client_id);
CREATE INDEX IF NOT EXISTS idx_partages_ressource ON ressources_partages(ressource_id);

-- ============================================================
-- 3. RLS — RESSOURCES (idempotent)
-- ============================================================
ALTER TABLE ressources ENABLE ROW LEVEL SECURITY;

-- Coach SELECT
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ressources' AND policyname = 'Coach voit ses ressources') THEN
  CREATE POLICY "Coach voit ses ressources" ON ressources FOR SELECT USING (coach_id = auth.uid());
END IF;
END $$;

-- Coach INSERT
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ressources' AND policyname = 'Coach crée ses ressources') THEN
  CREATE POLICY "Coach crée ses ressources" ON ressources FOR INSERT WITH CHECK (coach_id = auth.uid());
END IF;
END $$;

-- Coach UPDATE
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ressources' AND policyname = 'Coach modifie ses ressources') THEN
  CREATE POLICY "Coach modifie ses ressources" ON ressources FOR UPDATE USING (coach_id = auth.uid());
END IF;
END $$;

-- Coach DELETE
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ressources' AND policyname = 'Coach supprime ses ressources') THEN
  CREATE POLICY "Coach supprime ses ressources" ON ressources FOR DELETE USING (coach_id = auth.uid());
END IF;
END $$;

-- Client SELECT (ressources partagées)
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ressources' AND policyname = 'Client voit ses ressources partagées') THEN
  CREATE POLICY "Client voit ses ressources partagées" ON ressources FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM ressources_partages
      WHERE ressources_partages.ressource_id = ressources.id
        AND ressources_partages.client_id = auth.uid()
    ));
END IF;
END $$;

-- Admin SELECT (optionnel, ignore si is_admin() n'existe pas)
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ressources' AND policyname = 'Admin voit toutes les ressources') THEN
    CREATE POLICY "Admin voit toutes les ressources" ON ressources FOR SELECT USING (is_admin());
  END IF;
END IF;
END $$;


-- ============================================================
-- 4. RLS — RESSOURCES_PARTAGES (idempotent)
-- ============================================================
ALTER TABLE ressources_partages ENABLE ROW LEVEL SECURITY;

-- Coach SELECT
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ressources_partages' AND policyname = 'Coach voit les partages de ses ressources') THEN
  CREATE POLICY "Coach voit les partages de ses ressources" ON ressources_partages FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM ressources WHERE ressources.id = ressources_partages.ressource_id AND ressources.coach_id = auth.uid()
    ));
END IF;
END $$;

-- Client SELECT
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ressources_partages' AND policyname = 'Client voit ses partages') THEN
  CREATE POLICY "Client voit ses partages" ON ressources_partages FOR SELECT USING (client_id = auth.uid());
END IF;
END $$;

-- Coach INSERT
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ressources_partages' AND policyname = 'Coach crée des partages') THEN
  CREATE POLICY "Coach crée des partages" ON ressources_partages FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM ressources WHERE ressources.id = ressources_partages.ressource_id AND ressources.coach_id = auth.uid()
    ));
END IF;
END $$;

-- Coach DELETE
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ressources_partages' AND policyname = 'Coach supprime des partages') THEN
  CREATE POLICY "Coach supprime des partages" ON ressources_partages FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM ressources WHERE ressources.id = ressources_partages.ressource_id AND ressources.coach_id = auth.uid()
    ));
END IF;
END $$;


-- ============================================================
-- 5. GRANTS
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ressources          TO authenticated;
GRANT SELECT, INSERT, DELETE         ON ressources_partages TO authenticated;


-- ============================================================
-- 6. BUCKET STORAGE — ressources (public)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ressources', 'ressources', true)
ON CONFLICT (id) DO NOTHING;

-- Policy upload : tout utilisateur authentifié
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ressources_upload_policy') THEN
  CREATE POLICY ressources_upload_policy ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'ressources' AND auth.uid() IS NOT NULL);
END IF;
END $$;

-- Policy lecture : public
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ressources_read_policy') THEN
  CREATE POLICY ressources_read_policy ON storage.objects
    FOR SELECT USING (bucket_id = 'ressources');
END IF;
END $$;

-- Policy suppression : le coach peut supprimer ses fichiers
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ressources_delete_policy') THEN
  CREATE POLICY ressources_delete_policy ON storage.objects
    FOR DELETE USING (bucket_id = 'ressources' AND auth.uid() IS NOT NULL);
END IF;
END $$;
