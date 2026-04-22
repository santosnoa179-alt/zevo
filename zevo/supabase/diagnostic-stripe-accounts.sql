-- ═══════════════════════════════════════════════════════════════════════════
-- Diagnostic : identifier les coachs avec un stripe_account_id potentiellement
-- obsolète (créé en mode test alors que l'app tourne désormais en mode live).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Contexte : les clés Stripe Vercel ont basculé de sk_test_... à sk_live_...
-- Tout coach qui s'était onboardé AVANT ce switch a un acct_ qui n'existe que
-- dans le registre "test" de Stripe. Côté API live → 403 "No such account".
--
-- Deux stratégies complémentaires :
--   1. Code applicatif (api/client-checkout.js) : self-healing à la volée.
--      Le 1er client qui tente de payer un coach obsolète déclenche le reset.
--   2. Ce script : reset préventif côté DB pour tous les coachs suspects,
--      pour qu'ils voient "Connecter Stripe" immédiatement, pas au 1er erreur
--      client.
--
-- ⚠️  Exécute d'abord la requête de DIAGNOSTIC, vérifie les résultats, puis
--     seulement après décommente la section RESET et adapte-la.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. DIAGNOSTIC : liste tous les coachs avec un stripe_account_id ────────
--     Examine bien la colonne created_at : tout ce qui précède le switch
--     de sk_test → sk_live est suspect.
SELECT
  c.id,
  p.email,
  c.prenom,
  c.nom,
  c.stripe_account_id,
  c.stripe_onboarding_complete,
  c.subscription_status,
  c.created_at AS coach_created_at,
  c.updated_at AS coach_updated_at
FROM coaches c
LEFT JOIN profiles p ON p.id = c.id
WHERE c.stripe_account_id IS NOT NULL
ORDER BY c.created_at ASC;


-- ─── 2. DIAGNOSTIC APPROFONDI : qui a des offres déjà payées ? ──────────────
--     Utile pour ne pas casser les coachs qui ont des clients actifs.
SELECT
  c.id AS coach_id,
  p.email AS coach_email,
  c.prenom,
  c.stripe_account_id,
  c.stripe_onboarding_complete,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.statut = 'paye') AS paiements_reussis,
  COUNT(DISTINCT pc.id) FILTER (WHERE pc.statut = 'en_attente') AS paiements_en_attente,
  MAX(pc.created_at) FILTER (WHERE pc.statut = 'paye') AS dernier_paiement_reussi
FROM coaches c
LEFT JOIN profiles p ON p.id = c.id
LEFT JOIN paiements_clients pc ON pc.coach_id = c.id
WHERE c.stripe_account_id IS NOT NULL
GROUP BY c.id, p.email, c.prenom, c.stripe_account_id, c.stripe_onboarding_complete
ORDER BY paiements_reussis DESC, c.created_at ASC;


-- ─── 3. RESET CIBLÉ (à décommenter et adapter) ──────────────────────────────
--     Option A : reset par ID spécifique (recommandé pour le coach problème)
--
-- UPDATE coaches
-- SET stripe_account_id = NULL,
--     stripe_onboarding_complete = false,
--     updated_at = NOW()
-- WHERE id = 'UUID_DU_COACH_CONCERNE';


--     Option B : reset par date (tous les coachs créés avant le switch live)
--     ⚠️  Si un coach s'est réellement onboardé en live avant cette date,
--         il perdra son lien (obligé de re-cliquer "Connecter Stripe").
--         Check bien les résultats de la requête 1 avant de lancer.
--
-- UPDATE coaches
-- SET stripe_account_id = NULL,
--     stripe_onboarding_complete = false,
--     updated_at = NOW()
-- WHERE stripe_account_id IS NOT NULL
--   AND created_at < '2026-04-21';   -- date du switch sk_test → sk_live


--     Option C : reset de tous les acct_ (brutal, force tout le monde à refaire)
--     Utile si tu es sûre qu'AUCUN compte live n'existait avant aujourd'hui.
--
-- UPDATE coaches
-- SET stripe_account_id = NULL,
--     stripe_onboarding_complete = false,
--     updated_at = NOW()
-- WHERE stripe_account_id IS NOT NULL;


-- ─── 4. VÉRIFICATION POST-RESET ─────────────────────────────────────────────
--     Confirme qu'il ne reste plus de stripe_account_id problématique.
--
-- SELECT COUNT(*) AS coachs_avec_stripe_encore_connecte
-- FROM coaches
-- WHERE stripe_account_id IS NOT NULL;
