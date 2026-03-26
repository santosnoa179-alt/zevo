-- ══════════════════════════════════════
-- AJOUT : Colonne is_completed sur seances
-- ══════════════════════════════════════

ALTER TABLE seances ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false;
ALTER TABLE seances ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Index pour les requêtes de la semaine
CREATE INDEX IF NOT EXISTS idx_seances_client_date ON seances (client_id, date_prevue);
CREATE INDEX IF NOT EXISTS idx_seances_completed ON seances (client_id, is_completed);

-- RLS : Le client peut mettre à jour is_completed sur ses propres séances
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'client_update_seances_completed') THEN
  CREATE POLICY client_update_seances_completed ON seances
    FOR UPDATE USING (client_id = auth.uid())
    WITH CHECK (client_id = auth.uid());
END IF;
END $$;

-- RLS : Le client peut lire ses propres séances
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'client_read_own_seances') THEN
  CREATE POLICY client_read_own_seances ON seances
    FOR SELECT USING (client_id = auth.uid());
END IF;
END $$;
