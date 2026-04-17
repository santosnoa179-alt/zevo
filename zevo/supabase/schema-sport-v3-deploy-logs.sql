-- ════════════════════════════════════════════════════════════════════
-- ZEVO — V3 Sport : déploiement séances + logs client
-- ════════════════════════════════════════════════════════════════════
--
-- V3a : déploiement auto du programme Pro → séances individuelles planifiées
--       dans le calendrier pour le client
-- V3b : logs client (charge réelle, reps, RPE perçu par séance/exercice)
--
-- Stratégie : étendre les tables legacy `seances` et `seance_exercices`
-- avec les colonnes Pro (RPE, tempo, rest, supersets, progression...).
-- Le coach voit les séances déployées dans son Calendar, le client dans
-- son app, et les logs permettent les stats de progression.
-- ════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════
-- 1) EXTENSIONS DE `seances` — lien vers programme Pro
-- ═══════════════════════════════════════════════════════
ALTER TABLE seances
  ADD COLUMN IF NOT EXISTS sport_programme_id uuid REFERENCES sport_programmes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sport_phase_id uuid REFERENCES sport_phases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sport_seance_type_id uuid REFERENCES sport_seance_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS week_number int,
  ADD COLUMN IF NOT EXISTS duree_estimee_min int;

CREATE INDEX IF NOT EXISTS idx_seances_sport_prog ON seances(sport_programme_id);
CREATE INDEX IF NOT EXISTS idx_seances_sport_phase ON seances(sport_phase_id);

-- ═══════════════════════════════════════════════════════
-- 2) EXTENSIONS DE `seance_exercices` — params avancés Pro
-- ═══════════════════════════════════════════════════════
-- Les séances déployées d'un programme Pro doivent pouvoir porter les
-- paramètres RPE/tempo/rest/supersets/progression/etc. sur chaque exo.
ALTER TABLE seance_exercices
  ADD COLUMN IF NOT EXISTS charge_kg numeric,
  ADD COLUMN IF NOT EXISTS charge_unite text DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS rpe_cible numeric CHECK (rpe_cible IS NULL OR (rpe_cible >= 0 AND rpe_cible <= 10)),
  ADD COLUMN IF NOT EXISTS rir_cible int CHECK (rir_cible IS NULL OR (rir_cible >= 0 AND rir_cible <= 10)),
  ADD COLUMN IF NOT EXISTS tempo text,
  ADD COLUMN IF NOT EXISTS rest_sec int,
  ADD COLUMN IF NOT EXISTS superset_group text,
  ADD COLUMN IF NOT EXISTS technique text,
  ADD COLUMN IF NOT EXISTS notes_coach text,
  ADD COLUMN IF NOT EXISTS progression_type text,
  ADD COLUMN IF NOT EXISTS progression_value numeric,
  ADD COLUMN IF NOT EXISTS progression_freq text,
  -- Lien optionnel vers l'exo template du programme (pour tracking cross-weeks)
  ADD COLUMN IF NOT EXISTS sport_seance_exercice_id uuid REFERENCES sport_seance_exercices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_seance_exos_sport_template ON seance_exercices(sport_seance_exercice_id);

-- ═══════════════════════════════════════════════════════
-- 3) TABLE DES LOGS CLIENT (V3b)
-- ═══════════════════════════════════════════════════════
-- Le client enregistre ses performances réelles pour chaque exercice
-- d'une séance déployée : charge effective, reps atteints, RPE perçu.
CREATE TABLE IF NOT EXISTS seance_exercice_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seance_exercice_id uuid NOT NULL REFERENCES seance_exercices(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Valeurs réalisées (une ligne par SET de l'exercice)
  set_number int DEFAULT 1,
  charge_kg_reel numeric,
  reps_reel int,
  rpe_percu numeric CHECK (rpe_percu IS NULL OR (rpe_percu >= 0 AND rpe_percu <= 10)),
  notes_client text,
  logged_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seance_exo_logs_exo ON seance_exercice_logs(seance_exercice_id, set_number);
CREATE INDEX IF NOT EXISTS idx_seance_exo_logs_client ON seance_exercice_logs(client_id, logged_at DESC);

-- ═══════════════════════════════════════════════════════
-- RLS — seance_exercice_logs
-- ═══════════════════════════════════════════════════════
ALTER TABLE seance_exercice_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
-- Client : SELECT/INSERT/UPDATE ses propres logs
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seance_exo_logs_client_select') THEN
  CREATE POLICY seance_exo_logs_client_select ON seance_exercice_logs FOR SELECT TO authenticated
    USING (client_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seance_exo_logs_client_insert') THEN
  CREATE POLICY seance_exo_logs_client_insert ON seance_exercice_logs FOR INSERT TO authenticated
    WITH CHECK (client_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seance_exo_logs_client_update') THEN
  CREATE POLICY seance_exo_logs_client_update ON seance_exercice_logs FOR UPDATE TO authenticated
    USING (client_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seance_exo_logs_client_delete') THEN
  CREATE POLICY seance_exo_logs_client_delete ON seance_exercice_logs FOR DELETE TO authenticated
    USING (client_id = auth.uid());
END IF;

-- Coach : SELECT les logs de ses propres clients (via le chemin complet)
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'seance_exo_logs_coach_select') THEN
  CREATE POLICY seance_exo_logs_coach_select ON seance_exercice_logs FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM seance_exercices se
      JOIN seances s ON s.id = se.seance_id
      WHERE se.id = seance_exercice_logs.seance_exercice_id
        AND s.coach_id = auth.uid()
    ));
END IF;
END $$;

GRANT ALL ON seance_exercice_logs TO authenticated;

-- ═══════════════════════════════════════════════════════
-- VUE : stats progression par exercice (pour dashboard coach)
-- ═══════════════════════════════════════════════════════
-- Agrège les logs par (client_id, exercice_id, semaine) pour détecter
-- les stagnations / voir l'évolution des charges.
CREATE OR REPLACE VIEW v_sport_progression_exercices AS
SELECT
  s.client_id,
  s.coach_id,
  s.sport_programme_id,
  se.exercice_id,
  se.sport_seance_exercice_id,                           -- exo template source
  date_trunc('week', s.date_prevue)::date AS semaine,
  AVG(se.charge_kg)::numeric AS charge_prevue_moy,      -- ce qui était prévu
  AVG(l.charge_kg_reel)::numeric AS charge_faite_moy,   -- ce qui a été fait
  AVG(l.rpe_percu)::numeric AS rpe_moy,
  COUNT(DISTINCT l.id) AS nb_sets_logges,
  COUNT(DISTINCT CASE WHEN s.is_completed THEN s.id END) AS nb_seances_completees
FROM seance_exercices se
JOIN seances s ON s.id = se.seance_id
LEFT JOIN seance_exercice_logs l ON l.seance_exercice_id = se.id
WHERE se.exercice_id IS NOT NULL AND s.sport_programme_id IS NOT NULL
GROUP BY s.client_id, s.coach_id, s.sport_programme_id, se.exercice_id,
         se.sport_seance_exercice_id, date_trunc('week', s.date_prevue);

GRANT SELECT ON v_sport_progression_exercices TO authenticated;
