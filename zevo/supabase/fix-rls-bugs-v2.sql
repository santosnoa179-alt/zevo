-- ============================================================
-- ZEVO — Fix RLS bugs : Storage, Profiles, Habitudes, Objectifs
-- Exécuter dans Supabase SQL Editor
-- ============================================================


-- ═══════════════════════════════════════
-- 1. FIX STORAGE — Bucket 'ressources'
-- Permet aux coachs d'uploader des fichiers
-- ═══════════════════════════════════════

-- Créer le bucket s'il n'existe pas (via Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ressources', 'ressources', true) ON CONFLICT DO NOTHING;

DO $$ BEGIN

-- SELECT policy : tout le monde authentifié peut lire
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_ressources_select') THEN
  CREATE POLICY storage_ressources_select ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'ressources');
END IF;

-- INSERT policy : les coachs peuvent uploader
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_ressources_insert') THEN
  CREATE POLICY storage_ressources_insert ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'ressources');
END IF;

-- UPDATE policy : les coachs peuvent modifier
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_ressources_update') THEN
  CREATE POLICY storage_ressources_update ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'ressources');
END IF;

-- DELETE policy : les coachs peuvent supprimer
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_ressources_delete') THEN
  CREATE POLICY storage_ressources_delete ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'ressources');
END IF;

END $$;


-- ═══════════════════════════════════════
-- 1b. FIX STORAGE — Bucket 'drive'
-- ═══════════════════════════════════════

DO $$ BEGIN

IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_drive_select') THEN
  CREATE POLICY storage_drive_select ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'drive');
END IF;

IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_drive_insert') THEN
  CREATE POLICY storage_drive_insert ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'drive');
END IF;

IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_drive_delete') THEN
  CREATE POLICY storage_drive_delete ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'drive');
END IF;

END $$;


-- ═══════════════════════════════════════
-- 2. FIX PROFILES — Coach peut modifier les profils de ses clients
-- ═══════════════════════════════════════

DO $$ BEGIN

-- Le user peut modifier son propre profil
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update_own') THEN
  CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated
    USING (id = auth.uid());
END IF;

-- Le coach peut modifier les profils de ses clients
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update_coach') THEN
  CREATE POLICY profiles_update_coach ON profiles FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = profiles.id
        AND clients.coach_id = auth.uid()
      )
    );
END IF;

-- Le coach peut lire les profils de ses clients
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_select_coach') THEN
  CREATE POLICY profiles_select_coach ON profiles FOR SELECT TO authenticated
    USING (
      id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = profiles.id
        AND clients.coach_id = auth.uid()
      )
    );
END IF;

END $$;


-- ═══════════════════════════════════════
-- 3. FIX HABITUDES — Coach peut CRUD pour ses clients
-- ═══════════════════════════════════════

ALTER TABLE habitudes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN

-- Coach peut voir les habitudes de ses clients
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'habitudes_select_coach') THEN
  CREATE POLICY habitudes_select_coach ON habitudes FOR SELECT TO authenticated
    USING (
      client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = habitudes.client_id
        AND clients.coach_id = auth.uid()
      )
    );
END IF;

-- Coach peut créer des habitudes pour ses clients
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'habitudes_insert_coach') THEN
  CREATE POLICY habitudes_insert_coach ON habitudes FOR INSERT TO authenticated
    WITH CHECK (
      client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = habitudes.client_id
        AND clients.coach_id = auth.uid()
      )
    );
END IF;

-- Coach peut modifier les habitudes de ses clients
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'habitudes_update_coach') THEN
  CREATE POLICY habitudes_update_coach ON habitudes FOR UPDATE TO authenticated
    USING (
      client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = habitudes.client_id
        AND clients.coach_id = auth.uid()
      )
    );
END IF;

-- Coach peut supprimer les habitudes de ses clients
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'habitudes_delete_coach') THEN
  CREATE POLICY habitudes_delete_coach ON habitudes FOR DELETE TO authenticated
    USING (
      client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = habitudes.client_id
        AND clients.coach_id = auth.uid()
      )
    );
END IF;

END $$;

GRANT ALL ON habitudes TO authenticated;


-- ═══════════════════════════════════════
-- 4. FIX OBJECTIFS — Coach peut CRUD pour ses clients
-- ═══════════════════════════════════════

ALTER TABLE objectifs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN

-- Coach peut voir les objectifs de ses clients
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'objectifs_select_coach') THEN
  CREATE POLICY objectifs_select_coach ON objectifs FOR SELECT TO authenticated
    USING (
      client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = objectifs.client_id
        AND clients.coach_id = auth.uid()
      )
    );
END IF;

-- Coach peut créer des objectifs pour ses clients
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'objectifs_insert_coach') THEN
  CREATE POLICY objectifs_insert_coach ON objectifs FOR INSERT TO authenticated
    WITH CHECK (
      client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = objectifs.client_id
        AND clients.coach_id = auth.uid()
      )
    );
END IF;

-- Coach peut modifier les objectifs de ses clients
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'objectifs_update_coach') THEN
  CREATE POLICY objectifs_update_coach ON objectifs FOR UPDATE TO authenticated
    USING (
      client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = objectifs.client_id
        AND clients.coach_id = auth.uid()
      )
    );
END IF;

-- Coach peut supprimer les objectifs de ses clients
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'objectifs_delete_coach') THEN
  CREATE POLICY objectifs_delete_coach ON objectifs FOR DELETE TO authenticated
    USING (
      client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = objectifs.client_id
        AND clients.coach_id = auth.uid()
      )
    );
END IF;

END $$;

GRANT ALL ON objectifs TO authenticated;
