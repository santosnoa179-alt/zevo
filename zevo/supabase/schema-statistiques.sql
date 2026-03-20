-- ============================================================
-- PHASE 5f — Statistiques & Objectifs coach
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Ajouter la colonne objectifs_business à la table coaches
alter table coaches add column if not exists objectifs_business jsonb default '{
  "clients_cible": 20,
  "ca_mensuel_cible": 2000,
  "retention_cible": 85
}';
