-- ============================================================
-- ZEVO — Table suivi_poids (historique des pesées client)
-- ============================================================

CREATE TABLE IF NOT EXISTS suivi_poids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  date_pesee date NOT NULL DEFAULT current_date,
  poids numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, date_pesee)
);

CREATE INDEX IF NOT EXISTS idx_suivi_poids_client ON suivi_poids(client_id, date_pesee);
CREATE INDEX IF NOT EXISTS idx_suivi_poids_coach ON suivi_poids(coach_id);

ALTER TABLE suivi_poids ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'suivi_poids_select_coach') THEN
  CREATE POLICY suivi_poids_select_coach ON suivi_poids FOR SELECT TO authenticated
    USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'suivi_poids_insert_coach') THEN
  CREATE POLICY suivi_poids_insert_coach ON suivi_poids FOR INSERT TO authenticated
    WITH CHECK (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'suivi_poids_update_coach') THEN
  CREATE POLICY suivi_poids_update_coach ON suivi_poids FOR UPDATE TO authenticated
    USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'suivi_poids_delete_coach') THEN
  CREATE POLICY suivi_poids_delete_coach ON suivi_poids FOR DELETE TO authenticated
    USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'suivi_poids_select_client') THEN
  CREATE POLICY suivi_poids_select_client ON suivi_poids FOR SELECT TO authenticated
    USING (client_id = auth.uid());
END IF;
END $$;

GRANT ALL ON suivi_poids TO authenticated;
