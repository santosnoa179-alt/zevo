-- ════════════════════════════════════════════════════════════════════
-- ZEVO — Sport Programmes V1 + V2 (Piste A + B)
-- ════════════════════════════════════════════════════════════════════
-- Architecture (parallèle à nutrition_programmes) :
--
--   sport_programmes (programme multi-semaines complet)
--   └─ sport_phases (ordonnées, objectifs différents)
--      └─ sport_seance_types (journées types réutilisables : Push, Pull, Legs…)
--      │  └─ sport_seance_exercices (exos avec sets, reps, charge, RPE, tempo,
--      │                             rest, supersets, notes coach, progression)
--      └─ sport_phase_jours (assignation seance_type → jour_semaine)
--
--   sport_seances_biblio (bibliothèque personnelle du coach)
--   └─ sport_seances_biblio_exercices
--
-- Les tables legacy `programmes` + `seances` + `seance_exercices` restent
-- intactes pour les programmes "simples" existants.
-- Les exercices de référence viennent de la table `exercices` déjà existante.
--
-- À exécuter dans Supabase Studio > SQL Editor > Run.
-- ════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════
-- 1) TABLE PROGRAMMES SPORT
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sport_programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE, -- NULL = modèle
  nom text NOT NULL DEFAULT 'Nouveau programme',
  description text,
  objectif text,                                              -- 'Hypertrophie', 'Force', 'Puissance', etc.
  duree_semaines int NOT NULL DEFAULT 8 CHECK (duree_semaines > 0 AND duree_semaines <= 52),
  is_template boolean DEFAULT false,
  is_active boolean DEFAULT true,
  date_debut date,
  frequence_hebdo int DEFAULT 4,                              -- séances/semaine ciblées
  niveau text,                                                -- 'debutant', 'intermediaire', 'avance'
  document_url text,                                          -- PDF global optionnel
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- 2) TABLE PHASES
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sport_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES sport_programmes(id) ON DELETE CASCADE,
  nom text NOT NULL DEFAULT 'Phase',
  ordre int NOT NULL DEFAULT 1,
  semaine_debut int NOT NULL DEFAULT 1,
  duree_semaines int NOT NULL DEFAULT 4 CHECK (duree_semaines > 0),
  objectif_focus text,                                        -- 'hypertrophie', 'force', 'deload', 'puissance', 'endurance', 'peak'
  volume_cible_hebdo_sets int,                                -- total de séries/sem cible
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- 3) TABLE SÉANCE TYPES (journées réutilisables)
--    Ex: "Push", "Pull", "Legs", "Upper", "Lower", "Cardio", "Repos"
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sport_seance_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES sport_phases(id) ON DELETE CASCADE,
  nom text NOT NULL DEFAULT 'Séance',
  focus text,                                                 -- 'push', 'pull', 'legs', 'upper', 'lower', 'fullbody', 'cardio', 'mobility', 'repos'
  icon text,                                                  -- nom de l'icône lucide
  ordre int DEFAULT 1,
  duree_estimee_min int,                                      -- ex: 60
  notes text,                                                 -- briefing général de la séance
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- 4) TABLE PHASE_JOURS (assignation seance_type → jour_semaine)
--    jour_semaine : 0=lundi, 1=mardi, ..., 6=dimanche
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sport_phase_jours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES sport_phases(id) ON DELETE CASCADE,
  jour_semaine int NOT NULL CHECK (jour_semaine BETWEEN 0 AND 6),
  seance_type_id uuid REFERENCES sport_seance_types(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(phase_id, jour_semaine)
);

