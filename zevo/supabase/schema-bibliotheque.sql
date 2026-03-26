-- ============================================================
-- ZEVO — Bibliothèque de ressources (v3 — FIX RECURSION)
-- Colle ce fichier dans Supabase Studio > SQL Editor > New query
-- ============================================================
-- 100% idempotent. Corrige la boucle infinie entre les policies
-- de `ressources` et `ressources_partages`.
--
-- CAUSE : policy sur ressources fait SELECT sur ressources_partages,
--         policy sur ressources_partages fait SELECT sur ressources → ∞
--
-- SOLUTION : Fonctions SECURITY DEFINER qui bypasses le RLS,
--            cassant le cycle de dépendance.
-- ============================================================


-- ============================================================
-- 1. TABLES
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
-- 2. FONCTIONS HELPER (SECURITY DEFINER = bypass RLS)
--    Elles lisent les tables SANS déclencher les policies,
--    ce qui casse la boucle de récursion.
-- ============================================================

-- Le coach possède-t-il cette ressource ?
CREATE OR REPLACE FUNCTION owns_ressource(rid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ressources WHERE id = rid AND coach_id = auth.uid()
  );
$$;

-- Le client a-t-il accès à cette ressource (via partage) ?
CREATE OR REPLACE FUNCTION has_ressource_access(rid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ressources_partages WHERE ressource_id = rid AND client_id = auth.uid()
  );
$$;


-- ============================================================
-- 3. DROP TOUTES LES ANCIENNES POLICIES (nettoyage complet)
-- ============================================================

-- ressources
DROP POLICY IF EXISTS "Coach voit ses ressources"            ON ressources;
DROP POLICY IF EXISTS "Coach crée ses ressources"            ON ressources;
DROP POLICY IF EXISTS "Coach modifie ses ressources"         ON ressources;
DROP POLICY IF EXISTS "Coach supprime ses ressources"        ON ressources;
DROP POLICY IF EXISTS "Client voit ses ressources partagées" ON ressources;
DROP POLICY IF EXISTS "Admin voit toutes les ressources"     ON ressources;

-- ressources_partages
DROP POLICY IF EXISTS "Coach voit les partages de ses ressources" ON ressources_partages;
DROP POLICY IF EXISTS "Client voit ses partages"                  ON ressources_partages;
DROP POLICY IF EXISTS "Coach crée des partages"                   ON ressources_partages;
DROP POLICY IF EXISTS "Coach supprime des partages"               ON ressources_partages;


-- ============================================================
-- 4. RLS — RESSOURCES (aucune jointure vers ressources_partages)
-- ============================================================
ALTER TABLE ressources ENABLE ROW LEVEL SECURITY;

-- Coach : CRUD complet, condition simple sans jointure
CREATE POLICY "coach_ressources_select"
  ON ressources FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "coach_ressources_insert"
  ON ressources FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "coach_ressources_update"
  ON ressources FOR UPDATE
  USING (coach_id = auth.uid());

CREATE POLICY "coach_ressources_delete"
  ON ressources FOR DELETE
  USING (coach_id = auth.uid());

-- Client : SELECT uniquement, via la fonction SECURITY DEFINER
-- → appelle has_ressource_access() qui lit ressources_partages
--   SANS déclencher les policies de ressources_partages
CREATE POLICY "client_ressources_select"
  ON ressources FOR SELECT
  USING (has_ressource_access(id));


-- ============================================================
-- 5. RLS — RESSOURCES_PARTAGES (aucune jointure vers ressources)
-- ============================================================
ALTER TABLE ressources_partages ENABLE ROW LEVEL SECURITY;

-- Client : lit ses propres partages (condition directe, pas de jointure)
CREATE POLICY "client_partages_select"
  ON ressources_partages FOR SELECT
  USING (client_id = auth.uid());

-- Coach : SELECT via la fonction SECURITY DEFINER
-- → appelle owns_ressource() qui lit ressources
--   SANS déclencher les policies de ressources
CREATE POLICY "coach_partages_select"
  ON ressources_partages FOR SELECT
  USING (owns_ressource(ressource_id));

CREATE POLICY "coach_partages_insert"
  ON ressources_partages FOR INSERT
  WITH CHECK (owns_ressource(ressource_id));

CREATE POLICY "coach_partages_delete"
  ON ressources_partages FOR DELETE
  USING (owns_ressource(ressource_id));


-- ============================================================
-- 6. GRANTS
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ressources          TO authenticated;
GRANT SELECT, INSERT, DELETE         ON ressources_partages TO authenticated;
GRANT EXECUTE ON FUNCTION owns_ressource(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION has_ressource_access(uuid)        TO authenticated;


-- ============================================================
-- 7. BUCKET STORAGE — ressources (public)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ressources', 'ressources', true)
ON CONFLICT (id) DO NOTHING;

-- Upload : tout utilisateur authentifié
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ressources_upload_policy') THEN
  CREATE POLICY ressources_upload_policy ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'ressources' AND auth.uid() IS NOT NULL);
END IF;
END $$;

-- Lecture : public
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ressources_read_policy') THEN
  CREATE POLICY ressources_read_policy ON storage.objects
    FOR SELECT USING (bucket_id = 'ressources');
END IF;
END $$;

-- Suppression : utilisateur authentifié
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ressources_delete_policy') THEN
  CREATE POLICY ressources_delete_policy ON storage.objects
    FOR DELETE USING (bucket_id = 'ressources' AND auth.uid() IS NOT NULL);
END IF;
END $$;
