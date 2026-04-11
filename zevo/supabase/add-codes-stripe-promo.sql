-- ══════════════════════════════════════
-- Ajout colonne `stripe_promotion_code_id` à `codes_reduction`
-- ══════════════════════════════════════
-- Stocke l'ID du Promotion Code Stripe (différent du Coupon).
-- Le Promotion Code est le code saisi par l'utilisateur sur la page
-- Checkout/Payment Link (ex: BIENVENUE20). Le Coupon définit la
-- remise associée.

alter table codes_reduction
  add column if not exists stripe_promotion_code_id text;
