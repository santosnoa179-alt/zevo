-- ============================================================
-- ZEVO — Ressources attachées aux phases de programme
-- Colle ce fichier dans Supabase Studio > SQL Editor > New query
-- ============================================================

-- Ajoute un champ JSONB pour stocker les ressources liées à chaque phase
-- Format: [{ id, titre, type, url, categorie, description }]
ALTER TABLE programme_phases
  ADD COLUMN IF NOT EXISTS ressources_attachees jsonb DEFAULT '[]';
