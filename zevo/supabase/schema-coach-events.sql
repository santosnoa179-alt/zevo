-- ══════════════════════════════════════════════
-- COACH EVENTS — Événements classiques du coach
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS coach_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  event_date timestamptz NOT NULL,
  event_type text NOT NULL DEFAULT 'perso'
    CHECK (event_type IN ('bilan', 'appel', 'perso', 'reunion', 'note', 'autre')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_coach_events_coach ON coach_events(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_events_date ON coach_events(event_date);
CREATE INDEX IF NOT EXISTS idx_coach_events_client ON coach_events(client_id);

-- RLS
ALTER TABLE coach_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coach_events_select_coach') THEN
  CREATE POLICY coach_events_select_coach ON coach_events FOR SELECT USING (auth.uid() = coach_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coach_events_insert_coach') THEN
  CREATE POLICY coach_events_insert_coach ON coach_events FOR INSERT WITH CHECK (auth.uid() = coach_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coach_events_update_coach') THEN
  CREATE POLICY coach_events_update_coach ON coach_events FOR UPDATE USING (auth.uid() = coach_id);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'coach_events_delete_coach') THEN
  CREATE POLICY coach_events_delete_coach ON coach_events FOR DELETE USING (auth.uid() = coach_id);
END IF;
END $$;

GRANT ALL ON coach_events TO authenticated;
