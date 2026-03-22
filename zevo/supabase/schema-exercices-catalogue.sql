-- ============================================================
-- ZEVO — Mise à jour table exercices : catalogue administrable
-- Colle dans Supabase Studio > SQL Editor > New query
-- ============================================================

-- ── 1. Rendre coach_id nullable (exercices Zevo Standard = NULL) ──
ALTER TABLE exercices ALTER COLUMN coach_id DROP NOT NULL;

-- ── 2. Ajouter la colonne category ──
ALTER TABLE exercices ADD COLUMN IF NOT EXISTS category text;  -- 'Musculation', 'Cardio', 'Souplesse', 'Fonctionnel'

-- ── 3. Ajouter la colonne muscles (tableau texte) ──
ALTER TABLE exercices ADD COLUMN IF NOT EXISTS muscles text[];

-- ── 4. Table favoris exercices ──
CREATE TABLE IF NOT EXISTS exercices_favoris (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  exercice_id uuid NOT NULL REFERENCES exercices(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, exercice_id)
);

ALTER TABLE exercices_favoris ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exercices_favoris_select_own') THEN
  CREATE POLICY exercices_favoris_select_own ON exercices_favoris FOR SELECT USING (auth.uid() = coach_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exercices_favoris_insert_own') THEN
  CREATE POLICY exercices_favoris_insert_own ON exercices_favoris FOR INSERT WITH CHECK (auth.uid() = coach_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exercices_favoris_delete_own') THEN
  CREATE POLICY exercices_favoris_delete_own ON exercices_favoris FOR DELETE USING (auth.uid() = coach_id);
END IF;
END $$;

GRANT SELECT, INSERT, DELETE ON exercices_favoris TO authenticated;

-- ── 5. Mettre à jour la RLS pour voir les exercices Zevo Standard (coach_id IS NULL) ──
-- Supprimer l'ancienne policy et la recréer
DROP POLICY IF EXISTS exercices_select_own ON exercices;
CREATE POLICY exercices_select_own ON exercices FOR SELECT
  USING (coach_id IS NULL OR auth.uid() = coach_id);

-- ── 6. Index ──
CREATE INDEX IF NOT EXISTS idx_exercices_category ON exercices(category);
CREATE INDEX IF NOT EXISTS idx_exercices_muscle_group ON exercices(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercices_favoris_coach ON exercices_favoris(coach_id);
