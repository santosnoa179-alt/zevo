-- ============================================================
-- PHASE 5g — Paiement en ligne client (Stripe Connect)
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Ajouter les colonnes Stripe Connect à la table coaches
alter table coaches add column if not exists stripe_account_id text;
alter table coaches add column if not exists stripe_onboarding_complete boolean default false;

-- Table des offres de coaching créées par le coach
create table offres_coaching (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id) on delete cascade,
  titre text not null,
  description text,
  prix int not null,                -- en centimes (ex: 9900 = 99€)
  frequence text check (frequence in ('unique','mensuel','trimestriel','annuel')),
  actif boolean default true,
  stripe_price_id text,            -- ID du price dans Stripe
  created_at timestamptz default now()
);

-- Table des paiements clients
create table paiements_clients (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id),
  coach_id uuid references coaches(id),
  offre_id uuid references offres_coaching(id),
  montant int not null,             -- en centimes
  statut text check (statut in ('en_attente','paye','echoue','rembourse')),
  stripe_payment_intent_id text,
  methode_paiement text,
  date_paiement timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS
-- ============================================================

alter table offres_coaching enable row level security;
alter table paiements_clients enable row level security;

-- ── offres_coaching ──
-- Le coach voit et gère ses propres offres
create policy "offres_select_coach" on offres_coaching
  for select using (auth.uid() = coach_id);

create policy "offres_insert_coach" on offres_coaching
  for insert with check (auth.uid() = coach_id);

create policy "offres_update_coach" on offres_coaching
  for update using (auth.uid() = coach_id);

create policy "offres_delete_coach" on offres_coaching
  for delete using (auth.uid() = coach_id);

-- Le client voit les offres actives de son coach
create policy "offres_select_client" on offres_coaching
  for select using (
    actif = true and exists (
      select 1 from clients c where c.id = auth.uid() and c.coach_id = offres_coaching.coach_id
    )
  );

-- ── paiements_clients ──
-- Le coach voit les paiements de ses clients
create policy "paiements_select_coach" on paiements_clients
  for select using (auth.uid() = coach_id);

-- Le client voit ses propres paiements
create policy "paiements_select_client" on paiements_clients
  for select using (auth.uid() = client_id);

-- Insert par le système (via webhook) — on utilise service_role dans la function
-- Mais on autorise aussi le coach pour la création manuelle en attente
create policy "paiements_insert_coach" on paiements_clients
  for insert with check (auth.uid() = coach_id);

create policy "paiements_update_coach" on paiements_clients
  for update using (auth.uid() = coach_id);

-- ============================================================
-- Index
-- ============================================================

create index idx_offres_coach on offres_coaching(coach_id);
create index idx_paiements_coach on paiements_clients(coach_id);
create index idx_paiements_client on paiements_clients(client_id);
create index idx_paiements_statut on paiements_clients(statut);
