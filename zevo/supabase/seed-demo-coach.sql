-- ════════════════════════════════════════════════════════════════
-- ZEVO — SEED DÉMO COACH COMPLET (captures marketing)
-- ════════════════════════════════════════════════════════════════
--
-- BUT : peupler un compte coach démo avec 40 clients fictifs + toutes
-- les données satellites (paiements, programmes, calendrier, CRM, msg)
-- pour faire des screenshots marketing réalistes.
--
-- ⚠️  PRÉREQUIS :
--   1. Crée d'abord ton compte coach démo via Supabase Auth (UI ou signup)
--   2. Dans la table `profiles`, set role = 'coach' pour cet utilisateur
--   3. Crée la ligne `coaches` pour cet utilisateur
--   4. Remplace coach_uuid ci-dessous par son UUID
--
-- ⚠️  IMPORTANT :
--   - Les 40 clients fictifs sont insérés dans `auth.users` avec UUIDs
--     stables préfixés 'd0000000-0000-0000-0000-000000000XXX' (XXX = 001..040)
--   - Idempotent : ON CONFLICT DO NOTHING partout
--   - Cleanup dans seed-demo-coach-cleanup.sql
--
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ⚠️  REMPLACE CET UUID PAR CELUI DU COACH DÉMO ⚠️
  coach_uuid uuid := 'REMPLACE_MOI_PAR_COACH_UUID_DEMO';

  -- Préfixe stable pour tous les clients fictifs (facilite le cleanup)
  client_prefix text := 'd0000000-0000-0000-0000-0000000000';

  -- Données fictives (prénoms + noms + objectifs)
  prenoms text[] := ARRAY[
    'Sarah','Julien','Emma','Lucas','Camille','Thomas','Léa','Hugo','Chloé','Maxime',
    'Manon','Alexandre','Inès','Raphaël','Louise','Nathan','Jade','Arthur','Zoé','Gabriel',
    'Alice','Louis','Eva','Adam','Romane','Martin','Charlotte','Paul','Mila','Antoine',
    'Anaïs','Clément','Lola','Enzo','Juliette','Noah','Agathe','Léo','Margaux','Theo'
  ];
  noms text[] := ARRAY[
    'Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau',
    'Simon','Laurent','Lefebvre','Michel','Garcia','David','Bertrand','Roux','Vincent','Fournier',
    'Morel','Girard','Andre','Lefevre','Mercier','Dupont','Lambert','Bonnet','Francois','Martinez',
    'Legrand','Garnier','Faure','Rousseau','Blanc','Guerin','Muller','Henry','Roussel','Nicolas'
  ];
  objectifs_list text[] := ARRAY[
    'Perte de poids','Prise de masse','Remise en forme','Performance','Recomposition',
    'Tonification','Endurance','Santé globale'
  ];
  niveaux text[] := ARRAY['Débutant','Intermédiaire','Avancé'];

  -- IDs & tableaux de travail
  client_uuid uuid;
  client_ids uuid[] := ARRAY[]::uuid[];
  i int;
  mois int;
  offre_mensuel uuid;
  offre_trim uuid;
  offre_pack uuid;
  offre_premium uuid;
  offre_ids uuid[];
  nb_offres int;
  prog_sport_hyper uuid;
  prog_sport_perte uuid;
  prog_sport_debut uuid;
  prog_nutri_perte uuid;
  prog_nutri_masse uuid;
  prog_nutri_maint uuid;
  form_bilan uuid;
  form_checkin uuid;
  montant_mois int;
  start_year int;
  start_month int;
  rnd_client uuid;

