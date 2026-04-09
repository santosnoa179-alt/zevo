-- ============================================================
-- SECTION PAIEMENTS COMPLÈTE
-- Étend la phase 5g (Stripe Connect) avec :
--   - abonnements_clients (récurrences)
--   - factures
--   - liens_paiement
--   - codes_reduction
--   - virements_coach
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ══════════════════════════════════════
-- 1. ABONNEMENTS CLIENTS (récurrents)
-- ══════════════════════════════════════

create table if not exists abonnements_clients (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  coach_id uuid references coaches(id) on delete cascade,
  offre_id uuid references offres_coaching(id) on delete set null,
  montant int not null,                    -- en centimes
  frequence text check (frequence in ('mensuel','trimestriel','annuel')),
  statut text default 'actif' check (statut in ('actif','en_pause','annule','expire')),
  stripe_subscription_id text,
  date_debut timestamptz default now(),
  date_prochaine_echeance timestamptz,
  date_fin timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ══════════════════════════════════════
-- 2. FACTURES
-- ══════════════════════════════════════

create table if not exists factures (
  id uuid default gen_random_uuid() primary key,
  numero text not null,                    -- ex: FAC-2026-042
  coach_id uuid references coaches(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  paiement_id uuid references paiements_clients(id) on delete set null,
  offre_id uuid references offres_coaching(id) on delete set null,
  montant int not null,                    -- en centimes
  statut text default 'payee' check (statut in ('payee','en_attente','annulee')),
  stripe_invoice_id text,
  date_emission timestamptz default now(),
  created_at timestamptz default now()
);

-- ══════════════════════════════════════
-- 3. LIENS DE PAIEMENT
-- ══════════════════════════════════════

create table if not exists liens_paiement (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id) on delete cascade,
  titre text not null,
  description text,
  montant int default 0,                   -- en centimes, 0 = gratuit
  slug text not null,                      -- identifiant unique pour l'URL
  actif boolean default true,
  vues int default 0,
  paiements_recus int default 0,
  stripe_payment_link_id text,
  created_at timestamptz default now()
);

-- ══════════════════════════════════════
-- 4. CODES DE RÉDUCTION
-- ══════════════════════════════════════

create table if not exists codes_reduction (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id) on delete cascade,
  code text not null,                      -- ex: BIENVENUE20
  type text check (type in ('pourcentage','fixe')),
  valeur int not null,                     -- pourcentage (20 = 20%) ou centimes (1000 = 10€)
  utilisations int default 0,
  limite_utilisations int,                 -- null = illimité
  actif boolean default true,
  date_expiration timestamptz,
  stripe_coupon_id text,
  created_at timestamptz default now()
);

-- ══════════════════════════════════════
-- 5. VIREMENTS COACH (historique payouts)
-- ══════════════════════════════════════

create table if not exists virements_coach (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id) on delete cascade,
  montant int not null,                    -- en centimes
  statut text default 'en_cours' check (statut in ('en_cours','effectue','echoue')),
  banque_dernier4 text,                    -- ex: 4242
  stripe_payout_id text,
  date_virement timestamptz default now(),
  created_at timestamptz default now()
);

-- Ajouter colonne solde au coach si pas déjà existante
alter table coaches add column if not exists solde_disponible int default 0;
alter table coaches add column if not exists solde_en_attente int default 0;

-- ══════════════════════════════════════
-- Ajout colonne email sur paiements_clients (utile pour affichage)
-- ══════════════════════════════════════
alter table paiements_clients add column if not exists description text;

-- ══════════════════════════════════════
-- RLS (Row Level Security)
-- ══════════════════════════════════════

alter table abonnements_clients enable row level security;
alter table factures enable row level security;
alter table liens_paiement enable row level security;
alter table codes_reduction enable row level security;
alter table virements_coach enable row level security;

-- ── abonnements_clients ──
create policy "abo_select_coach" on abonnements_clients
  for select using (auth.uid() = coach_id);
create policy "abo_insert_coach" on abonnements_clients
  for insert with check (auth.uid() = coach_id);
create policy "abo_update_coach" on abonnements_clients
  for update using (auth.uid() = coach_id);
create policy "abo_delete_coach" on abonnements_clients
  for delete using (auth.uid() = coach_id);
create policy "abo_select_client" on abonnements_clients
  for select using (auth.uid() = client_id);

-- ── factures ──
create policy "factures_select_coach" on factures
  for select using (auth.uid() = coach_id);
create policy "factures_insert_coach" on factures
  for insert with check (auth.uid() = coach_id);
create policy "factures_update_coach" on factures
  for update using (auth.uid() = coach_id);
create policy "factures_select_client" on factures
  for select using (auth.uid() = client_id);

-- ── liens_paiement ──
create policy "liens_select_coach" on liens_paiement
  for select using (auth.uid() = coach_id);
create policy "liens_insert_coach" on liens_paiement
  for insert with check (auth.uid() = coach_id);
create policy "liens_update_coach" on liens_paiement
  for update using (auth.uid() = coach_id);
create policy "liens_delete_coach" on liens_paiement
  for delete using (auth.uid() = coach_id);

-- ── codes_reduction ──
create policy "codes_select_coach" on codes_reduction
  for select using (auth.uid() = coach_id);
create policy "codes_insert_coach" on codes_reduction
  for insert with check (auth.uid() = coach_id);
create policy "codes_update_coach" on codes_reduction
  for update using (auth.uid() = coach_id);
create policy "codes_delete_coach" on codes_reduction
  for delete using (auth.uid() = coach_id);

-- ── virements_coach ──
create policy "virements_select_coach" on virements_coach
  for select using (auth.uid() = coach_id);
create policy "virements_insert_coach" on virements_coach
  for insert with check (auth.uid() = coach_id);

-- ══════════════════════════════════════
-- INDEX
-- ══════════════════════════════════════

create index if not exists idx_abo_coach on abonnements_clients(coach_id);
create index if not exists idx_abo_client on abonnements_clients(client_id);
create index if not exists idx_abo_statut on abonnements_clients(statut);
create index if not exists idx_factures_coach on factures(coach_id);
create index if not exists idx_factures_client on factures(client_id);
create index if not exists idx_liens_coach on liens_paiement(coach_id);
create index if not exists idx_liens_slug on liens_paiement(slug);
create index if not exists idx_codes_coach on codes_reduction(coach_id);
create index if not exists idx_codes_code on codes_reduction(code);
create index if not exists idx_virements_coach on virements_coach(coach_id);
