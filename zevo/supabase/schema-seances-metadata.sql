-- ============================================================
-- ZEVO — Ajout colonne metadata JSONB sur seances
-- Permet de stocker des données annexes (fichiers joints, etc.)
-- ============================================================

ALTER TABLE seances ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

COMMENT ON COLUMN seances.metadata IS 'Données annexes JSON : fichiers joints, paramètres custom, etc.';