-- ═══════════════════════════════════════════════════════
-- 5) TABLE SÉANCE EXERCICES (exos avec tous les paramètres avancés)
--    exercice_id est TEXT car référence la table `exercises` (ExerciseDB)
--    qui a ~1500 exos avec GIFs animés déjà disponibles.
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sport_seance_exercices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seance_type_id uuid NOT NULL REFERENCES sport_seance_types(id) ON DELETE CASCADE,
  exercice_id text REFERENCES exercises(id) ON DELETE SET NULL,
  -- Fallback si l'exercice n'est pas dans la biblio officielle
  exercice_nom_custom text,                                   -- nom libre si pas d'exercice référencé
  ordre int NOT NULL DEFAULT 0,

  -- Sets & reps
  series int DEFAULT 3,                                       -- nombre de séries
  reps_cible text DEFAULT '8-12',                             -- '8', '8-12', 'AMRAP', '5x5', '30s'

  -- Charge
  charge_kg numeric,                                          -- charge semaine 1
  charge_unite text DEFAULT 'kg',                             -- 'kg', 'lb', 'poids_corps', 'elastique', 'none'

  -- Progression automatique (Piste B)
  progression_type text DEFAULT 'fixe' CHECK (progression_type IN ('fixe', 'lineaire', 'double', 'pourcentage')),
  progression_value numeric,                                  -- +2.5kg/sem, ou +5%, ou reps +1
  progression_freq text DEFAULT 'semaine',                    -- 'semaine', 'seance', 'deux_semaines'

  -- Autoregulation (Piste B)
  rpe_cible numeric CHECK (rpe_cible >= 0 AND rpe_cible <= 10), -- 0-10, 10 = échec total
  rir_cible int CHECK (rir_cible >= 0 AND rir_cible <= 10),    -- Reps In Reserve (inverse du RPE)

  -- Technique (Piste B)
  tempo text,                                                 -- '3-1-2-0' (ecc-pause bas-conc-pause haut)
  rest_sec int DEFAULT 90,                                    -- repos entre séries en secondes

  -- Regroupement (supersets, circuits)
  superset_group text,                                        -- 'A', 'B' (même lettre = groupés), null = solo
  technique text,                                             -- 'superset', 'giant_set', 'circuit', 'drop_set', 'rest_pause', 'cluster', null

  -- Notes du coach
  notes_coach text,                                           -- cues techniques, à voix haute

  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- 6) TABLE BIBLIOTHÈQUE DE SÉANCES (séances réutilisables par coach)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sport_seances_biblio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  nom text NOT NULL,
  focus text,
  icon text,
  duree_estimee_min int,
  notes text,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- 7) TABLE BIBLIO_EXERCICES (exos d'une séance de la biblio)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sport_seances_biblio_exercices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seance_biblio_id uuid NOT NULL REFERENCES sport_seances_biblio(id) ON DELETE CASCADE,
  exercice_id text REFERENCES exercises(id) ON DELETE SET NULL,
  exercice_nom_custom text,
  ordre int NOT NULL DEFAULT 0,
  series int DEFAULT 3,
  reps_cible text DEFAULT '8-12',
  charge_kg numeric,
  charge_unite text DEFAULT 'kg',
  progression_type text DEFAULT 'fixe',
  progression_value numeric,
  progression_freq text DEFAULT 'semaine',
  rpe_cible numeric,
  rir_cible int,
  tempo text,
  rest_sec int DEFAULT 90,
  superset_group text,
  technique text,
  notes_coach text,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- INDEX
-- ═══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_sport_prog_coach ON sport_programmes(coach_id);
CREATE INDEX IF NOT EXISTS idx_sport_prog_client ON sport_programmes(client_id);
CREATE INDEX IF NOT EXISTS idx_sport_prog_template ON sport_programmes(is_template);
CREATE INDEX IF NOT EXISTS idx_sport_phases_prog ON sport_phases(programme_id, ordre);
CREATE INDEX IF NOT EXISTS idx_sport_seancetypes_phase ON sport_seance_types(phase_id, ordre);
CREATE INDEX IF NOT EXISTS idx_sport_phasejours_phase ON sport_phase_jours(phase_id);
CREATE INDEX IF NOT EXISTS idx_sport_seanceexos_type ON sport_seance_exercices(seance_type_id, ordre);
CREATE INDEX IF NOT EXISTS idx_sport_seanceexos_exo ON sport_seance_exercices(exercice_id);
CREATE INDEX IF NOT EXISTS idx_sport_biblio_coach ON sport_seances_biblio(coach_id);
CREATE INDEX IF NOT EXISTS idx_sport_biblioexos_seance ON sport_seances_biblio_exercices(seance_biblio_id);

-- ═══════════════════════════════════════════════════════
-- TRIGGER updated_at
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION sport_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sport_programmes_updated_at ON sport_programmes;
CREATE TRIGGER sport_programmes_updated_at
  BEFORE UPDATE ON sport_programmes
  FOR EACH ROW EXECUTE FUNCTION sport_set_updated_at();

DROP TRIGGER IF EXISTS sport_biblio_updated_at ON sport_seances_biblio;
CREATE TRIGGER sport_biblio_updated_at
  BEFORE UPDATE ON sport_seances_biblio
  FOR EACH ROW EXECUTE FUNCTION sport_set_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE sport_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_seance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_phase_jours ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_seance_exercices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_seances_biblio ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_seances_biblio_exercices ENABLE ROW LEVEL SECURITY;

-- ── PROGRAMMES ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_prog_select_coach') THEN
  CREATE POLICY sport_prog_select_coach ON sport_programmes FOR SELECT TO authenticated USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_prog_select_client') THEN
  CREATE POLICY sport_prog_select_client ON sport_programmes FOR SELECT TO authenticated USING (client_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_prog_insert_coach') THEN
  CREATE POLICY sport_prog_insert_coach ON sport_programmes FOR INSERT TO authenticated WITH CHECK (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_prog_update_coach') THEN
  CREATE POLICY sport_prog_update_coach ON sport_programmes FOR UPDATE TO authenticated USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_prog_delete_coach') THEN
  CREATE POLICY sport_prog_delete_coach ON sport_programmes FOR DELETE TO authenticated USING (coach_id = auth.uid());
END IF;
END $$;

-- ── PHASES ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_phases_select') THEN
  CREATE POLICY sport_phases_select ON sport_phases FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM sport_programmes p WHERE p.id = sport_phases.programme_id AND (p.coach_id = auth.uid() OR p.client_id = auth.uid())));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_phases_insert') THEN
  CREATE POLICY sport_phases_insert ON sport_phases FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM sport_programmes p WHERE p.id = sport_phases.programme_id AND p.coach_id = auth.uid()));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_phases_update') THEN
  CREATE POLICY sport_phases_update ON sport_phases FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM sport_programmes p WHERE p.id = sport_phases.programme_id AND p.coach_id = auth.uid()));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_phases_delete') THEN
  CREATE POLICY sport_phases_delete ON sport_phases FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM sport_programmes p WHERE p.id = sport_phases.programme_id AND p.coach_id = auth.uid()));
