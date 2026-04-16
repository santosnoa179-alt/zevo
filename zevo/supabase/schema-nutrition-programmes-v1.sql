-- ════════════════════════════════════════════════════════════════════
-- ZEVO — Nutrition Programmes V1 (Piste C — fondation multi-semaines)
-- ════════════════════════════════════════════════════════════════════
-- Architecture :
--   nutrition_programmes
--   └─ nutrition_phases (ordonnées, avec macros cibles différentes)
--      └─ nutrition_jour_types (journées types réutilisables dans une phase)
--         └─ nutrition_programme_repas (repas d'un type de jour)
--            └─ nutrition_programme_repas_aliments (aliments du repas)
--      └─ nutrition_phase_jours (assignation jour_type → jour de la semaine)
--
--   nutrition_repas_biblio (bibliothèque personnelle du coach)
--   └─ nutrition_repas_biblio_aliments
--
-- Les tables legacy (client_nutrition_plans, plan_repas, repas_aliments)
-- restent intactes pour les plans simples existants.
-- Colle dans Supabase Studio > SQL Editor > New query, puis Run.
-- ════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════
-- 1) TABLE PROGRAMMES
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nutrition_programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE, -- NULL = modèle
  nom text NOT NULL DEFAULT 'Nouveau programme',
  description text,
  objectif text,                                            -- ex: 'Sèche', 'Prise de masse'
  duree_semaines int NOT NULL DEFAULT 4 CHECK (duree_semaines > 0 AND duree_semaines <= 52),
  is_template boolean DEFAULT false,
  is_active boolean DEFAULT true,
  date_debut date,                                          -- quand le client commence
  document_url text,                                        -- PDF global optionnel
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- 2) TABLE PHASES
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nutrition_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES nutrition_programmes(id) ON DELETE CASCADE,
  nom text NOT NULL DEFAULT 'Phase',
  ordre int NOT NULL DEFAULT 1,                             -- ordre d'exécution (1, 2, 3...)
  semaine_debut int NOT NULL DEFAULT 1,                     -- commence à la semaine N du programme
  duree_semaines int NOT NULL DEFAULT 4 CHECK (duree_semaines > 0),
  kcal_cible int,
  proteines_cible_g int,
  glucides_cible_g int,
  lipides_cible_g int,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- 3) TABLE JOUR_TYPES (journées types réutilisables dans une phase)
--    Ex: "Jour entraînement", "Jour repos", "Refeed"
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nutrition_jour_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES nutrition_phases(id) ON DELETE CASCADE,
  nom text NOT NULL DEFAULT 'Jour type',
  icon text,                                                -- ex: 'dumbbell', 'moon', 'pizza'
  ordre int DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- 4) TABLE PHASE_JOURS (assignation jour_type → jour de la semaine)
--    jour_semaine : 0=lundi, 1=mardi, ..., 6=dimanche
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nutrition_phase_jours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES nutrition_phases(id) ON DELETE CASCADE,
  jour_semaine int NOT NULL CHECK (jour_semaine BETWEEN 0 AND 6),
  jour_type_id uuid REFERENCES nutrition_jour_types(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(phase_id, jour_semaine)
);

-- ═══════════════════════════════════════════════════════
-- 5) TABLE PROGRAMME_REPAS (repas d'un jour_type)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nutrition_programme_repas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jour_type_id uuid NOT NULL REFERENCES nutrition_jour_types(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('petit_dej', 'collation_matin', 'dejeuner', 'collation', 'diner', 'collation_soir')),
  ordre int DEFAULT 0,
  titre text,
  description text,
  proteines_g numeric DEFAULT 0,
  glucides_g numeric DEFAULT 0,
  lipides_g numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- 6) TABLE PROGRAMME_REPAS_ALIMENTS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nutrition_programme_repas_aliments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repas_id uuid NOT NULL REFERENCES nutrition_programme_repas(id) ON DELETE CASCADE,
  aliment_id uuid NOT NULL REFERENCES aliments(id) ON DELETE CASCADE,
  quantite_g numeric NOT NULL DEFAULT 100,
  ordre int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- 7) TABLE BIBLIOTHÈQUE DE REPAS (repas réutilisables par coach)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nutrition_repas_biblio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  nom text NOT NULL,
  type text CHECK (type IN ('petit_dej', 'collation_matin', 'dejeuner', 'collation', 'diner', 'collation_soir')),
  description text,
  proteines_g numeric DEFAULT 0,
  glucides_g numeric DEFAULT 0,
  lipides_g numeric DEFAULT 0,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- 8) TABLE BIBLIO_ALIMENTS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nutrition_repas_biblio_aliments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repas_biblio_id uuid NOT NULL REFERENCES nutrition_repas_biblio(id) ON DELETE CASCADE,
  aliment_id uuid NOT NULL REFERENCES aliments(id) ON DELETE CASCADE,
  quantite_g numeric NOT NULL DEFAULT 100,
  ordre int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- INDEX
