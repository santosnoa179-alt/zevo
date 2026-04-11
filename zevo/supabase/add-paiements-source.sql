-- ══════════════════════════════════════
-- Ajout colonne `source` à `paiements_clients`
-- ══════════════════════════════════════
-- Distingue les paiements Stripe des transactions manuelles
-- (espèces, virement, chèque) ajoutées par le coach.

alter table paiements_clients
  add column if not exists source text
  check (source in ('stripe','manuel'))
  default 'stripe';

-- ✅ Par défaut 'stripe' pour tous les anciens paiements
-- ✅ 'manuel' permettra au coach d'enregistrer un coaching payé hors-ligne
