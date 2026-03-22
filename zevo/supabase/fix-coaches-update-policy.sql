-- ============================================================
-- FIX — Autoriser les coachs à modifier leur propre ligne
-- Colle dans Supabase Studio > SQL Editor > New query
-- ============================================================

-- S'assurer que RLS est activé
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Policy UPDATE : le coach peut modifier sa propre ligne
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coaches_update_own' AND tablename = 'coaches') THEN
    CREATE POLICY coaches_update_own ON coaches
      FOR UPDATE USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Policy SELECT : le coach peut lire sa propre ligne
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coaches_select_own' AND tablename = 'coaches') THEN
    CREATE POLICY coaches_select_own ON coaches
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- GRANTs nécessaires
GRANT SELECT, UPDATE ON coaches TO authenticated;
