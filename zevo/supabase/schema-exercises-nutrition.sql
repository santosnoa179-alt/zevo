-- ============================================================
-- ZEVO — Exercices, Nutrition & Fix RLS Programmes
-- Colle ce fichier dans Supabase Studio > SQL Editor > New query
-- ============================================================


-- ============================================================
-- 0. FIX RLS : Ajouter policies manquantes sur programme_phases
--    (les clients doivent voir les phases de leurs programmes)
-- ============================================================

-- Policy : Client voit les phases des programmes qui lui sont assignés
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Client voit les phases de ses programmes'
  ) THEN
    CREATE POLICY "Client voit les phases de ses programmes"
      ON programme_phases FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM programme_assignations pa
        WHERE pa.programme_id = programme_phases.programme_id
        AND pa.client_id = auth.uid()
      ));
  END IF;
END $$;

-- Policy : Admin voit toutes les phases
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admin voit toutes les phases'
  ) THEN
    CREATE POLICY "Admin voit toutes les phases"
      ON programme_phases FOR SELECT
      USING (is_admin());
  END IF;
END $$;


-- ============================================================
-- 1. TABLE EXERCISES — Bibliothèque d'exercices
-- ============================================================
CREATE TABLE IF NOT EXISTS exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  muscle_group text NOT NULL,
  instructions text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(muscle_group);

-- RLS : Tout le monde peut lire les exercices (bibliothèque publique)
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Tout le monde lit les exercices'
  ) THEN
    CREATE POLICY "Tout le monde lit les exercices"
      ON exercises FOR SELECT
      USING (true);
  END IF;
END $$;

-- Seul un admin peut insert/update/delete
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admin gère les exercices'
  ) THEN
    CREATE POLICY "Admin gère les exercices"
      ON exercises FOR ALL
      USING (is_admin());
  END IF;
END $$;

-- Grant pour authenticated
GRANT SELECT ON exercises TO authenticated;
GRANT SELECT ON exercises TO anon;


-- ============================================================
-- 2. NUTRITION : Ajouter colonnes à programme_phases
-- ============================================================
ALTER TABLE programme_phases ADD COLUMN IF NOT EXISTS calories_objectif int;
ALTER TABLE programme_phases ADD COLUMN IF NOT EXISTS proteines_g int;
ALTER TABLE programme_phases ADD COLUMN IF NOT EXISTS glucides_g int;
ALTER TABLE programme_phases ADD COLUMN IF NOT EXISTS lipides_g int;
ALTER TABLE programme_phases ADD COLUMN IF NOT EXISTS consignes_nutrition text;

-- Ajouter exercices JSONB à programme_phases
-- Format: [{ exercise_id, name, sets, reps, rest_seconds, image_url }]
ALTER TABLE programme_phases ADD COLUMN IF NOT EXISTS exercices jsonb DEFAULT '[]';


-- ============================================================
-- 3. SEED : 20 exercices de musculation classiques
-- ============================================================
INSERT INTO exercises (name, category, muscle_group, instructions, image_url) VALUES
  ('Développé couché', 'Force', 'Pectoraux',
   'Allongé sur un banc, descendre la barre au niveau de la poitrine puis pousser vers le haut.',
   'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=400'),

  ('Squat barre', 'Force', 'Quadriceps',
   'Barre sur les trapèzes, descendre en pliant les genoux jusqu''à ce que les cuisses soient parallèles au sol.',
   'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?q=80&w=400'),

  ('Soulevé de terre', 'Force', 'Dos / Lombaires',
   'Pieds écartés largeur d''épaules, saisir la barre et monter en poussant les hanches vers l''avant.',
   'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?q=80&w=400'),

  ('Tractions', 'Force', 'Dorsaux',
   'Suspendu à une barre, tirer le corps vers le haut jusqu''à ce que le menton dépasse la barre.',
   'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?q=80&w=400'),

  ('Développé militaire', 'Force', 'Épaules',
   'Debout ou assis, pousser la barre ou les haltères au-dessus de la tête.',
   'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?q=80&w=400'),

  ('Rowing barre', 'Force', 'Dos',
   'Penché en avant, tirer la barre vers le nombril en serrant les omoplates.',
   'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?q=80&w=400'),

  ('Curl biceps', 'Isolation', 'Biceps',
   'Debout avec des haltères, fléchir les bras en gardant les coudes fixes le long du corps.',
   'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=400'),

  ('Extension triceps', 'Isolation', 'Triceps',
   'Poulie haute ou haltère, étendre les bras en gardant les coudes proches du corps.',
   'https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?q=80&w=400'),

  ('Fentes avant', 'Force', 'Quadriceps / Fessiers',
   'Un pas en avant, descendre le genou arrière près du sol, pousser pour revenir.',
   'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?q=80&w=400'),

  ('Hip thrust', 'Force', 'Fessiers',
   'Dos appuyé sur un banc, barre sur les hanches, pousser les hanches vers le plafond.',
   'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=400'),

  ('Pompes', 'Poids du corps', 'Pectoraux / Triceps',
   'En position planche, descendre la poitrine au sol puis pousser. Garder le corps gainé.',
   'https://images.unsplash.com/photo-1598971457999-ca4ef48a9a71?q=80&w=400'),

  ('Dips', 'Poids du corps', 'Triceps / Pectoraux',
   'Sur des barres parallèles, descendre en pliant les coudes puis remonter.',
   'https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?q=80&w=400'),

  ('Planche (gainage)', 'Gainage', 'Core / Abdominaux',
   'En appui sur les avant-bras et les pieds, maintenir le corps droit. Tenir le plus longtemps possible.',
   'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?q=80&w=400'),

  ('Crunch abdominaux', 'Isolation', 'Abdominaux',
   'Allongé, mains derrière la tête, relever les épaules en contractant les abdominaux.',
   'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=400'),

  ('Leg press', 'Machine', 'Quadriceps / Fessiers',
   'Assis sur la machine, pousser la plateforme avec les pieds en gardant le dos plaqué.',
   'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400'),

  ('Élévations latérales', 'Isolation', 'Épaules',
   'Debout avec haltères légers, lever les bras sur les côtés jusqu''à hauteur d''épaules.',
   'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=400'),

  ('Tirage vertical (poulie)', 'Force', 'Dorsaux',
   'Assis à la poulie haute, tirer la barre vers la poitrine en serrant les omoplates.',
   'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400'),

  ('Mollets debout', 'Isolation', 'Mollets',
   'Debout sur une marche, monter sur la pointe des pieds puis descendre lentement.',
   'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?q=80&w=400'),

  ('Oiseau (rear delt fly)', 'Isolation', 'Épaules arrière',
   'Penché en avant, écarter les bras avec des haltères en serrant les omoplates.',
   'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=400'),

  ('Burpees', 'Cardio / HIIT', 'Full body',
   'Squat → planche → pompe → squat → saut. Enchaîner le plus vite possible.',
   'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?q=80&w=400')

ON CONFLICT DO NOTHING;
