-- ══════════════════════════════════════
-- Ajout colonne `stripe_url` à la table `liens_paiement`
-- ══════════════════════════════════════
-- Stocke l'URL Stripe hostée (buy.stripe.com/xxx) générée par
-- l'API /api/create-payment-link lors de la création du lien.
-- Le coach peut ainsi copier un lien qui amène directement sur
-- la page de paiement Stripe (argent encaissé sur son compte Connect).

alter table liens_paiement
  add column if not exists stripe_url text;

-- ✅ Colonne optionnelle : les anciens liens locaux (slug /pay/xxx)
--    restent valides mais ne seront plus créés.