END IF;
END $$;

-- ── SÉANCE TYPES ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_seancetypes_select') THEN
  CREATE POLICY sport_seancetypes_select ON sport_seance_types FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM sport_phases ph JOIN sport_programmes p ON p.id = ph.programme_id
      WHERE ph.id = sport_seance_types.phase_id AND (p.coach_id = auth.uid() OR p.client_id = auth.uid())
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_seancetypes_insert') THEN
  CREATE POLICY sport_seancetypes_insert ON sport_seance_types FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM sport_phases ph JOIN sport_programmes p ON p.id = ph.programme_id
      WHERE ph.id = sport_seance_types.phase_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_seancetypes_update') THEN
  CREATE POLICY sport_seancetypes_update ON sport_seance_types FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM sport_phases ph JOIN sport_programmes p ON p.id = ph.programme_id
      WHERE ph.id = sport_seance_types.phase_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_seancetypes_delete') THEN
  CREATE POLICY sport_seancetypes_delete ON sport_seance_types FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM sport_phases ph JOIN sport_programmes p ON p.id = ph.programme_id
      WHERE ph.id = sport_seance_types.phase_id AND p.coach_id = auth.uid()
    ));
END IF;
END $$;

-- ── PHASE_JOURS ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_phasejours_select') THEN
  CREATE POLICY sport_phasejours_select ON sport_phase_jours FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM sport_phases ph JOIN sport_programmes p ON p.id = ph.programme_id
      WHERE ph.id = sport_phase_jours.phase_id AND (p.coach_id = auth.uid() OR p.client_id = auth.uid())
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_phasejours_insert') THEN
  CREATE POLICY sport_phasejours_insert ON sport_phase_jours FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM sport_phases ph JOIN sport_programmes p ON p.id = ph.programme_id
      WHERE ph.id = sport_phase_jours.phase_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_phasejours_update') THEN
  CREATE POLICY sport_phasejours_update ON sport_phase_jours FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM sport_phases ph JOIN sport_programmes p ON p.id = ph.programme_id
      WHERE ph.id = sport_phase_jours.phase_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_phasejours_delete') THEN
  CREATE POLICY sport_phasejours_delete ON sport_phase_jours FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM sport_phases ph JOIN sport_programmes p ON p.id = ph.programme_id
      WHERE ph.id = sport_phase_jours.phase_id AND p.coach_id = auth.uid()
    ));
