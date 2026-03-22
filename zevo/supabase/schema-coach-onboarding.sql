-- ============================================================
-- ZEVO — Colonnes Onboarding Coach
-- Colle dans Supabase Studio > SQL Editor > New query
-- ============================================================

-- Colonnes profil coach
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS prenom text;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS nom text;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS telephone text;

-- Colonnes activité
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS metier text;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS nb_clients_moyen text;

-- Colonnes besoins (array de texte)
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS priorites text[] DEFAULT '{}';

-- Flag onboarding terminé
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;
