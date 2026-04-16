-- Ajoute un champ note_coach sur seance_exercices pour que le coach puisse
-- laisser une consigne personnalisee par exercice (ex: "RPE 8", "Focus gainage",
-- "Charge 80% 1RM", "Cadence lente a la descente")

ALTER TABLE seance_exercices ADD COLUMN IF NOT EXISTS note_coach text;

COMMENT ON COLUMN seance_exercices.note_coach IS 'Consigne personnalisee du coach pour cet exercice dans cette seance. Affichee au client lors de sa seance.';
