-- ============================================================
-- ZEVO — CRM Prospects (Pipeline de vente coach)
-- Colle dans Supabase Studio > SQL Editor > New query
-- ============================================================

CREATE TABLE IF NOT EXISTS prospects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid REFERENCES coaches(id) ON DELETE CASCADE NOT NULL,
  prenom text NOT NULL,
  nom text,
  email text,
  telephone text,
  valeur_estimee int DEFAULT 0,
  statut text DEFAULT 'contact' CHECK (statut IN ('contact', 'appel', 'proposition', 'closing')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_prospects_coach ON prospects(coach_id);
CREATE INDEX IF NOT EXISTS idx_prospects_statut ON prospects(coach_id, statut);

-- RLS
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'prospects_select_own' AND tablename = 'prospects') THEN
    CREATE POLICY prospects_select_own ON prospects FOR SELECT USING (coach_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'prospects_insert_own' AND tablename = 'prospects') THEN
    CREATE POLICY prospects_insert_own ON prospects FOR INSERT WITH CHECK (coach_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'prospects_update_own' AND tablename = 'prospects') THEN
    CREATE POLICY prospects_update_own ON prospects FOR UPDATE USING (coach_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'prospects_delete_own' AND tablename = 'prospects') THEN
    CREATE POLICY prospects_delete_own ON prospects FOR DELETE USING (coach_id = auth.uid());
  END IF;
END $$;

-- GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON prospects TO authenticated;