-- ═══════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_nutri_prog_coach ON nutrition_programmes(coach_id);
CREATE INDEX IF NOT EXISTS idx_nutri_prog_client ON nutrition_programmes(client_id);
CREATE INDEX IF NOT EXISTS idx_nutri_prog_template ON nutrition_programmes(is_template);
CREATE INDEX IF NOT EXISTS idx_nutri_phases_prog ON nutrition_phases(programme_id, ordre);
CREATE INDEX IF NOT EXISTS idx_nutri_jourtypes_phase ON nutrition_jour_types(phase_id, ordre);
CREATE INDEX IF NOT EXISTS idx_nutri_phasejours_phase ON nutrition_phase_jours(phase_id);
CREATE INDEX IF NOT EXISTS idx_nutri_progrepas_jourtype ON nutrition_programme_repas(jour_type_id, ordre);
CREATE INDEX IF NOT EXISTS idx_nutri_progrepasalim_repas ON nutrition_programme_repas_aliments(repas_id);
CREATE INDEX IF NOT EXISTS idx_nutri_biblio_coach ON nutrition_repas_biblio(coach_id);
CREATE INDEX IF NOT EXISTS idx_nutri_biblioalim_repas ON nutrition_repas_biblio_aliments(repas_biblio_id);

-- ═══════════════════════════════════════════════════════
-- TRIGGER updated_at
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION nutri_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nutri_programmes_updated_at ON nutrition_programmes;
CREATE TRIGGER nutri_programmes_updated_at
  BEFORE UPDATE ON nutrition_programmes
  FOR EACH ROW EXECUTE FUNCTION nutri_set_updated_at();

DROP TRIGGER IF EXISTS nutri_biblio_updated_at ON nutrition_repas_biblio;
CREATE TRIGGER nutri_biblio_updated_at
  BEFORE UPDATE ON nutrition_repas_biblio
  FOR EACH ROW EXECUTE FUNCTION nutri_set_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE nutrition_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_jour_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_phase_jours ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_programme_repas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_programme_repas_aliments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_repas_biblio ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_repas_biblio_aliments ENABLE ROW LEVEL SECURITY;

-- ── PROGRAMMES ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_prog_select_coach') THEN
  CREATE POLICY nutri_prog_select_coach ON nutrition_programmes FOR SELECT TO authenticated
    USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_prog_select_client') THEN
  CREATE POLICY nutri_prog_select_client ON nutrition_programmes FOR SELECT TO authenticated
    USING (client_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_prog_insert_coach') THEN
  CREATE POLICY nutri_prog_insert_coach ON nutrition_programmes FOR INSERT TO authenticated
    WITH CHECK (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_prog_update_coach') THEN
  CREATE POLICY nutri_prog_update_coach ON nutrition_programmes FOR UPDATE TO authenticated
    USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_prog_delete_coach') THEN
  CREATE POLICY nutri_prog_delete_coach ON nutrition_programmes FOR DELETE TO authenticated
    USING (coach_id = auth.uid());
END IF;
END $$;

-- ── PHASES ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_phases_select') THEN
  CREATE POLICY nutri_phases_select ON nutrition_phases FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM nutrition_programmes p WHERE p.id = nutrition_phases.programme_id AND (p.coach_id = auth.uid() OR p.client_id = auth.uid())));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_phases_insert') THEN
  CREATE POLICY nutri_phases_insert ON nutrition_phases FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM nutrition_programmes p WHERE p.id = nutrition_phases.programme_id AND p.coach_id = auth.uid()));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_phases_update') THEN
  CREATE POLICY nutri_phases_update ON nutrition_phases FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM nutrition_programmes p WHERE p.id = nutrition_phases.programme_id AND p.coach_id = auth.uid()));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_phases_delete') THEN
  CREATE POLICY nutri_phases_delete ON nutrition_phases FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM nutrition_programmes p WHERE p.id = nutrition_phases.programme_id AND p.coach_id = auth.uid()));
