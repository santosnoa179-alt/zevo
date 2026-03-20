-- ============================================================
-- PHASE 5d — Formulaires personnalisés
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Table des formulaires (templates créés par le coach)
create table formulaires (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id) on delete cascade,
  titre text not null,
  type text default 'custom' check (type in ('bilan_initial','check_in','sante','satisfaction','custom')),
  description text,
  actif boolean default true,
  created_at timestamptz default now()
);

-- Table des champs de chaque formulaire
create table formulaire_champs (
  id uuid default gen_random_uuid() primary key,
  formulaire_id uuid references formulaires(id) on delete cascade,
  label text not null,
  type_champ text check (type_champ in ('texte','nombre','note_1_10','choix_multiple','oui_non','date')),
  options jsonb,              -- pour choix_multiple : ["Option A","Option B","Option C"]
  obligatoire boolean default false,
  ordre int not null
);

-- Table des réponses soumises par les clients
create table formulaire_reponses (
  id uuid default gen_random_uuid() primary key,
  formulaire_id uuid references formulaires(id),
  client_id uuid references clients(id) on delete cascade,
  reponses jsonb not null,    -- { "champ_id": "valeur", ... }
  complete boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table formulaires enable row level security;
alter table formulaire_champs enable row level security;
alter table formulaire_reponses enable row level security;

-- ── formulaires ──
-- Le coach voit ses propres formulaires
create policy "formulaires_select_coach" on formulaires
  for select using (auth.uid() = coach_id);

-- Le client voit les formulaires de son coach (pour les remplir)
create policy "formulaires_select_client" on formulaires
  for select using (
    exists (
      select 1 from clients c where c.id = auth.uid() and c.coach_id = formulaires.coach_id
    )
  );

-- Le coach gère (insert/update/delete) ses formulaires
create policy "formulaires_insert_coach" on formulaires
  for insert with check (auth.uid() = coach_id);

create policy "formulaires_update_coach" on formulaires
  for update using (auth.uid() = coach_id);

create policy "formulaires_delete_coach" on formulaires
  for delete using (auth.uid() = coach_id);

-- ── formulaire_champs ──
-- Lecture : coach propriétaire du formulaire + clients du coach
create policy "champs_select_coach" on formulaire_champs
  for select using (
    exists (
      select 1 from formulaires f where f.id = formulaire_champs.formulaire_id and f.coach_id = auth.uid()
    )
  );

create policy "champs_select_client" on formulaire_champs
  for select using (
    exists (
      select 1 from formulaires f
      join clients c on c.coach_id = f.coach_id
      where f.id = formulaire_champs.formulaire_id and c.id = auth.uid()
    )
  );

-- Le coach gère les champs de ses formulaires
create policy "champs_insert_coach" on formulaire_champs
  for insert with check (
    exists (
      select 1 from formulaires f where f.id = formulaire_champs.formulaire_id and f.coach_id = auth.uid()
    )
  );

create policy "champs_update_coach" on formulaire_champs
  for update using (
    exists (
      select 1 from formulaires f where f.id = formulaire_champs.formulaire_id and f.coach_id = auth.uid()
    )
  );

create policy "champs_delete_coach" on formulaire_champs
  for delete using (
    exists (
      select 1 from formulaires f where f.id = formulaire_champs.formulaire_id and f.coach_id = auth.uid()
    )
  );

-- ── formulaire_reponses ──
-- Le client voit ses propres réponses
create policy "reponses_select_client" on formulaire_reponses
  for select using (auth.uid() = client_id);

-- Le coach voit les réponses de ses clients
create policy "reponses_select_coach" on formulaire_reponses
  for select using (
    exists (
      select 1 from clients c where c.id = formulaire_reponses.client_id and c.coach_id = auth.uid()
    )
  );

-- Le client peut insérer et mettre à jour ses propres réponses
create policy "reponses_insert_client" on formulaire_reponses
  for insert with check (auth.uid() = client_id);

create policy "reponses_update_client" on formulaire_reponses
  for update using (auth.uid() = client_id);

-- ============================================================
-- Index pour performances
-- ============================================================

create index idx_formulaires_coach on formulaires(coach_id);
create index idx_champs_formulaire on formulaire_champs(formulaire_id, ordre);
create index idx_reponses_formulaire on formulaire_reponses(formulaire_id);
create index idx_reponses_client on formulaire_reponses(client_id);
