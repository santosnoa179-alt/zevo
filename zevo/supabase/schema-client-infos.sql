-- ============================================================
-- ZEVO — Colonnes profil enrichi client (Hub 360°)
-- Colle dans Supabase Studio > SQL Editor > New query
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age int;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS genre text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS taille int;              -- cm
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS poids_depart numeric;    -- kg
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS poids_actuel numeric;    -- kg
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS poids_cible numeric;     -- kg
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS objectif_type text;      -- ex: 'Perte de poids'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS niveau_activite text;    -- ex: 'Sédentaire', 'Modéré'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS niveau_sportif text;     -- ex: 'Débutant', 'Intermédiaire'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calories_cibles int;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_debut_coaching date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_echeance date;
