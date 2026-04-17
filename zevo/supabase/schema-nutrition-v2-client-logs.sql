-- ════════════════════════════════════════════════════════════════════
-- ZEVO — V2 Nutrition : logs journaliers client + vue agrégée
-- ════════════════════════════════════════════════════════════════════
--
-- Le client loggue sa consommation réelle par jour (kcal, P/G/L totaux,
-- ou repas détaillés).  Le coach voit le "prévu vs réel" dans Hub Client.
--
-- Philosophie : simple. Une ligne par (client, date) avec totaux cumulés.
-- Les repas détaillés sont optionnels (JSONB libre) pour plus tard.
-- ════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════
-- 1) TABLE nutrition_client_logs
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nutrition_client_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date_jour date NOT NULL,
  -- Source : quel programme/phase était actif ce jour-là (pour regroupement)
  nutrition_programme_id uuid REFERENCES nutrition_programmes(id) ON DELETE SET NULL,
  nutrition_phase_id uuid REFERENCES nutrition_phases(id) ON DELETE SET NULL,
  -- Totaux du jour loggés par le client
  kcal_reel int,
  proteines_reel_g numeric,
  glucides_reel_g numeric,
  lipides_reel_g numeric,
  eau_reel_ml int,
  -- Ressenti + notes
  notes_client text,
  ressenti text CHECK (ressenti IS NULL OR ressenti IN ('faible', 'moyen', 'bon', 'excellent')),
  -- Repas détaillés (optionnel) : [{type, titre, kcal, p, g, l, ingredients: []}]
  repas_detail jsonb DEFAULT '[]'::jsonb,
  logged_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, date_jour)
);

CREATE INDEX IF NOT EXISTS idx_nutri_logs_client_date ON nutrition_client_logs(client_id, date_jour DESC);
CREATE INDEX IF NOT EXISTS idx_nutri_logs_prog ON nutrition_client_logs(nutrition_programme_id);

-- ═══════════════════════════════════════════════════════
-- RLS — nutrition_client_logs
-- ═══════════════════════════════════════════════════════
ALTER TABLE nutrition_client_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
-- Client : CRUD sur ses propres logs
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_logs_client_select') THEN
  CREATE POLICY nutri_logs_client_select ON nutrition_client_logs FOR SELECT TO authenticated
    USING (client_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_logs_client_insert') THEN
  CREATE POLICY nutri_logs_client_insert ON nutrition_client_logs FOR INSERT TO authenticated
    WITH CHECK (client_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_logs_client_update') THEN
  CREATE POLICY nutri_logs_client_update ON nutrition_client_logs FOR UPDATE TO authenticated
    USING (client_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_logs_client_delete') THEN
  CREATE POLICY nutri_logs_client_delete ON nutrition_client_logs FOR DELETE TO authenticated
    USING (client_id = auth.uid());
END IF;

-- Coach : SELECT les logs de ses propres clients
-- La relation coach↔client vit dans la table `clients(id, coach_id)`.
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_logs_coach_select') THEN
  CREATE POLICY nutri_logs_coach_select ON nutrition_client_logs FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM clients c
        WHERE c.id = nutrition_client_logs.client_id
          AND c.coach_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM nutrition_programmes np
        WHERE np.id = nutrition_client_logs.nutrition_programme_id
          AND np.coach_id = auth.uid()
      )
    );
END IF;
END $$;

GRANT ALL ON nutrition_client_logs TO authenticated;

-- ═══════════════════════════════════════════════════════
-- VUE : stats hebdomadaires prévu vs réel
-- ═══════════════════════════════════════════════════════
-- Pour chaque (client, semaine), agrège :
--   - prévu (depuis nutrition_phases cibles)
--   - réel (moyenne des logs sur la semaine)
--   - taux de respect (%)
CREATE OR REPLACE VIEW v_nutrition_suivi_hebdo AS
WITH logs_agg AS (
  SELECT
    client_id,
    nutrition_programme_id,
    date_trunc('week', date_jour)::date AS semaine,
    COUNT(*) AS jours_logges,
    AVG(kcal_reel)::numeric AS kcal_reel_moy,
    AVG(proteines_reel_g)::numeric AS prot_reel_moy,
    AVG(glucides_reel_g)::numeric AS gluc_reel_moy,
    AVG(lipides_reel_g)::numeric AS lip_reel_moy
  FROM nutrition_client_logs
  WHERE kcal_reel IS NOT NULL
  GROUP BY client_id, nutrition_programme_id, date_trunc('week', date_jour)
)
SELECT
  l.client_id,
  l.nutrition_programme_id,
  np.coach_id,
  l.semaine,
  l.jours_logges,
  l.kcal_reel_moy,
  l.prot_reel_moy,
  l.gluc_reel_moy,
  l.lip_reel_moy,
  -- Cibles (phase actuellement active sur cette semaine - simplification : phase 1)
  (SELECT kcal_cible FROM nutrition_phases WHERE programme_id = l.nutrition_programme_id ORDER BY ordre LIMIT 1) AS kcal_cible,
  (SELECT proteines_cible_g FROM nutrition_phases WHERE programme_id = l.nutrition_programme_id ORDER BY ordre LIMIT 1) AS prot_cible,
  (SELECT glucides_cible_g FROM nutrition_phases WHERE programme_id = l.nutrition_programme_id ORDER BY ordre LIMIT 1) AS gluc_cible,
  (SELECT lipides_cible_g FROM nutrition_phases WHERE programme_id = l.nutrition_programme_id ORDER BY ordre LIMIT 1) AS lip_cible
FROM logs_agg l
LEFT JOIN nutrition_programmes np ON np.id = l.nutrition_programme_id;

GRANT SELECT ON v_nutrition_suivi_hebdo TO authenticated;
