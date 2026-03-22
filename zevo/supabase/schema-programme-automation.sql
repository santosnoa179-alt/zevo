-- ============================================================
-- ZEVO — Automatisation Programme → Habitudes / Objectifs / Tâches
-- Colle ce fichier dans Supabase Studio > SQL Editor > New query
-- ============================================================

-- 1. Ajouter programme_id sur habitudes (traçabilité)
ALTER TABLE habitudes
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES programmes(id) ON DELETE SET NULL;

-- 2. Ajouter programme_id sur objectifs (traçabilité)
ALTER TABLE objectifs
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES programmes(id) ON DELETE SET NULL;

-- 3. Ajouter programme_id + assigned_by sur taches (traçabilité)
ALTER TABLE taches
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES programmes(id) ON DELETE SET NULL;
ALTER TABLE taches
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES coaches(id);

-- 4. Index pour retrouver rapidement les entrées d'un programme
CREATE INDEX IF NOT EXISTS idx_habitudes_programme ON habitudes(programme_id);
CREATE INDEX IF NOT EXISTS idx_objectifs_programme ON objectifs(programme_id);
CREATE INDEX IF NOT EXISTS idx_taches_programme ON taches(programme_id);

-- 5. GRANTs pour que les coachs puissent insérer des taches pour leurs clients
GRANT INSERT, SELECT, UPDATE, DELETE ON taches TO authenticated;
