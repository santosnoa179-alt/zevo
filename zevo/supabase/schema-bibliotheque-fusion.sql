-- ════════════════════════════════════════════════
-- Bibliothèque Fusion — Nouvelles colonnes
-- Dossiers, taille fichier, favoris
-- ════════════════════════════════════════════════

-- 1. Dossier parent (lien vers drive_folders)
ALTER TABLE ressources ADD COLUMN IF NOT EXISTS dossier_id uuid REFERENCES drive_folders(id) ON DELETE SET NULL;

-- 2. Taille du fichier en octets
ALTER TABLE ressources ADD COLUMN IF NOT EXISTS taille bigint DEFAULT null;

-- 3. Favori (mis en avant par le coach)
ALTER TABLE ressources ADD COLUMN IF NOT EXISTS favori boolean DEFAULT false;

-- Index pour accélérer les requêtes par dossier
CREATE INDEX IF NOT EXISTS idx_ressources_dossier_id ON ressources(dossier_id);

-- Index pour les favoris
CREATE INDEX IF NOT EXISTS idx_ressources_favori ON ressources(favori) WHERE favori = true;
