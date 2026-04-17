-- ════════════════════════════════════════════════════════════════════
-- MIGRATION : Sport Programmes → utiliser la table `exercises` (ExerciseDB)
-- ════════════════════════════════════════════════════════════════════
-- Problème : le schema initial référençait `exercices` (table coach, uuid id).
-- Correction : basculer vers `exercises` (catalogue ExerciseDB, text id)
-- pour bénéficier des ~1500 exercices avec GIFs animés déjà disponibles.
--
-- À exécuter UNE SEULE FOIS après le schema-sport-programmes-v1.sql
-- si tu l'as déjà appliqué. Pour une install fresh, le schema V1 a été
-- mis à jour — pas besoin de cette migration.
-- ════════════════════════════════════════════════════════════════════

-- Drop les FK existantes vers exercices (uuid)
ALTER TABLE sport_seance_exercices DROP CONSTRAINT IF EXISTS sport_seance_exercices_exercice_id_fkey;
ALTER TABLE sport_seances_biblio_exercices DROP CONSTRAINT IF EXISTS sport_seances_biblio_exercices_exercice_id_fkey;

-- Change le type de uuid à text
ALTER TABLE sport_seance_exercices
  ALTER COLUMN exercice_id TYPE text USING NULL;

ALTER TABLE sport_seances_biblio_exercices
  ALTER COLUMN exercice_id TYPE text USING NULL;

-- Recrée les FK vers exercises (text id)
ALTER TABLE sport_seance_exercices
  ADD CONSTRAINT sport_seance_exercices_exercice_id_fkey
  FOREIGN KEY (exercice_id) REFERENCES exercises(id) ON DELETE SET NULL;

ALTER TABLE sport_seances_biblio_exercices
  ADD CONSTRAINT sport_seances_biblio_exercices_exercice_id_fkey
  FOREIGN KEY (exercice_id) REFERENCES exercises(id) ON DELETE SET NULL;