END IF;
END $$;

-- ── JOUR_TYPES ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_jourtypes_select') THEN
  CREATE POLICY nutri_jourtypes_select ON nutrition_jour_types FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_phases ph
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE ph.id = nutrition_jour_types.phase_id AND (p.coach_id = auth.uid() OR p.client_id = auth.uid())
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_jourtypes_insert') THEN
  CREATE POLICY nutri_jourtypes_insert ON nutrition_jour_types FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM nutrition_phases ph
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE ph.id = nutrition_jour_types.phase_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_jourtypes_update') THEN
  CREATE POLICY nutri_jourtypes_update ON nutrition_jour_types FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_phases ph
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE ph.id = nutrition_jour_types.phase_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_jourtypes_delete') THEN
  CREATE POLICY nutri_jourtypes_delete ON nutrition_jour_types FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_phases ph
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE ph.id = nutrition_jour_types.phase_id AND p.coach_id = auth.uid()
    ));
END IF;
END $$;

-- ── PHASE_JOURS ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_phasejours_select') THEN
  CREATE POLICY nutri_phasejours_select ON nutrition_phase_jours FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_phases ph
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE ph.id = nutrition_phase_jours.phase_id AND (p.coach_id = auth.uid() OR p.client_id = auth.uid())
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_phasejours_insert') THEN
  CREATE POLICY nutri_phasejours_insert ON nutrition_phase_jours FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM nutrition_phases ph
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE ph.id = nutrition_phase_jours.phase_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_phasejours_update') THEN
  CREATE POLICY nutri_phasejours_update ON nutrition_phase_jours FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_phases ph
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE ph.id = nutrition_phase_jours.phase_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_phasejours_delete') THEN
  CREATE POLICY nutri_phasejours_delete ON nutrition_phase_jours FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_phases ph
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE ph.id = nutrition_phase_jours.phase_id AND p.coach_id = auth.uid()
    ));
END IF;
END $$;

-- ── PROGRAMME_REPAS ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_progrepas_select') THEN
  CREATE POLICY nutri_progrepas_select ON nutrition_programme_repas FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_jour_types jt
      JOIN nutrition_phases ph ON ph.id = jt.phase_id
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE jt.id = nutrition_programme_repas.jour_type_id AND (p.coach_id = auth.uid() OR p.client_id = auth.uid())
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_progrepas_insert') THEN
  CREATE POLICY nutri_progrepas_insert ON nutrition_programme_repas FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM nutrition_jour_types jt
      JOIN nutrition_phases ph ON ph.id = jt.phase_id
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE jt.id = nutrition_programme_repas.jour_type_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_progrepas_update') THEN
  CREATE POLICY nutri_progrepas_update ON nutrition_programme_repas FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_jour_types jt
      JOIN nutrition_phases ph ON ph.id = jt.phase_id
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE jt.id = nutrition_programme_repas.jour_type_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_progrepas_delete') THEN
  CREATE POLICY nutri_progrepas_delete ON nutrition_programme_repas FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_jour_types jt
      JOIN nutrition_phases ph ON ph.id = jt.phase_id
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE jt.id = nutrition_programme_repas.jour_type_id AND p.coach_id = auth.uid()
    ));
END IF;
END $$;

