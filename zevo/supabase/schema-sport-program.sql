-- ============================================================
-- ZEVO — Tables pour le système Sport & Programmation
-- Colle dans Supabase Studio > SQL Editor > New query
-- ============================================================

-- ── Table exercices (bibliothèque globale du coach) ──
CREATE TABLE IF NOT EXISTS exercices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  nom text NOT NULL,
  description text,
  muscle_group text,           -- ex: 'Jambes', 'Pectoraux', 'Dos'
  equipment text,              -- ex: 'Barre', 'Haltère', 'Câble'
  video_url text,
  gif_url text,
  created_at timestamptz DEFAULT now()
);

-- ── Table séances (une séance planifiée pour un client) ──
CREATE TABLE IF NOT EXISTS seances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titre text NOT NULL DEFAULT 'Séance sans titre',
  date_prevue date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ── Table de liaison séance ↔ exercice (détails de chaque exo dans la séance) ──
CREATE TABLE IF NOT EXISTS seance_exercices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seance_id uuid NOT NULL REFERENCES seances(id) ON DELETE CASCADE,
  exercice_id uuid NOT NULL REFERENCES exercices(id) ON DELETE CASCADE,
  series int DEFAULT 3,
  reps int DEFAULT 12,
  poids numeric,               -- kg
  repos int DEFAULT 60,        -- secondes
  ordre int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ── Index ──
CREATE INDEX IF NOT EXISTS idx_exercices_coach ON exercices(coach_id);
CREATE INDEX IF NOT EXISTS idx_seances_coach ON seances(coach_id);
CREATE INDEX IF NOT EXISTS idx_seances_client ON seances(client_id);
CREATE INDEX IF NOT EXISTS idx_seances_date ON seances(date_prevue);
CREATE INDEX IF NOT EXISTS idx_seance_exercices_seance ON seance_exercices(seance_id);

-- ══════════════════════════════════════
-- RLS — Sécurité ligne par ligne
-- ══════════════════════════════════════

ALTER TABLE exercices ENABLE ROW LEVEL SECURITY;
ALTER TABLE seances ENABLE ROW LEVEL SECURITY;
ALTER TABLE seance_exercices ENABLE ROW LEVEL SECURITY;

-- ── Exercices : le coach gère ses propres exercices ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exercices_select_own') THEN
  CREATE POLICY exercices_select_own ON exercices FOR SELECT USING (auth.uid() = coach_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exercices_insert_own') THEN
  CREATE POLICY exercices_insert_own ON exercices FOR INSERT WITH CHECK (auth.uid() = coach_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exercices_update_own') THEN
  CREATE POLICY exercices_update_own ON exercices FOR UPDATE USING (auth.uid() = coach_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exercices_delete_own') THEN
  CREATE POLICY exercices_delete_own ON exercices FOR DELETE USING (auth.uid() = coach_id);
END IF;
END $$;

-- ── Séances : le coach gère ses propres séances ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seances_select_own') THEN
  CREATE POLICY seances_select_own ON seances FOR SELECT USING (auth.uid() = coach_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seances_insert_own') THEN
  CREATE POLICY seances_insert_own ON seances FOR INSERT WITH CHECK (auth.uid() = coach_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seances_update_own') THEN
  CREATE POLICY seances_update_own ON seances FOR UPDATE USING (auth.uid() = coach_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seances_delete_own') THEN
  CREATE POLICY seances_delete_own ON seances FOR DELETE USING (auth.uid() = coach_id);
END IF;
END $$;

-- ── Séance_exercices : accès via la séance (jointure) ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seance_exercices_select') THEN
  CREATE POLICY seance_exercices_select ON seance_exercices FOR SELECT
    USING (EXISTS (SELECT 1 FROM seances s WHERE s.id = seance_id AND s.coach_id = auth.uid()));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seance_exercices_insert') THEN
  CREATE POLICY seance_exercices_insert ON seance_exercices FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM seances s WHERE s.id = seance_id AND s.coach_id = auth.uid()));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seance_exercices_update') THEN
  CREATE POLICY seance_exercices_update ON seance_exercices FOR UPDATE
    USING (EXISTS (SELECT 1 FROM seances s WHERE s.id = seance_id AND s.coach_id = auth.uid()));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seance_exercices_delete') THEN
  CREATE POLICY seance_exercices_delete ON seance_exercices FOR DELETE
    USING (EXISTS (SELECT 1 FROM seances s WHERE s.id = seance_id AND s.coach_id = auth.uid()));
END IF;
END $$;

-- ── Permissions ──
GRANT SELECT, INSERT, UPDATE, DELETE ON exercices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON seances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON seance_exercices TO authenticated;

-- ── Client peut voir ses propres séances (lecture seule) ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seances_client_read') THEN
  CREATE POLICY seances_client_read ON seances FOR SELECT USING (auth.uid() = client_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seance_exercices_client_read') THEN
  CREATE POLICY seance_exercices_client_read ON seance_exercices FOR SELECT
    USING (EXISTS (SELECT 1 FROM seances s WHERE s.id = seance_id AND s.client_id = auth.uid()));
END IF;
END $$;
