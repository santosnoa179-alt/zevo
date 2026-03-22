-- ============================================================
-- ZEVO — Tables pour le Nutrition Builder
-- Colle dans Supabase Studio > SQL Editor > New query
-- ============================================================

-- ── Table aliments (bibliothèque nutritionnelle) ──
CREATE TABLE IF NOT EXISTS aliments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES coaches(id) ON DELETE CASCADE,  -- NULL = aliment Zevo officiel
  nom text NOT NULL,
  categorie text,                    -- ex: 'Protéine', 'Féculent', 'Légume', 'Fruit', 'Lipide', 'Laitier', 'Snack'
  kcal_100g numeric NOT NULL DEFAULT 0,
  proteines numeric NOT NULL DEFAULT 0,   -- grammes pour 100g
  glucides numeric NOT NULL DEFAULT 0,
  lipides numeric NOT NULL DEFAULT 0,
  fibres numeric DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- ── Table plans nutrition client ──
CREATE TABLE IF NOT EXISTS client_nutrition_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date_plan date NOT NULL DEFAULT current_date,
  nom text DEFAULT 'Plan du jour',
  created_at timestamptz DEFAULT now()
);

-- ── Table repas (un plan contient plusieurs repas) ──
CREATE TABLE IF NOT EXISTS plan_repas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES client_nutrition_plans(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('petit_dej', 'dejeuner', 'diner', 'collation')),
  ordre int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ── Table items d'un repas (aliment + quantité) ──
CREATE TABLE IF NOT EXISTS repas_aliments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repas_id uuid NOT NULL REFERENCES plan_repas(id) ON DELETE CASCADE,
  aliment_id uuid NOT NULL REFERENCES aliments(id) ON DELETE CASCADE,
  quantite_g numeric NOT NULL DEFAULT 100,
  ordre int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ── Index ──
CREATE INDEX IF NOT EXISTS idx_aliments_coach ON aliments(coach_id);
CREATE INDEX IF NOT EXISTS idx_aliments_categorie ON aliments(categorie);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_coach ON client_nutrition_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_client ON client_nutrition_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_date ON client_nutrition_plans(date_plan);
CREATE INDEX IF NOT EXISTS idx_plan_repas_plan ON plan_repas(plan_id);
CREATE INDEX IF NOT EXISTS idx_repas_aliments_repas ON repas_aliments(repas_id);

-- ══════════════════════════════════════
-- RLS
-- ══════════════════════════════════════

ALTER TABLE aliments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_repas ENABLE ROW LEVEL SECURITY;
ALTER TABLE repas_aliments ENABLE ROW LEVEL SECURITY;

-- ── Aliments ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'aliments_select') THEN
  CREATE POLICY aliments_select ON aliments FOR SELECT TO authenticated
    USING (coach_id IS NULL OR coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'aliments_insert_coach') THEN
  CREATE POLICY aliments_insert_coach ON aliments FOR INSERT TO authenticated
    WITH CHECK (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'aliments_update_coach') THEN
  CREATE POLICY aliments_update_coach ON aliments FOR UPDATE TO authenticated
    USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'aliments_delete_coach') THEN
  CREATE POLICY aliments_delete_coach ON aliments FOR DELETE TO authenticated
    USING (coach_id = auth.uid());
END IF;
END $$;

-- ── Plans nutrition ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutrition_plans_select_coach') THEN
  CREATE POLICY nutrition_plans_select_coach ON client_nutrition_plans FOR SELECT TO authenticated
    USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutrition_plans_insert_coach') THEN
  CREATE POLICY nutrition_plans_insert_coach ON client_nutrition_plans FOR INSERT TO authenticated
    WITH CHECK (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutrition_plans_update_coach') THEN
  CREATE POLICY nutrition_plans_update_coach ON client_nutrition_plans FOR UPDATE TO authenticated
    USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutrition_plans_delete_coach') THEN
  CREATE POLICY nutrition_plans_delete_coach ON client_nutrition_plans FOR DELETE TO authenticated
    USING (coach_id = auth.uid());
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nutrition_plans_select_client') THEN
  CREATE POLICY nutrition_plans_select_client ON client_nutrition_plans FOR SELECT TO authenticated
    USING (client_id = auth.uid());
END IF;
END $$;

-- ── Plan repas ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'plan_repas_select') THEN
  CREATE POLICY plan_repas_select ON plan_repas FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM client_nutrition_plans p WHERE p.id = plan_repas.plan_id AND (p.coach_id = auth.uid() OR p.client_id = auth.uid())));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'plan_repas_insert') THEN
  CREATE POLICY plan_repas_insert ON plan_repas FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM client_nutrition_plans p WHERE p.id = plan_repas.plan_id AND p.coach_id = auth.uid()));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'plan_repas_update') THEN
  CREATE POLICY plan_repas_update ON plan_repas FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM client_nutrition_plans p WHERE p.id = plan_repas.plan_id AND p.coach_id = auth.uid()));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'plan_repas_delete') THEN
  CREATE POLICY plan_repas_delete ON plan_repas FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM client_nutrition_plans p WHERE p.id = plan_repas.plan_id AND p.coach_id = auth.uid()));
END IF;
END $$;

-- ── Repas aliments ──
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'repas_aliments_select') THEN
  CREATE POLICY repas_aliments_select ON repas_aliments FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM plan_repas r
      JOIN client_nutrition_plans p ON p.id = r.plan_id
      WHERE r.id = repas_aliments.repas_id AND (p.coach_id = auth.uid() OR p.client_id = auth.uid())
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'repas_aliments_insert') THEN
  CREATE POLICY repas_aliments_insert ON repas_aliments FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM plan_repas r
      JOIN client_nutrition_plans p ON p.id = r.plan_id
      WHERE r.id = repas_aliments.repas_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'repas_aliments_update') THEN
  CREATE POLICY repas_aliments_update ON repas_aliments FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM plan_repas r
      JOIN client_nutrition_plans p ON p.id = r.plan_id
      WHERE r.id = repas_aliments.repas_id AND p.coach_id = auth.uid()
    ));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'repas_aliments_delete') THEN
  CREATE POLICY repas_aliments_delete ON repas_aliments FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM plan_repas r
      JOIN client_nutrition_plans p ON p.id = r.plan_id
      WHERE r.id = repas_aliments.repas_id AND p.coach_id = auth.uid()
    ));
END IF;
END $$;

-- ── Grants ──
GRANT ALL ON aliments TO authenticated;
GRANT ALL ON client_nutrition_plans TO authenticated;
GRANT ALL ON plan_repas TO authenticated;
GRANT ALL ON repas_aliments TO authenticated;
