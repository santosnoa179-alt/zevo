-- ============================================================
-- FIX GRANTS — Résout les erreurs 403 Forbidden
-- Les tables existent + RLS est activé, mais le rôle
-- "authenticated" n'a pas les permissions d'accès.
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ── abonnements_clients ──
GRANT ALL ON abonnements_clients TO authenticated;
GRANT ALL ON abonnements_clients TO service_role;

-- ── factures ──
GRANT ALL ON factures TO authenticated;
GRANT ALL ON factures TO service_role;

-- ── liens_paiement ──
GRANT ALL ON liens_paiement TO authenticated;
GRANT ALL ON liens_paiement TO service_role;

-- ── codes_reduction ──
GRANT ALL ON codes_reduction TO authenticated;
GRANT ALL ON codes_reduction TO service_role;

-- ── virements_coach ──
GRANT ALL ON virements_coach TO authenticated;
GRANT ALL ON virements_coach TO service_role;

-- ============================================================
-- VÉRIFICATION — Lance ceci après pour confirmer
-- ============================================================
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.table_privileges
-- WHERE table_name IN ('abonnements_clients','factures','liens_paiement','codes_reduction','virements_coach')
-- AND grantee = 'authenticated';