-- ── PROGRAMME_REPAS_ALIMENTS ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_progrepasalim_select') THEN
  CREATE POLICY nutri_progrepasalim_select ON nutrition_programme_repas_aliments FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_programme_repas r
      JOIN nutrition_jour_types jt ON jt.id = r.jour_type_id
      JOIN nutrition_phases ph ON ph.id = jt.phase_id
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE r.id = nutrition_programme_repas_aliments.repas_id AND (p.coach_id = auth.uid() OR p.client_id = auth.uid())
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_progrepasalim_insert') THEN
  CREATE POLICY nutri_progrepasalim_insert ON nutrition_programme_repas_aliments FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM nutrition_programme_repas r
      JOIN nutrition_jour_types jt ON jt.id = r.jour_type_id
      JOIN nutrition_phases ph ON ph.id = jt.phase_id
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE r.id = nutrition_programme_repas_aliments.repas_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_progrepasalim_update') THEN
  CREATE POLICY nutri_progrepasalim_update ON nutrition_programme_repas_aliments FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_programme_repas r
      JOIN nutrition_jour_types jt ON jt.id = r.jour_type_id
      JOIN nutrition_phases ph ON ph.id = jt.phase_id
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE r.id = nutrition_programme_repas_aliments.repas_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_progrepasalim_delete') THEN
  CREATE POLICY nutri_progrepasalim_delete ON nutrition_programme_repas_aliments FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_programme_repas r
      JOIN nutrition_jour_types jt ON jt.id = r.jour_type_id
      JOIN nutrition_phases ph ON ph.id = jt.phase_id
      JOIN nutrition_programmes p ON p.id = ph.programme_id
      WHERE r.id = nutrition_programme_repas_aliments.repas_id AND p.coach_id = auth.uid()
    ));
END IF;
END $$;

-- ── BIBLIOTHÈQUE DE REPAS ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_biblio_select') THEN
  CREATE POLICY nutri_biblio_select ON nutrition_repas_biblio FOR SELECT TO authenticated
    USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_biblio_insert') THEN
  CREATE POLICY nutri_biblio_insert ON nutrition_repas_biblio FOR INSERT TO authenticated
    WITH CHECK (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_biblio_update') THEN
  CREATE POLICY nutri_biblio_update ON nutrition_repas_biblio FOR UPDATE TO authenticated
    USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_biblio_delete') THEN
  CREATE POLICY nutri_biblio_delete ON nutrition_repas_biblio FOR DELETE TO authenticated
    USING (coach_id = auth.uid());
END IF;
END $$;

-- ── BIBLIO_ALIMENTS ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_biblioalim_select') THEN
  CREATE POLICY nutri_biblioalim_select ON nutrition_repas_biblio_aliments FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_repas_biblio b
      WHERE b.id = nutrition_repas_biblio_aliments.repas_biblio_id AND b.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_biblioalim_insert') THEN
  CREATE POLICY nutri_biblioalim_insert ON nutrition_repas_biblio_aliments FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM nutrition_repas_biblio b
      WHERE b.id = nutrition_repas_biblio_aliments.repas_biblio_id AND b.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_biblioalim_update') THEN
  CREATE POLICY nutri_biblioalim_update ON nutrition_repas_biblio_aliments FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_repas_biblio b
      WHERE b.id = nutrition_repas_biblio_aliments.repas_biblio_id AND b.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutri_biblioalim_delete') THEN
  CREATE POLICY nutri_biblioalim_delete ON nutrition_repas_biblio_aliments FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM nutrition_repas_biblio b
      WHERE b.id = nutrition_repas_biblio_aliments.repas_biblio_id AND b.coach_id = auth.uid()
    ));
END IF;
END $$;

-- ═══════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════
GRANT ALL ON nutrition_programmes TO authenticated;
GRANT ALL ON nutrition_phases TO authenticated;
GRANT ALL ON nutrition_jour_types TO authenticated;
GRANT ALL ON nutrition_phase_jours TO authenticated;
GRANT ALL ON nutrition_programme_repas TO authenticated;
GRANT ALL ON nutrition_programme_repas_aliments TO authenticated;
GRANT ALL ON nutrition_repas_biblio TO authenticated;
GRANT ALL ON nutrition_repas_biblio_aliments TO authenticated;
