-- Bridge entre la table exercices (custom par coach) et la nouvelle library exercises (ExerciseDB)
-- Permet aux coachs d'ajouter les 1000 exercices du catalogue dans leurs programmes
-- sans duplication: chaque library_exercise n'est importe qu'une fois par coach

ALTER TABLE exercices ADD COLUMN IF NOT EXISTS library_id text;
ALTER TABLE exercices ADD COLUMN IF NOT EXISTS gif_url text;

-- Index pour lookup rapide "est-ce que ce coach a deja importe cet exo de la library ?"
CREATE INDEX IF NOT EXISTS idx_exercices_library ON exercices(coach_id, library_id);

-- Commentaires
COMMENT ON COLUMN exercices.library_id IS 'Si non-null, reference une entree de la table exercises (ExerciseDB). Permet de ne pas dupliquer quand un coach ajoute plusieurs fois le meme exo du catalogue.';
COMMENT ON COLUMN exercices.gif_url IS 'URL du GIF animé (cache Supabase Storage) - copiee depuis exercises.gif_url lors de l import';
