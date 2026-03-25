-- ============================================================
-- ZEVO — Add metadata column to plan_repas for storing
-- titre, description, macros when not using aliments
-- ============================================================

ALTER TABLE plan_repas ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- metadata structure: { titre: string, description: string, macros: { p: number, g: number, l: number } }
