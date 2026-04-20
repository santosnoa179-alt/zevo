-- ════════════════════════════════════════════════════════════════
-- ZEVO — CLEANUP SEED DÉMO COACH
-- ════════════════════════════════════════════════════════════════
--
-- Supprime toutes les données créées par seed-demo-coach.sql.
-- ⚠️ Remplace coach_uuid par le même UUID que dans le seed.
--
-- Ordre :
--   1. Supprime les 40 clients fictifs (auth.users → cascade profiles/clients
--      et toutes les tables qui pointent vers clients.id ou profiles.id)
--   2. Supprime les objets coach-scoped restants (programmes templates,
--      offres, factures, virements, prospects, formulaires, coach_events,
--      paiements, abonnements — la cascade des clients fictifs a déjà
--      nettoyé beaucoup, mais on force)
--   3. Reset solde coach
--
-- Les FK utilisent majoritairement ON DELETE CASCADE, donc supprimer les
-- users fictifs via auth.users.id suffit pour le gros.
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ⚠️  MÊME UUID QUE LE SEED ⚠️
  coach_uuid uuid := 'REMPLACE_MOI_PAR_COACH_UUID_DEMO';

  client_prefix text := 'd0000000-0000-0000-0000-0000000000';
  client_uuid uuid;
  i int;
BEGIN
  -- ─────────────────────────────────────────────────────────────
  -- 1. Supprimer les 40 utilisateurs fictifs (cascade → profiles,
  --    clients, habitudes, logs, paiements, factures, etc.)
  -- ─────────────────────────────────────────────────────────────
  FOR i IN 1..40 LOOP
    client_uuid := (client_prefix || lpad(i::text, 3, '0'))::uuid;
    DELETE FROM auth.users WHERE id = client_uuid;
  END LOOP;
  RAISE NOTICE '✓ 40 clients fictifs supprimés (cascade)';

  -- ─────────────────────────────────────────────────────────────
  -- 2. Cleanup résiduel coach-scoped
  --    (certaines tables ne cascade pas depuis clients → on nettoie
  --    par coach_id pour être sûr)
  -- ─────────────────────────────────────────────────────────────

  -- Paiements & abonnements (certains peuvent rester si coach_id seul)
  DELETE FROM paiements_clients  WHERE coach_id = coach_uuid;
  DELETE FROM abonnements_clients WHERE coach_id = coach_uuid;
  DELETE FROM factures           WHERE coach_id = coach_uuid;
  DELETE FROM virements_coach    WHERE coach_id = coach_uuid;

  -- Offres
  DELETE FROM offres_coaching WHERE coach_id = coach_uuid;

  -- Prospects
  DELETE FROM prospects WHERE coach_id = coach_uuid;

  -- Formulaires (cascade sur champs + réponses)
  DELETE FROM formulaires WHERE coach_id = coach_uuid;

  -- Calendrier
  DELETE FROM coach_events WHERE coach_id = coach_uuid;

  -- Programmes sport (templates + assignations coach-scoped)
  DELETE FROM sport_programmes WHERE coach_id = coach_uuid;

  -- Programmes nutrition
  DELETE FROM nutrition_programmes WHERE coach_id = coach_uuid;

  -- Bibliothèques (si jamais remplies par d'autres seeds)
  DELETE FROM sport_seances_biblio WHERE coach_id = coach_uuid;
  DELETE FROM nutrition_repas_biblio WHERE coach_id = coach_uuid;

  -- Messages résiduels (si certains ont échappé au cascade client)
  DELETE FROM messages WHERE coach_id = coach_uuid;

  -- ─────────────────────────────────────────────────────────────
  -- 3. Reset solde coach
  -- ─────────────────────────────────────────────────────────────
  UPDATE coaches
  SET solde_disponible = 0,
      solde_en_attente = 0
  WHERE id = coach_uuid;

  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '  ✅ CLEANUP SEED DÉMO TERMINÉ';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '  Le compte coach % est remis à zéro.', coach_uuid;
  RAISE NOTICE '════════════════════════════════════════════════';
END $$;
