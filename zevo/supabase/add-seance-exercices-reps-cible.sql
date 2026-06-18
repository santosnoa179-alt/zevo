-- Session 16 juin 2026 — Fix "exercices Pro invisibles côté client/coach".
-- Quand un programme Pro est déployé au calendrier (CoachSportPage.handleAssignPro
-- / CoachClientHub.redeployProgramme), les exercices sont copiés dans
-- seance_exercices. Deux problèmes empêchaient l'insert (PGRST204) :
--   1. La colonne reps_cible (text, ex. "8-12") n'existait pas — le code la
--      remplissait, l'insert échouait, les séances déployées restaient vides.
--   2. exercice_id était NOT NULL alors que les exos Pro V3 (ExerciseDB) n'ont
--      pas d'exercice "legacy" uuid → on insère NULL et on résout le nom/gif via
--      sport_seance_exercices.exercice_id (text) côté lecture.

ALTER TABLE seance_exercices ADD COLUMN IF NOT EXISTS reps_cible text;
ALTER TABLE seance_exercices ALTER COLUMN exercice_id DROP NOT NULL;

COMMENT ON COLUMN seance_exercices.reps_cible IS 'Objectif de répétitions au format texte (ex. "8-12", "AMRAP"). Prioritaire sur la colonne reps (integer) côté affichage client. Renseigné pour les exercices déployés depuis un programme Pro V3.';
