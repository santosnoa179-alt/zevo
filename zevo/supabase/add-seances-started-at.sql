-- Session 16 juillet 2026 — Historique Fitness fiche client coach.
-- Heure de lancement de la séance par le client (WorkoutTrackerPage).
-- Durée affichée coach = completed_at - started_at (ou metadata.duree_minutes).
ALTER TABLE seances ADD COLUMN IF NOT EXISTS started_at timestamptz;
COMMENT ON COLUMN seances.started_at IS 'Heure de lancement de la séance par le client. Durée = completed_at - started_at.';
