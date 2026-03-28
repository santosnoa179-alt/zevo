-- ZEVO — Ajouter media_url aux seance_exercices
-- Permet au coach d'attacher un lien vidéo/image par exercice dans une séance

ALTER TABLE seance_exercices ADD COLUMN IF NOT EXISTS media_url text;
