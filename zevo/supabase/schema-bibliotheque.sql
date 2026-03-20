-- ============================================================
-- ZEVO — Phase 5c : Bibliothèque de ressources
-- Colle ce fichier dans Supabase Studio > SQL Editor > New query
-- ============================================================


-- ============================================================
-- 1. TABLE RESSOURCES
-- Fichiers et liens stockés par le coach
-- ============================================================
create table if not exists ressources (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id) on delete cascade,
  titre text not null,
  type text check (type in ('pdf','video','lien','image','guide')),
  url text,
  categorie text,
  description text,
  created_at timestamptz default now()
);

create index if not exists idx_ressources_coach on ressources(coach_id);


-- ============================================================
-- 2. TABLE RESSOURCES_PARTAGES
-- Lien ressource <-> client (qui a accès à quoi)
-- ============================================================
create table if not exists ressources_partages (
  id uuid default gen_random_uuid() primary key,
  ressource_id uuid references ressources(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  partage_at timestamptz default now(),
  unique(ressource_id, client_id)
);

create index if not exists idx_partages_client on ressources_partages(client_id);
create index if not exists idx_partages_ressource on ressources_partages(ressource_id);


-- ============================================================
-- 3. RLS (Row Level Security)
-- ============================================================

-- Ressources : le coach voit les siennes
alter table ressources enable row level security;

create policy "Coach voit ses ressources"
  on ressources for select
  using (coach_id = auth.uid());

create policy "Coach crée ses ressources"
  on ressources for insert
  with check (coach_id = auth.uid());

create policy "Coach modifie ses ressources"
  on ressources for update
  using (coach_id = auth.uid());

create policy "Coach supprime ses ressources"
  on ressources for delete
  using (coach_id = auth.uid());

-- Admin voit tout
create policy "Admin voit toutes les ressources"
  on ressources for select
  using (is_admin());


-- Partages : coach voit les siens, client voit les siens
alter table ressources_partages enable row level security;

create policy "Coach voit les partages de ses ressources"
  on ressources_partages for select
  using (exists (
    select 1 from ressources
    where ressources.id = ressources_partages.ressource_id
    and ressources.coach_id = auth.uid()
  ));

create policy "Client voit ses partages"
  on ressources_partages for select
  using (client_id = auth.uid());

create policy "Coach crée des partages"
  on ressources_partages for insert
  with check (exists (
    select 1 from ressources
    where ressources.id = ressources_partages.ressource_id
    and ressources.coach_id = auth.uid()
  ));

create policy "Coach supprime des partages"
  on ressources_partages for delete
  using (exists (
    select 1 from ressources
    where ressources.id = ressources_partages.ressource_id
    and ressources.coach_id = auth.uid()
  ));


-- ============================================================
-- 4. BUCKET STORAGE (à créer manuellement dans Supabase Studio)
-- Nom : "ressources"
-- Public : true (pour que les clients accèdent aux fichiers)
-- ============================================================
-- Note : créer le bucket via Supabase Studio > Storage > New bucket > "ressources" > Public