BEGIN
  -- ─────────────────────────────────────────────────────────────
  -- VÉRIFICATION COACH
  -- ─────────────────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM coaches WHERE id = coach_uuid) THEN
    RAISE EXCEPTION 'Coach introuvable : %. Crée-le d''abord via Supabase Auth puis insère une ligne dans coaches.', coach_uuid;
  END IF;

  -- ─────────────────────────────────────────────────────────────
  -- 1. 40 CLIENTS FICTIFS
  --    → auth.users + profiles + clients
  -- ─────────────────────────────────────────────────────────────
  FOR i IN 1..40 LOOP
    client_uuid := (client_prefix || lpad(i::text, 3, '0'))::uuid;
    client_ids := client_ids || client_uuid;

    -- 1a. auth.users (bypass FK via insertion directe)
    -- Colonnes minimales requises par Supabase Auth
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin
    ) VALUES (
      client_uuid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'demo-client-' || lpad(i::text, 3, '0') || '@zevo-demo.local',
      crypt('DemoPassword2026!', gen_salt('bf')),
      now() - (i || ' days')::interval,
      now() - (i || ' days')::interval,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('demo', true, 'seed', 'coach-demo'),
      false
    ) ON CONFLICT (id) DO NOTHING;

    -- 1b. profiles (FK sur auth.users)
    INSERT INTO profiles (
      id, email, role, nom, prenom,
      age, genre, taille, poids_depart, poids_actuel, poids_cible,
      objectif_type, niveau_activite, niveau_sportif,
      calories_cibles, proteines_cibles, glucides_cibles, lipides_cibles,
      date_debut_coaching, telephone, avatar_url, created_at
    ) VALUES (
      client_uuid,
      'demo-client-' || lpad(i::text, 3, '0') || '@zevo-demo.local',
      'client',
      noms[1 + ((i - 1) % array_length(noms, 1))],
      prenoms[1 + ((i - 1) % array_length(prenoms, 1))],
      20 + (i % 35),
      CASE WHEN i % 2 = 0 THEN 'femme' ELSE 'homme' END,
      160 + (i % 30),
      60 + (i % 40)::numeric,
      58 + (i % 38)::numeric,
      55 + (i % 30)::numeric,
      objectifs_list[1 + ((i - 1) % array_length(objectifs_list, 1))],
      CASE (i % 3) WHEN 0 THEN 'Sédentaire' WHEN 1 THEN 'Modéré' ELSE 'Actif' END,
      niveaux[1 + ((i - 1) % array_length(niveaux, 1))],
      1800 + (i % 1000),
      120 + (i % 60),
      180 + (i % 100),
      50 + (i % 40),
      (now() - ((i * 9) || ' days')::interval)::date,
      '+336' || lpad((10000000 + i * 137)::text, 8, '0'),
      'https://api.dicebear.com/7.x/avataaars/svg?seed=' ||
        prenoms[1 + ((i - 1) % array_length(prenoms, 1))] || i::text,
      now() - ((i * 9) || ' days')::interval
    ) ON CONFLICT (id) DO NOTHING;

    -- 1c. clients (coach link)
    INSERT INTO clients (id, coach_id, actif, onboarding_complete, created_at)
    VALUES (
      client_uuid,
      coach_uuid,
      i <= 35,                     -- 35 actifs, 5 inactifs
      i <= 38,                     -- 2 en cours d'onboarding
      now() - ((i * 9) || ' days')::interval
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  RAISE NOTICE '✓ 40 clients fictifs créés';

  -- ─────────────────────────────────────────────────────────────
  -- 2. OFFRES COACHING (4 offres)
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO offres_coaching (coach_id, titre, description, prix, frequence, actif)
  VALUES
    (coach_uuid, 'Coaching mensuel', 'Suivi illimité + plan sport + nutrition', 8900, 'mensuel', true),
    (coach_uuid, 'Programme 12 semaines', 'Transformation complète sur 3 mois', 14900, 'unique', true),
    (coach_uuid, 'Pack découverte', '1 séance + plan nutrition', 4900, 'unique', true),
    (coach_uuid, 'Coaching Premium', '1:1 hebdomadaire + suivi quotidien', 14900, 'mensuel', true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO offre_mensuel FROM offres_coaching WHERE coach_id = coach_uuid AND titre = 'Coaching mensuel' LIMIT 1;
  SELECT id INTO offre_trim    FROM offres_coaching WHERE coach_id = coach_uuid AND titre = 'Programme 12 semaines' LIMIT 1;
  SELECT id INTO offre_pack    FROM offres_coaching WHERE coach_id = coach_uuid AND titre = 'Pack découverte' LIMIT 1;
  SELECT id INTO offre_premium FROM offres_coaching WHERE coach_id = coach_uuid AND titre = 'Coaching Premium' LIMIT 1;
  offre_ids := ARRAY[offre_mensuel, offre_trim, offre_pack, offre_premium];
  nb_offres := array_length(offre_ids, 1);

  -- ─────────────────────────────────────────────────────────────
  -- 3. SOLDE COACH
  -- ─────────────────────────────────────────────────────────────
  UPDATE coaches
  SET solde_disponible = 128400,   -- 1 284 €
      solde_en_attente = 34200     -- 342 €
  WHERE id = coach_uuid;

  -- ─────────────────────────────────────────────────────────────
  -- 4. PAIEMENTS — courbe croissante sur 12 mois (~1500→4500€/mois)
  -- ─────────────────────────────────────────────────────────────
  FOR mois IN 0..11 LOOP
    -- 1500 + (4500-1500) * (11-mois)/11 ; mois 0 = mois en cours
    montant_mois := 150000 + ((11 - mois) * 27000); -- en centimes : ~1500 → ~4470
    -- insérer ~3 paiements par mois (36 paiements répartis + quelques extras)
    INSERT INTO paiements_clients (client_id, coach_id, offre_id, montant, statut, methode_paiement, date_paiement, created_at)
    VALUES
      (client_ids[1 + (mois % 40)],      coach_uuid, offre_mensuel, 8900, 'paye', 'card',
        (now() - ((mois * 30) || ' days')::interval)::timestamptz,
        (now() - ((mois * 30) || ' days')::interval)::timestamptz),
      (client_ids[1 + ((mois * 3 + 7) % 40)], coach_uuid, offre_mensuel, 8900, 'paye', 'card',
        (now() - ((mois * 30 + 5) || ' days')::interval),
        (now() - ((mois * 30 + 5) || ' days')::interval)),
      (client_ids[1 + ((mois * 5 + 13) % 40)], coach_uuid, offre_premium, 14900, 'paye', 'card',
        (now() - ((mois * 30 + 12) || ' days')::interval),
        (now() - ((mois * 30 + 12) || ' days')::interval));
  END LOOP;

  -- Paiements en attente (mois en cours)
  INSERT INTO paiements_clients (client_id, coach_id, offre_id, montant, statut, methode_paiement, date_paiement, created_at)
  VALUES
    (client_ids[3],  coach_uuid, offre_mensuel, 8900,  'en_attente', 'card', now() - interval '6 hours',  now() - interval '6 hours'),
    (client_ids[17], coach_uuid, offre_pack,    4900,  'en_attente', 'card', now() - interval '1 day',    now() - interval '1 day'),
    (client_ids[29], coach_uuid, offre_trim,    14900, 'en_attente', 'card', now() - interval '3 days',   now() - interval '3 days');

  -- Remboursement
  INSERT INTO paiements_clients (client_id, coach_id, offre_id, montant, statut, methode_paiement, date_paiement, created_at)
  VALUES
    (client_ids[8], coach_uuid, offre_mensuel, 8900, 'rembourse', 'card', now() - interval '10 days', now() - interval '10 days');

  RAISE NOTICE '✓ Paiements (12 mois courbe croissante + 3 en attente + 1 remboursé)';

  -- ─────────────────────────────────────────────────────────────
  -- 5. ABONNEMENTS ACTIFS (25 clients)
  -- ─────────────────────────────────────────────────────────────
  FOR i IN 1..25 LOOP
    INSERT INTO abonnements_clients (
      client_id, coach_id, offre_id, montant, frequence, statut,
      date_debut, date_prochaine_echeance
    ) VALUES (
      client_ids[i],
      coach_uuid,
      CASE WHEN i % 7 = 0 THEN offre_premium ELSE offre_mensuel END,
      CASE WHEN i % 7 = 0 THEN 14900 ELSE 8900 END,
      'mensuel',
      'actif',
      now() - ((30 + i * 7) || ' days')::interval,
      now() + ((30 - (i % 30)) || ' days')::interval
    );
  END LOOP;

  -- Quelques abos en pause / annulé
  INSERT INTO abonnements_clients (client_id, coach_id, offre_id, montant, frequence, statut, date_debut, date_prochaine_echeance)
  VALUES
    (client_ids[30], coach_uuid, offre_mensuel, 8900, 'mensuel', 'en_pause', now() - interval '90 days', now() + interval '10 days'),
    (client_ids[31], coach_uuid, offre_mensuel, 8900, 'mensuel', 'annule',   now() - interval '180 days', now() - interval '20 days');

  RAISE NOTICE '✓ 25 abonnements actifs + 2 (pause/annulé)';

  -- ─────────────────────────────────────────────────────────────
  -- 6. FACTURES (15)
  -- ─────────────────────────────────────────────────────────────
  FOR i IN 1..10 LOOP
    INSERT INTO factures (numero, coach_id, client_id, offre_id, montant, statut, date_emission)
    VALUES (
      'FAC-2026-' || lpad((100 + i)::text, 3, '0'),
      coach_uuid, client_ids[i],
      CASE WHEN i % 2 = 0 THEN offre_mensuel ELSE offre_premium END,
      CASE WHEN i % 2 = 0 THEN 8900 ELSE 14900 END,
      'payee',
      now() - ((i * 3) || ' days')::interval
    );
  END LOOP;

  INSERT INTO factures (numero, coach_id, client_id, offre_id, montant, statut, date_emission)
  VALUES
    ('FAC-2026-200', coach_uuid, client_ids[11], offre_mensuel, 8900,  'en_attente', now() - interval '2 days'),
    ('FAC-2026-201', coach_uuid, client_ids[12], offre_pack,    4900,  'en_attente', now() - interval '5 days'),
    ('FAC-2026-202', coach_uuid, client_ids[13], offre_mensuel, 8900,  'annulee',    now() - interval '20 days'),
    ('FAC-2026-203', coach_uuid, client_ids[14], offre_trim,    14900, 'en_attente', now() - interval '60 days'),  -- impayée ancienne
    ('FAC-2026-204', coach_uuid, client_ids[15], offre_mensuel, 8900,  'en_attente', now() - interval '75 days');  -- impayée ancienne

  RAISE NOTICE '✓ 15 factures (10 payées, 4 attente/impayées, 1 annulée)';

  -- ─────────────────────────────────────────────────────────────
  -- 7. VIREMENTS COACH (3 effectués + 1 en cours)
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO virements_coach (coach_id, montant, statut, banque_dernier4, date_virement)
  VALUES
    (coach_uuid, 280000, 'effectue', '4242', now() - interval '90 days'),
    (coach_uuid, 320000, 'effectue', '4242', now() - interval '60 days'),
    (coach_uuid, 385000, 'effectue', '4242', now() - interval '30 days'),
    (coach_uuid, 128400, 'en_cours', '4242', now() - interval '1 day');

  RAISE NOTICE '✓ 4 virements (3 effectués + 1 en cours)';

  -- ─────────────────────────────────────────────────────────────
  -- 8. HABITUDES (~3 par client actif)
  -- ─────────────────────────────────────────────────────────────
  FOR i IN 1..35 LOOP
    INSERT INTO habitudes (client_id, assigned_by, nom, objectif_mensuel, couleur)
    VALUES
      (client_ids[i], coach_uuid, 'Boire 2L d''eau',        30, '#3B82F6'),
      (client_ids[i], coach_uuid, 'Marcher 10 000 pas',     25, '#10B981'),
      (client_ids[i], coach_uuid, 'Méditer 10 min',         20, '#8B5CF6');

    -- Logs des 14 derniers jours (complétion aléatoire ~70%)
    INSERT INTO habitudes_log (habitude_id, client_id, date, complete)
    SELECT h.id, client_ids[i], (now() - (d || ' days')::interval)::date, (random() < 0.7)
    FROM habitudes h, generate_series(0, 13) d
    WHERE h.client_id = client_ids[i]
    ON CONFLICT (habitude_id, date) DO NOTHING;
  END LOOP;

  RAISE NOTICE '✓ Habitudes + logs 14j pour 35 clients';

  -- ─────────────────────────────────────────────────────────────
  -- 9. OBJECTIFS (2 par client actif)
  -- ─────────────────────────────────────────────────────────────
  FOR i IN 1..35 LOOP
    INSERT INTO objectifs (client_id, assigned_by, titre, description, score, date_cible)
    VALUES
      (client_ids[i], coach_uuid, 'Perdre 5 kg',       'Sur les 3 prochains mois', 30 + (i % 60),  (now() + interval '90 days')::date),
      (client_ids[i], coach_uuid, 'Squat 100 kg',      'Progression charge semaine',  40 + (i % 50), (now() + interval '60 days')::date);
  END LOOP;

  -- ─────────────────────────────────────────────────────────────
  -- 10. TACHES (3 par client actif, mix en_cours/termine)
  -- ─────────────────────────────────────────────────────────────
  FOR i IN 1..35 LOOP
    INSERT INTO taches (client_id, titre, priorite, statut, echeance)
    VALUES
      (client_ids[i], 'Envoyer photos progression', 'normal', 'en_cours', (now() + interval '3 days')::date),
      (client_ids[i], 'Check-in hebdomadaire',      'urgent', 'en_cours', (now() + interval '1 day')::date),
      (client_ids[i], 'Commander complément',       'faible', 'termine',  (now() - interval '2 days')::date);
  END LOOP;

  -- ─────────────────────────────────────────────────────────────
  -- 11. SOMMEIL_LOG (14 jours × 35 clients)
  -- ─────────────────────────────────────────────────────────────
  FOR i IN 1..35 LOOP
    INSERT INTO sommeil_log (client_id, date, heures, qualite)
    SELECT
      client_ids[i],
      (now() - (d || ' days')::interval)::date,
      6.5 + (random() * 2.5),
      3 + (random() * 2)::int
    FROM generate_series(0, 13) d
    ON CONFLICT (client_id, date) DO NOTHING;
  END LOOP;

  -- ─────────────────────────────────────────────────────────────
  -- 12. HUMEUR_LOG (14 jours × 35 clients)
  -- ─────────────────────────────────────────────────────────────
  FOR i IN 1..35 LOOP
    INSERT INTO humeur_log (client_id, date, score, note)
    SELECT
      client_ids[i],
      (now() - (d || ' days')::interval)::date,
      5 + (random() * 5)::int,
      CASE WHEN random() < 0.3 THEN 'Bonne journée' ELSE NULL END
    FROM generate_series(0, 13) d
    ON CONFLICT (client_id, date) DO NOTHING;
  END LOOP;

  -- ─────────────────────────────────────────────────────────────
  -- 13. SPORT_LOG (10 séances sur 14j × 35 clients)
  -- ─────────────────────────────────────────────────────────────
  FOR i IN 1..35 LOOP
    INSERT INTO sport_log (client_id, date, type_activite, duree_minutes, intensite)
    SELECT
      client_ids[i],
      (now() - (d || ' days')::interval)::date,
      (ARRAY['Musculation','Course','Vélo','HIIT','Yoga'])[1 + (d % 5)],
      45 + ((d * 7) % 45),
      2 + (d % 4)
    FROM generate_series(0, 13, 2) d;  -- 1 jour sur 2
  END LOOP;

  RAISE NOTICE '✓ Sommeil/humeur/sport log (14j × 35 clients)';

  -- ─────────────────────────────────────────────────────────────
  -- 14. COACH_EVENTS (calendrier — 20 événements semaine courante+suivante)
  -- ─────────────────────────────────────────────────────────────
  FOR i IN 0..13 LOOP
    INSERT INTO coach_events (coach_id, client_id, title, event_date, event_type, notes)
    VALUES (
      coach_uuid,
      client_ids[1 + (i % 40)],
      'Séance ' || prenoms[1 + (i % array_length(prenoms, 1))],
      (now()::date + (i || ' days')::interval + (8 + (i % 10) || ' hours')::interval)::timestamptz,
      (ARRAY['bilan','appel','perso','reunion','note'])[1 + (i % 5)],
      'Séance planifiée démo'
    );
  END LOOP;

  -- 6 événements additionnels (perso / bilan)
  FOR i IN 0..5 LOOP
    INSERT INTO coach_events (coach_id, title, event_date, event_type, notes)
    VALUES (
      coach_uuid,
      (ARRAY['Bilan trimestriel','Prospection LinkedIn','Webinaire intro','Formation continue','Révision pricing','RDV comptable'])[1 + i],
      (now()::date + ((i + 2) || ' days')::interval + '14 hours'::interval)::timestamptz,
      'perso',
      NULL
    );
  END LOOP;

  RAISE NOTICE '✓ 20 coach_events sur 2 semaines';

  -- ─────────────────────────────────────────────────────────────
  -- 15. PROGRAMMES SPORT (3 templates + assignations 15 clients)
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO sport_programmes (coach_id, client_id, nom, description, objectif, duree_semaines, is_template, is_active, frequence_hebdo, niveau, date_debut)
  VALUES
    (coach_uuid, NULL, 'Hypertrophie 12 semaines', 'Programme PPL 5x/sem prise de masse', 'Hypertrophie', 12, true, true, 5, 'intermediaire', NULL),
    (coach_uuid, NULL, 'Perte de poids 8 semaines', 'Full body + cardio HIIT', 'Perte de poids', 8, true, true, 4, 'debutant', NULL),
    (coach_uuid, NULL, 'Débutant 4 semaines',      'Initiation full-body', 'Remise en forme', 4, true, true, 3, 'debutant', NULL)
  RETURNING id INTO prog_sport_hyper;  -- capture 1er seulement ; on va re-SELECT

  SELECT id INTO prog_sport_hyper FROM sport_programmes WHERE coach_id = coach_uuid AND nom = 'Hypertrophie 12 semaines' AND is_template = true LIMIT 1;
  SELECT id INTO prog_sport_perte FROM sport_programmes WHERE coach_id = coach_uuid AND nom = 'Perte de poids 8 semaines' AND is_template = true LIMIT 1;
  SELECT id INTO prog_sport_debut FROM sport_programmes WHERE coach_id = coach_uuid AND nom = 'Débutant 4 semaines' AND is_template = true LIMIT 1;

  -- Assignations : 15 clients avec programmes clonés (client_id set)
  FOR i IN 1..15 LOOP
    INSERT INTO sport_programmes (coach_id, client_id, nom, description, objectif, duree_semaines, is_template, is_active, frequence_hebdo, niveau, date_debut)
    VALUES (
      coach_uuid,
      client_ids[i],
      (ARRAY['Hypertrophie 12 semaines','Perte de poids 8 semaines','Débutant 4 semaines'])[1 + (i % 3)],
      'Programme assigné',
      (ARRAY['Hypertrophie','Perte de poids','Remise en forme'])[1 + (i % 3)],
      (ARRAY[12, 8, 4])[1 + (i % 3)],
      false,
      true,
      (ARRAY[5, 4, 3])[1 + (i % 3)],
      (ARRAY['intermediaire','debutant','debutant'])[1 + (i % 3)],
      (now() - ((i * 3) || ' days')::interval)::date
    );
  END LOOP;

  RAISE NOTICE '✓ 3 templates sport + 15 assignations';

  -- ─────────────────────────────────────────────────────────────
  -- 16. PROGRAMMES NUTRITION (3 templates + 10 assignations)
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO nutrition_programmes (coach_id, client_id, nom, description, objectif, duree_semaines, is_template, is_active)
  VALUES
    (coach_uuid, NULL, 'Plan Perte de poids',  'Déficit calorique contrôlé', 'Sèche',          8, true, true),
    (coach_uuid, NULL, 'Plan Prise de masse',  'Surplus calorique propre',   'Prise de masse', 12, true, true),
    (coach_uuid, NULL, 'Plan Maintenance',     'Équilibre et santé',         'Maintenance',    4, true, true);

  SELECT id INTO prog_nutri_perte FROM nutrition_programmes WHERE coach_id = coach_uuid AND nom = 'Plan Perte de poids' AND is_template = true LIMIT 1;
  SELECT id INTO prog_nutri_masse FROM nutrition_programmes WHERE coach_id = coach_uuid AND nom = 'Plan Prise de masse' AND is_template = true LIMIT 1;
  SELECT id INTO prog_nutri_maint FROM nutrition_programmes WHERE coach_id = coach_uuid AND nom = 'Plan Maintenance'    AND is_template = true LIMIT 1;

  FOR i IN 1..10 LOOP
    INSERT INTO nutrition_programmes (coach_id, client_id, nom, description, objectif, duree_semaines, is_template, is_active, date_debut)
    VALUES (
      coach_uuid,
      client_ids[i],
      (ARRAY['Plan Perte de poids','Plan Prise de masse','Plan Maintenance'])[1 + (i % 3)],
      'Plan assigné',
      (ARRAY['Sèche','Prise de masse','Maintenance'])[1 + (i % 3)],
      (ARRAY[8, 12, 4])[1 + (i % 3)],
      false,
      true,
      (now() - ((i * 5) || ' days')::interval)::date
    );
  END LOOP;

  RAISE NOTICE '✓ 3 templates nutrition + 10 assignations';

  -- ─────────────────────────────────────────────────────────────
  -- 17. PROSPECTS (8 leads)
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO prospects (coach_id, prenom, nom, email, telephone, valeur_estimee, statut, notes)
  VALUES
    (coach_uuid, 'Camille',   'Rivière',  'camille.r@gmail.com',   '+33612345601', 89000,  'contact',     'Venue via Instagram reel'),
    (coach_uuid, 'Thomas',    'Perret',   'tperret@outlook.fr',    '+33612345602', 149000, 'appel',       'Appel découverte prévu vendredi'),
    (coach_uuid, 'Emma',      'Delacroix','emma.dlc@gmail.com',    '+33612345603', 89000,  'proposition', 'Proposition envoyée le 15/04'),
    (coach_uuid, 'Léo',       'Favre',    'leo.favre@gmail.com',   '+33612345604', 149000, 'closing',     'Hésite entre 3 et 6 mois'),
    (coach_uuid, 'Sophie',    'Aubert',   'saubert@free.fr',       '+33612345605', 49000,  'contact',     'Referral de Sarah Martin'),
    (coach_uuid, 'Nicolas',   'Brun',     'nbrun@pro.fr',          '+33612345606', 89000,  'appel',       'Intéressé programme 12 sem'),
    (coach_uuid, 'Julia',     'Meyer',    'julia.meyer@gmail.com', '+33612345607', 149000, 'proposition', 'En attente signature contrat'),
    (coach_uuid, 'Benjamin',  'Lopez',    'blopez@gmail.com',      '+33612345608', 49000,  'contact',     'Lead Facebook Ads');

  RAISE NOTICE '✓ 8 prospects CRM';

  -- ─────────────────────────────────────────────────────────────
  -- 18. FORMULAIRES (bilan initial + check-in + réponses)
  -- ─────────────────────────────────────────────────────────────
  INSERT INTO formulaires (coach_id, titre, type, description, actif)
  VALUES
    (coach_uuid, 'Bilan initial',        'bilan_initial', 'Formulaire de départ complet', true),
    (coach_uuid, 'Check-in hebdomadaire', 'check_in',     'Suivi rapide de la semaine', true);

  SELECT id INTO form_bilan   FROM formulaires WHERE coach_id = coach_uuid AND type = 'bilan_initial' LIMIT 1;
  SELECT id INTO form_checkin FROM formulaires WHERE coach_id = coach_uuid AND type = 'check_in'      LIMIT 1;

  -- Champs du bilan initial
  INSERT INTO formulaire_champs (formulaire_id, label, type_champ, obligatoire, ordre) VALUES
    (form_bilan, 'Quel est ton objectif principal ?',    'texte',       true, 1),
    (form_bilan, 'Niveau sportif actuel',                'choix_multiple', true, 2),
    (form_bilan, 'Nombre de séances possibles par semaine', 'nombre',   true, 3),
    (form_bilan, 'Blessures ou restrictions ?',          'oui_non',     false, 4),
    (form_bilan, 'Motivation sur 10',                    'note_1_10',   true, 5);

  INSERT INTO formulaire_champs (formulaire_id, label, type_champ, obligatoire, ordre) VALUES
    (form_checkin, 'Comment s''est passée ta semaine ?', 'note_1_10', true, 1),
    (form_checkin, 'Combien de séances réalisées ?',     'nombre',    true, 2),
    (form_checkin, 'Difficultés rencontrées',            'texte',     false, 3);

  -- Réponses bilan pour 10 clients
  FOR i IN 1..10 LOOP
    INSERT INTO formulaire_reponses (formulaire_id, client_id, reponses, complete, created_at)
    VALUES (
      form_bilan,
      client_ids[i],
      jsonb_build_object(
        'objectif', 'Perdre 5-10 kg et me tonifier',
        'niveau',   (ARRAY['Débutant','Intermédiaire','Avancé'])[1 + (i % 3)],
        'seances',  3 + (i % 3),
        'blessures', i % 4 = 0,
        'motivation', 7 + (i % 3)
      ),
      true,
      now() - ((i * 3) || ' days')::interval
    );
  END LOOP;

  -- Réponses check-in hebdo pour 5 clients
  FOR i IN 1..5 LOOP
    INSERT INTO formulaire_reponses (formulaire_id, client_id, reponses, complete, created_at)
    VALUES (
      form_checkin,
      client_ids[i],
      jsonb_build_object(
        'semaine', 7 + (i % 3),
        'seances', 3 + (i % 2),
        'difficultes', 'RAS'
      ),
      true,
      now() - ((i * 2) || ' days')::interval
    );
  END LOOP;

  RAISE NOTICE '✓ Formulaires : bilan(10) + check-in(5)';

  -- ─────────────────────────────────────────────────────────────
  -- 19. MESSAGES (5 threads × 3-5 messages)
  -- ─────────────────────────────────────────────────────────────
  FOR i IN 1..5 LOOP
    INSERT INTO messages (coach_id, client_id, expediteur, contenu, lu, created_at) VALUES
      (coach_uuid, client_ids[i], 'client', 'Salut coach, j''ai une question sur le programme',            true,  now() - ((i * 2) || ' days')::interval),
      (coach_uuid, client_ids[i], 'coach',  'Bien sûr, dis-moi tout !',                                      true,  now() - ((i * 2) || ' days')::interval + interval '15 min'),
      (coach_uuid, client_ids[i], 'client', 'Je sens que je progresse mais j''ai mal aux épaules',           true,  now() - ((i * 2) || ' days')::interval + interval '1 hour'),
      (coach_uuid, client_ids[i], 'coach',  'On va adapter le travail pectoraux, j''envoie les nouveaux exos', false, now() - ((i * 2) || ' days')::interval + interval '2 hours'),
      (coach_uuid, client_ids[i], 'client', 'Parfait, merci !',                                              false, now() - ((i * 2) || ' days')::interval + interval '2 hours 5 min');
  END LOOP;

  RAISE NOTICE '✓ 5 threads messagerie';

  -- ─────────────────────────────────────────────────────────────
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '  ✅ SEED DÉMO COACH TERMINÉ';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '  40 clients · 4 offres · 36+ paiements · 27 abonnements';
  RAISE NOTICE '  15 factures · 4 virements · 20 événements calendrier';
  RAISE NOTICE '  18 programmes sport · 13 programmes nutrition';
  RAISE NOTICE '  8 prospects · 2 formulaires · 5 threads messagerie';
  RAISE NOTICE '════════════════════════════════════════════════';
END $$;
