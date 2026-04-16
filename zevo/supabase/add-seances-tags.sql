-- Ajoute un champ tags sur seances pour permettre au coach de categoriser
-- ses seances (ex: "Push", "Pull", "Legs", "Cardio", "HIIT", "Mobilite").
-- Les tags sont utilises pour filtrer rapidement le calendrier.

ALTER TABLE seances ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_seances_tags ON seances USING gin(tags);

COMMENT ON COLUMN seances.tags IS 'Tags libres du coach pour categoriser la seance (ex: Push, Pull, Legs, Cardio, HIIT). Utilise pour le filtrage dans le calendrier.';
