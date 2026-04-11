-- ══════════════════════════════════════
-- Ajout colonne `description` à la table `factures`
-- ══════════════════════════════════════
-- Nécessaire pour la création manuelle de factures depuis
-- la page Paiements > Factures > "Nouvelle facture"

alter table factures
  add column if not exists description text;

-- ✅ Rien de plus à faire : la colonne est optionnelle (nullable)
