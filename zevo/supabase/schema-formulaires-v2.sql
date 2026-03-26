-- ════════════════════════════════════════════════
-- Formulaires V2 — Nouvelles colonnes
-- Statut, récurrence, conditions, scoring
-- ════════════════════════════════════════════════

-- 1. Statut actif / brouillon
ALTER TABLE formulaires ADD COLUMN IF NOT EXISTS statut text DEFAULT 'actif';

-- 2. Récurrence (envoi auto programmé)
-- { "intervalle": "hebdomadaire"|"mensuel", "jour": 1, "heure": "08:00", "actif": true }
ALTER TABLE formulaires ADD COLUMN IF NOT EXISTS recurrence jsonb DEFAULT null;

-- 3. Conditions d'affichage sur les champs
-- { "champ_id": "uuid-du-champ-parent", "operateur": "equals", "valeur": "Oui" }
ALTER TABLE formulaire_champs ADD COLUMN IF NOT EXISTS condition_affichage jsonb DEFAULT null;

-- 4. Poids pour le scoring automatique (null = non scoré, 1-10 = poids)
ALTER TABLE formulaire_champs ADD COLUMN IF NOT EXISTS poids_score integer DEFAULT null;
