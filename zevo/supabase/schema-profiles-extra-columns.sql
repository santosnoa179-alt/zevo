-- ============================================================
-- ZEVO — Ajouter colonnes manquantes à profiles
-- Corrige le PATCH 400 Bad Request
-- ============================================================

-- Colonnes métriques
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sexe text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS taille numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS poids_depart numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS poids_actuel numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS poids_cible numeric;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS genre text;

-- Colonnes objectifs
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS objectif_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_debut_coaching date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_echeance date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_limite date;

-- Colonnes style de vie
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS niveau_activite text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS niveau_sportif text;

-- Colonnes nutrition
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calories_cibles integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS proteines_cibles integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS glucides_cibles integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lipides_cibles integer;

-- Colonnes coach
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes_coach text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telephone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prenom text;
