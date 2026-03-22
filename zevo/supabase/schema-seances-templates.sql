-- ============================================================
-- ZEVO — Séances modèles (templates)
-- Colle dans Supabase Studio > SQL Editor > New query
-- ============================================================

-- ── 1. Ajouter is_template à la table seances ──
ALTER TABLE seances ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

-- ── 2. Rendre client_id nullable (modèles n'ont pas forcément de client) ──
ALTER TABLE seances ALTER COLUMN client_id DROP NOT NULL;

-- ── 3. Rendre date_prevue nullable (modèles n'ont pas de date) ──
ALTER TABLE seances ALTER COLUMN date_prevue DROP NOT NULL;

-- ── 4. Index sur is_template ──
CREATE INDEX IF NOT EXISTS idx_seances_template ON seances(is_template) WHERE is_template = true;

-- ── 5. Politique RLS pour les modèles (coach voit ses propres templates) ──
-- Les policies existantes (seances_select_own, etc.) couvrent déjà
-- coach_id = auth.uid(), ce qui inclut les templates.
-- Rien de plus à ajouter.
