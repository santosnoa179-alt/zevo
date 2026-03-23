-- ============================================================
-- ZEVO — Ajouter image_url aux exercices
-- ============================================================

ALTER TABLE exercices ADD COLUMN IF NOT EXISTS image_url text;

-- Index pour recherche rapide par category
CREATE INDEX IF NOT EXISTS idx_exercices_category ON exercices(category);