END IF;
END $$;

-- ── SEANCE_EXERCICES ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_seanceexos_select') THEN
  CREATE POLICY sport_seanceexos_select ON sport_seance_exercices FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM sport_seance_types st
      JOIN sport_phases ph ON ph.id = st.phase_id
      JOIN sport_programmes p ON p.id = ph.programme_id
      WHERE st.id = sport_seance_exercices.seance_type_id AND (p.coach_id = auth.uid() OR p.client_id = auth.uid())
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_seanceexos_insert') THEN
  CREATE POLICY sport_seanceexos_insert ON sport_seance_exercices FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM sport_seance_types st
      JOIN sport_phases ph ON ph.id = st.phase_id
      JOIN sport_programmes p ON p.id = ph.programme_id
      WHERE st.id = sport_seance_exercices.seance_type_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_seanceexos_update') THEN
  CREATE POLICY sport_seanceexos_update ON sport_seance_exercices FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM sport_seance_types st
      JOIN sport_phases ph ON ph.id = st.phase_id
      JOIN sport_programmes p ON p.id = ph.programme_id
      WHERE st.id = sport_seance_exercices.seance_type_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_seanceexos_delete') THEN
  CREATE POLICY sport_seanceexos_delete ON sport_seance_exercices FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM sport_seance_types st
      JOIN sport_phases ph ON ph.id = st.phase_id
      JOIN sport_programmes p ON p.id = ph.programme_id
      WHERE st.id = sport_seance_exercices.seance_type_id AND p.coach_id = auth.uid()
    ));
END IF;
END $$;

-- ── BIBLIOTHÈQUE DE SÉANCES ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_biblio_select') THEN
  CREATE POLICY sport_biblio_select ON sport_seances_biblio FOR SELECT TO authenticated USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_biblio_insert') THEN
  CREATE POLICY sport_biblio_insert ON sport_seances_biblio FOR INSERT TO authenticated WITH CHECK (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_biblio_update') THEN
  CREATE POLICY sport_biblio_update ON sport_seances_biblio FOR UPDATE TO authenticated USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_biblio_delete') THEN
  CREATE POLICY sport_biblio_delete ON sport_seances_biblio FOR DELETE TO authenticated USING (coach_id = auth.uid());
END IF;
END $$;

-- ── BIBLIO_EXERCICES ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_biblioexos_select') THEN
  CREATE POLICY sport_biblioexos_select ON sport_seances_biblio_exercices FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM sport_seances_biblio b WHERE b.id = sport_seances_biblio_exercices.seance_biblio_id AND b.coach_id = auth.uid()));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_biblioexos_insert') THEN
  CREATE POLICY sport_biblioexos_insert ON sport_seances_biblio_exercices FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM sport_seances_biblio b WHERE b.id = sport_seances_biblio_exercices.seance_biblio_id AND b.coach_id = auth.uid()));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_biblioexos_update') THEN
  CREATE POLICY sport_biblioexos_update ON sport_seances_biblio_exercices FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM sport_seances_biblio b WHERE b.id = sport_seances_biblio_exercices.seance_biblio_id AND b.coach_id = auth.uid()));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sport_biblioexos_delete') THEN
  CREATE POLICY sport_biblioexos_delete ON sport_seances_biblio_exercices FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM sport_seances_biblio b WHERE b.id = sport_seances_biblio_exercices.seance_biblio_id AND b.coach_id = auth.uid()));
END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════
GRANT ALL ON sport_programmes TO authenticated;
GRANT ALL ON sport_phases TO authenticated;
GRANT ALL ON sport_seance_types TO authenticated;
GRANT ALL ON sport_phase_jours TO authenticated;
GRANT ALL ON sport_seance_exercices TO authenticated;
GRANT ALL ON sport_seances_biblio TO authenticated;
GRANT ALL ON sport_seances_biblio_exercices TO authenticated;
