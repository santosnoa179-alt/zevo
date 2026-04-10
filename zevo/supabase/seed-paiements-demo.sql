-- ════════════════════════════════════════════════════════════════
-- ZEVO — SEED DE DONNÉES DÉMO POUR LA SECTION PAIEMENTS
-- ════════════════════════════════════════════════════════════════
--
-- BUT : injecter des transactions, abonnements, factures et virements
-- fictifs pour voir l'UI de la section Paiements peuplée.
--
-- ⚠️  IMPORTANT :
--   1. Remplace d'abord la variable COACH_ID ci-dessous par TON ID
--      (tu le trouves dans Supabase → Authentication → Users → copie ton UUID)
--   2. Ce script insère uniquement si tu as déjà des clients dans ta table
--   3. Pour tout nettoyer ensuite : exécute la section "CLEANUP" en bas
--
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ⚠️  REMPLACE CETTE VALEUR PAR TON PROPRE COACH_ID ⚠️
  coach_uuid uuid := 'REMPLACE_MOI_PAR_TON_ID';

  client_ids uuid[];
  offre_ids uuid[];
  nb_clients int;
  nb_offres int;
BEGIN
  -- Vérifier que le coach existe
  IF NOT EXISTS (SELECT 1 FROM coaches WHERE id = coach_uuid) THEN
    RAISE EXCEPTION 'Coach introuvable : %. Mets ton vrai UUID dans la variable coach_uuid.', coach_uuid;
  END IF;

  -- Récupérer les clients du coach
  SELECT array_agg(id) INTO client_ids FROM clients WHERE coach_id = coach_uuid LIMIT 10;
  SELECT array_length(client_ids, 1) INTO nb_clients;

  IF nb_clients IS NULL OR nb_clients = 0 THEN
    RAISE EXCEPTION 'Aucun client trouvé pour ce coach. Crée au moins 1 client avant de lancer le seed.';
  END IF;

  -- Récupérer ou créer des offres
  SELECT array_agg(id) INTO offre_ids FROM offres_coaching WHERE coach_id = coach_uuid LIMIT 5;
  SELECT array_length(offre_ids, 1) INTO nb_offres;

  IF nb_offres IS NULL OR nb_offres = 0 THEN
    INSERT INTO offres_coaching (coach_id, titre, description, prix, frequence, actif)
    VALUES
      (coach_uuid, 'Coaching 1:1 mensuel', 'Suivi personnalisé illimité', 8900, 'mensuel', true),
      (coach_uuid, 'Programme nutrition', '12 semaines + suivi', 14900, 'unique', true),
      (coach_uuid, 'Pack découverte', '1 séance + plan nutrition', 4900, 'unique', true);
    SELECT array_agg(id) INTO offre_ids FROM offres_coaching WHERE coach_id = coach_uuid LIMIT 5;
    SELECT array_length(offre_ids, 1) INTO nb_offres;
  END IF;

  -- ── SOLDE COACH ──
  UPDATE coaches
  SET
    solde_disponible = 128450,  -- 1 284,50 €
    solde_en_attente = 34200    -- 342,00 €
  WHERE id = coach_uuid;

  -- ── 10 PAIEMENTS récents ──
  INSERT INTO paiements_clients (client_id, coach_id, offre_id, montant, statut, methode_paiement, date_paiement, created_at)
  VALUES
    (client_ids[1 + (0 % nb_clients)], coach_uuid, offre_ids[1 + (0 % nb_offres)], 8900, 'paye', 'card', now() - interval '1 day', now() - interval '1 day'),
    (client_ids[1 + (1 % nb_clients)], coach_uuid, offre_ids[1 + (1 % nb_offres)], 14900, 'paye', 'card', now() - interval '2 days', now() - interval '2 days'),
    (client_ids[1 + (2 % nb_clients)], coach_uuid, offre_ids[1 + (0 % nb_offres)], 8900, 'paye', 'card', now() - interval '3 days', now() - interval '3 days'),
    (client_ids[1 + (3 % nb_clients)], coach_uuid, offre_ids[1 + (2 % nb_offres)], 4900, 'paye', 'card', now() - interval '5 days', now() - interval '5 days'),
    (client_ids[1 + (4 % nb_clients)], coach_uuid, offre_ids[1 + (0 % nb_offres)], 8900, 'paye', 'card', now() - interval '7 days', now() - interval '7 days'),
    (client_ids[1 + (0 % nb_clients)], coach_uuid, offre_ids[1 + (1 % nb_offres)], 14900, 'en_attente', 'card', now() - interval '12 hours', now() - interval '12 hours'),
    (client_ids[1 + (1 % nb_clients)], coach_uuid, offre_ids[1 + (2 % nb_offres)], 4900, 'paye', 'card', now() - interval '10 days', now() - interval '10 days'),
    (client_ids[1 + (2 % nb_clients)], coach_uuid, offre_ids[1 + (0 % nb_offres)], 8900, 'rembourse', 'card', now() - interval '15 days', now() - interval '15 days'),
    (client_ids[1 + (3 % nb_clients)], coach_uuid, offre_ids[1 + (0 % nb_offres)], 8900, 'paye', 'card', now() - interval '18 days', now() - interval '18 days'),
    (client_ids[1 + (4 % nb_clients)], coach_uuid, offre_ids[1 + (1 % nb_offres)], 14900, 'paye', 'card', now() - interval '22 days', now() - interval '22 days');

  -- ── 5 ABONNEMENTS actifs ──
  INSERT INTO abonnements_clients (client_id, coach_id, offre_id, montant, frequence, statut, date_debut, date_prochaine_echeance)
  VALUES
    (client_ids[1 + (0 % nb_clients)], coach_uuid, offre_ids[1 + (0 % nb_offres)], 8900, 'mensuel', 'actif', now() - interval '60 days', now() + interval '6 days'),
    (client_ids[1 + (1 % nb_clients)], coach_uuid, offre_ids[1 + (0 % nb_offres)], 8900, 'mensuel', 'actif', now() - interval '30 days', now() + interval '1 day'),
    (client_ids[1 + (2 % nb_clients)], coach_uuid, offre_ids[1 + (0 % nb_offres)], 24900, 'trimestriel', 'actif', now() - interval '45 days', now() + interval '45 days'),
    (client_ids[1 + (3 % nb_clients)], coach_uuid, offre_ids[1 + (0 % nb_offres)], 8900, 'mensuel', 'en_pause', now() - interval '90 days', now() + interval '15 days'),
    (client_ids[1 + (4 % nb_clients)], coach_uuid, offre_ids[1 + (0 % nb_offres)], 8900, 'mensuel', 'annule', now() - interval '120 days', now() - interval '10 days');

  -- ── 6 FACTURES ──
  INSERT INTO factures (numero, coach_id, client_id, offre_id, montant, statut, date_emission)
  VALUES
    ('FAC-2026-001', coach_uuid, client_ids[1 + (0 % nb_clients)], offre_ids[1 + (0 % nb_offres)], 8900, 'payee', now() - interval '1 day'),
    ('FAC-2026-002', coach_uuid, client_ids[1 + (1 % nb_clients)], offre_ids[1 + (1 % nb_offres)], 14900, 'payee', now() - interval '2 days'),
    ('FAC-2026-003', coach_uuid, client_ids[1 + (2 % nb_clients)], offre_ids[1 + (0 % nb_offres)], 8900, 'payee', now() - interval '3 days'),
    ('FAC-2026-004', coach_uuid, client_ids[1 + (3 % nb_clients)], offre_ids[1 + (2 % nb_offres)], 4900, 'payee', now() - interval '5 days'),
    ('FAC-2026-005', coach_uuid, client_ids[1 + (0 % nb_clients)], offre_ids[1 + (1 % nb_offres)], 14900, 'en_attente', now() - interval '12 hours'),
    ('FAC-2026-006', coach_uuid, client_ids[1 + (2 % nb_clients)], offre_ids[1 + (0 % nb_offres)], 8900, 'annulee', now() - interval '15 days');

  -- ── 3 VIREMENTS ──
  INSERT INTO virements_coach (coach_id, montant, statut, banque_dernier4, date_virement)
  VALUES
    (coach_uuid, 50000, 'effectue', '4242', now() - interval '7 days'),
    (coach_uuid, 75000, 'effectue', '4242', now() - interval '30 days'),
    (coach_uuid, 18000, 'en_cours', '4242', now() - interval '1 day');

  RAISE NOTICE '✅ Seed démo créé : 10 paiements, 5 abonnements, 6 factures, 3 virements';
  RAISE NOTICE '   Solde disponible : 1 284,50 € · En attente : 342,00 €';
END $$;

-- ════════════════════════════════════════════════════════════════
-- CLEANUP — décommente ce bloc pour tout supprimer
-- ════════════════════════════════════════════════════════════════
--
-- DO $$
-- DECLARE
--   coach_uuid uuid := 'REMPLACE_MOI_PAR_TON_ID';
-- BEGIN
--   DELETE FROM virements_coach WHERE coach_id = coach_uuid;
--   DELETE FROM factures WHERE coach_id = coach_uuid AND numero LIKE 'FAC-2026-%';
--   DELETE FROM abonnements_clients WHERE coach_id = coach_uuid;
--   DELETE FROM paiements_clients WHERE coach_id = coach_uuid AND methode_paiement = 'card';
--   UPDATE coaches SET solde_disponible = 0, solde_en_attente = 0 WHERE id = coach_uuid;
--   RAISE NOTICE '🧹 Données démo supprimées';
-- END $$;
