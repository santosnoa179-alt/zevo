-- ============================================================
-- ZEVO — Phase 5b : Programmes de coaching
-- Colle ce fichier dans Supabase Studio > SQL Editor > New query
-- ============================================================


-- ============================================================
-- 1. TABLE PROGRAMMES
-- Programme réutilisable créé par un coach
-- ============================================================
create table if not exists programmes (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id) on delete cascade,
  titre text not null,
  description text,
  duree_semaines int default 4,
  categorie text,
  actif boolean default true,
  created_at timestamptz default now()
);

-- Index pour lister les programmes d'un coach
create index if not exists idx_programmes_coach on programmes(coach_id);


-- ============================================================
-- 2. TABLE PROGRAMME_PHASES
-- Chaque programme contient N phases ordonnées
-- ============================================================
create table if not exists programme_phases (
  id uuid default gen_random_uuid() primary key,
  programme_id uuid references programmes(id) on delete cascade,
  titre text not null,
  description text,
  ordre int not null,
  duree_semaines int default 1,
  -- Habitudes à créer automatiquement pour le client
  habitudes jsonb default '[]',
  -- Objectifs à créer automatiquement pour le client
  objectifs jsonb default '[]',
  -- Ressources à partager (optionnel)
  ressources jsonb default '[]'
);

-- Index pour charger les phases d'un programme
create index if not exists idx_phases_programme on programme_phases(programme_id, ordre);


-- ============================================================
-- 3. TABLE PROGRAMME_ASSIGNATIONS
-- Lien programme <-> client (qui suit quel programme)
-- ============================================================
create table if not exists programme_assignations (
  id uuid default gen_random_uuid() primary key,
  programme_id uuid references programmes(id),
  client_id uuid references clients(id) on delete cascade,
  coach_id uuid references coaches(id),
  date_debut date default current_date,
  phase_actuelle int default 1,
  statut text default 'en_cours' check (statut in ('en_cours','pause','termine')),
  created_at timestamptz default now()
);

-- Index pour les assignations d'un client et d'un coach
create index if not exists idx_assignations_client on programme_assignations(client_id);
create index if not exists idx_assignations_coach on programme_assignations(coach_id);
create index if not exists idx_assignations_programme on programme_assignations(programme_id);


-- ============================================================
-- 4. RLS (Row Level Security)
-- ============================================================

-- Programmes : le coach voit les siens, l'admin voit tout
alter table programmes enable row level security;

create policy "Coach voit ses programmes"
  on programmes for select
  using (coach_id = auth.uid());

create policy "Coach crée ses programmes"
  on programmes for insert
  with check (coach_id = auth.uid());

create policy "Coach modifie ses programmes"
  on programmes for update
  using (coach_id = auth.uid());

create policy "Coach supprime ses programmes"
  on programmes for delete
  using (coach_id = auth.uid());

-- Admin voit tout
create policy "Admin voit tous les programmes"
  on programmes for select
  using (exists (select 1 from admin where id = auth.uid()));


-- Phases : accessibles via le programme (même coach)
alter table programme_phases enable row level security;

create policy "Coach voit les phases de ses programmes"
  on programme_phases for select
  using (exists (
    select 1 from programmes where programmes.id = programme_phases.programme_id
    and programmes.coach_id = auth.uid()
  ));

create policy "Coach crée des phases pour ses programmes"
  on programme_phases for insert
  with check (exists (
    select 1 from programmes where programmes.id = programme_phases.programme_id
    and programmes.coach_id = auth.uid()
  ));

create policy "Coach modifie les phases de ses programmes"
  on programme_phases for update
  using (exists (
    select 1 from programmes where programmes.id = programme_phases.programme_id
    and programmes.coach_id = auth.uid()
  ));

create policy "Coach supprime les phases de ses programmes"
  on programme_phases for delete
  using (exists (
    select 1 from programmes where programmes.id = programme_phases.programme_id
    and programmes.coach_id = auth.uid()
  ));


-- Assignations : coach + client concerné
alter table programme_assignations enable row level security;

create policy "Coach voit ses assignations"
  on programme_assignations for select
  using (coach_id = auth.uid());

create policy "Client voit son assignation"
  on programme_assignations for select
  using (client_id = auth.uid());

create policy "Coach crée des assignations"
  on programme_assignations for insert
  with check (coach_id = auth.uid());

create policy "Coach modifie ses assignations"
  on programme_assignations for update
  using (coach_id = auth.uid());

create policy "Coach supprime ses assignations"
  on programme_assignations for delete
  using (coach_id = auth.uid());

-- Admin voit toutes les assignations
create policy "Admin voit toutes les assignations"
  on programme_assignations for select
  using (exists (select 1 from admin where id = auth.uid()));
