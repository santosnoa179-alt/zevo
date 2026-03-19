-- ============================================================
-- ZEVO — Schéma complet Supabase
-- Colle ce fichier dans Supabase Studio > SQL Editor > New query
-- ============================================================


-- ============================================================
-- 1. TABLE PROFILES (extension de auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  nom text,
  role text not null default 'client' check (role in ('admin', 'coach', 'client')),
  created_at timestamptz default now()
);

-- Trigger : crée automatiquement un profil à chaque signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, role)
  values (new.id, new.email, 'client')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ============================================================
-- 2. TABLE COACHES
-- ============================================================
create table if not exists coaches (
  id uuid references profiles(id) on delete cascade primary key,
  nom_app text default 'Zevo',
  logo_url text,
  couleur_primaire text default '#FF6B2B',
  couleur_secondaire text default '#0D0D0D',
  message_bienvenue text,
  modules jsonb default '{"sport":true,"sommeil":true,"humeur":true,"routines":true}',
  plan text default 'starter' check (plan in ('starter','pro','unlimited')),
  stripe_customer_id text,
  stripe_subscription_id text,
  abonnement_actif boolean default false,
  created_at timestamptz default now()
);


-- ============================================================
-- 3. TABLE CLIENTS
-- ============================================================
create table if not exists clients (
  id uuid references profiles(id) on delete cascade primary key,
  coach_id uuid references coaches(id) on delete cascade not null,
  actif boolean default true,
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);


-- ============================================================
-- 4. TABLE INVITATIONS
-- ============================================================
create table if not exists invitations (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id) on delete cascade,
  email text not null,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  acceptee boolean default false,
  expires_at timestamptz default now() + interval '7 days',
  created_at timestamptz default now()
);


-- ============================================================
-- 5. TABLE HABITUDES
-- ============================================================
create table if not exists habitudes (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  assigned_by uuid references coaches(id),
  nom text not null,
  objectif_mensuel int default 30,
  couleur text default '#FF6B2B',
  actif boolean default true,
  created_at timestamptz default now()
);


-- ============================================================
-- 6. TABLE HABITUDES_LOG
-- ============================================================
create table if not exists habitudes_log (
  id uuid default gen_random_uuid() primary key,
  habitude_id uuid references habitudes(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  date date not null,
  complete boolean default true,
  unique(habitude_id, date)
);


-- ============================================================
-- 7. TABLE OBJECTIFS
-- ============================================================
create table if not exists objectifs (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  assigned_by uuid references coaches(id),
  titre text not null,
  description text,
  score int default 0 check (score between 0 and 100),
  date_cible date,
  peut_supprimer boolean default true,
  archive boolean default false,
  created_at timestamptz default now()
);


-- ============================================================
-- 8. TABLE TACHES
-- ============================================================
create table if not exists taches (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  titre text not null,
  priorite text default 'normal' check (priorite in ('urgent','normal','faible')),
  statut text default 'en_cours' check (statut in ('en_cours','termine')),
  echeance date,
  created_at timestamptz default now()
);


-- ============================================================
-- 9. TABLE SOMMEIL_LOG
-- ============================================================
create table if not exists sommeil_log (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  date date not null,
  heures float not null,
  qualite int check (qualite between 1 and 5),
  unique(client_id, date)
);


-- ============================================================
-- 10. TABLE HUMEUR_LOG
-- ============================================================
create table if not exists humeur_log (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  date date not null,
  score int not null check (score between 1 and 10),
  note text,
  unique(client_id, date)
);


-- ============================================================
-- 11. TABLE SPORT_LOG
-- ============================================================
create table if not exists sport_log (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  date date not null,
  type_activite text,
  duree_minutes int,
  intensite int check (intensite between 1 and 5)
);


-- ============================================================
-- 12. TABLE ROUTINES
-- ============================================================
create table if not exists routines (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  type text check (type in ('matin','soir')),
  etapes jsonb default '[]',
  created_at timestamptz default now()
);


-- ============================================================
-- 13. TABLE BUDGET
-- ============================================================
create table if not exists budget (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  mois text not null,
  revenus jsonb default '[]',
  depenses_fixes jsonb default '[]',
  depenses_variables jsonb default '[]',
  unique(client_id, mois)
);


-- ============================================================
-- 14. TABLE MESSAGES
-- ============================================================
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references coaches(id),
  client_id uuid references clients(id),
  expediteur text not null check (expediteur in ('coach','client')),
  contenu text not null,
  lu boolean default false,
  created_at timestamptz default now()
);


-- ============================================================
-- 15. TABLE ADMIN
-- ============================================================
create table if not exists admin (
  id uuid references profiles(id) primary key,
  email text unique not null
);


-- ============================================================
-- INDEXES — performances des requêtes fréquentes
-- ============================================================
create index if not exists idx_clients_coach_id on clients(coach_id);
create index if not exists idx_habitudes_client_id on habitudes(client_id);
create index if not exists idx_habitudes_log_client_date on habitudes_log(client_id, date);
create index if not exists idx_habitudes_log_habitude_id on habitudes_log(habitude_id);
create index if not exists idx_objectifs_client_id on objectifs(client_id);
create index if not exists idx_taches_client_id on taches(client_id);
create index if not exists idx_sommeil_log_client_date on sommeil_log(client_id, date);
create index if not exists idx_humeur_log_client_date on humeur_log(client_id, date);
create index if not exists idx_sport_log_client_date on sport_log(client_id, date);
create index if not exists idx_messages_coach_client on messages(coach_id, client_id);
create index if not exists idx_messages_created_at on messages(created_at desc);
create index if not exists idx_invitations_token on invitations(token);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table profiles enable row level security;
alter table coaches enable row level security;
alter table clients enable row level security;
alter table invitations enable row level security;
alter table habitudes enable row level security;
alter table habitudes_log enable row level security;
alter table objectifs enable row level security;
alter table taches enable row level security;
alter table sommeil_log enable row level security;
alter table humeur_log enable row level security;
alter table sport_log enable row level security;
alter table routines enable row level security;
alter table budget enable row level security;
alter table messages enable row level security;
alter table admin enable row level security;


-- ── PROFILES ──
-- Chacun voit et modifie uniquement son propre profil
-- Les admins voient tout
create policy "profiles_select_own" on profiles
  for select using (
    auth.uid() = id
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);


-- ── COACHES ──
-- Coach voit son propre enregistrement
-- Admin voit tout
create policy "coaches_select" on coaches
  for select using (
    auth.uid() = id
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "coaches_update_own" on coaches
  for update using (auth.uid() = id);

create policy "coaches_insert_own" on coaches
  for insert with check (auth.uid() = id);


-- ── CLIENTS ──
-- Client voit son propre enregistrement
-- Son coach voit ses clients
-- Admin voit tout
create policy "clients_select" on clients
  for select using (
    auth.uid() = id
    or auth.uid() = coach_id
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "clients_update_own" on clients
  for update using (auth.uid() = id);

create policy "clients_insert" on clients
  for insert with check (auth.uid() = id);


-- ── INVITATIONS ──
-- Coach voit ses propres invitations
-- Admin voit tout
create policy "invitations_select" on invitations
  for select using (
    auth.uid() = coach_id
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "invitations_insert" on invitations
  for insert with check (auth.uid() = coach_id);

create policy "invitations_update" on invitations
  for update using (
    auth.uid() = coach_id
    or exists (select 1 from admin where id = auth.uid())
  );

-- Politique spéciale : lecture publique du token pour la page /invite/:token
create policy "invitations_select_by_token" on invitations
  for select using (true);


-- ── HABITUDES ──
create policy "habitudes_select" on habitudes
  for select using (
    auth.uid() = client_id
    or auth.uid() = assigned_by
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "habitudes_insert" on habitudes
  for insert with check (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
  );

create policy "habitudes_update" on habitudes
  for update using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
  );

create policy "habitudes_delete" on habitudes
  for delete using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
  );


-- ── HABITUDES_LOG ──
create policy "habitudes_log_select" on habitudes_log
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "habitudes_log_insert" on habitudes_log
  for insert with check (auth.uid() = client_id);

create policy "habitudes_log_update" on habitudes_log
  for update using (auth.uid() = client_id);


-- ── OBJECTIFS ──
create policy "objectifs_select" on objectifs
  for select using (
    auth.uid() = client_id
    or auth.uid() = assigned_by
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "objectifs_insert" on objectifs
  for insert with check (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
  );

create policy "objectifs_update" on objectifs
  for update using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
  );

create policy "objectifs_delete" on objectifs
  for delete using (
    auth.uid() = client_id and peut_supprimer = true
  );


-- ── TACHES ──
create policy "taches_select" on taches
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "taches_insert" on taches
  for insert with check (auth.uid() = client_id);

create policy "taches_update" on taches
  for update using (auth.uid() = client_id);

create policy "taches_delete" on taches
  for delete using (auth.uid() = client_id);


-- ── SOMMEIL_LOG ──
create policy "sommeil_log_select" on sommeil_log
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "sommeil_log_insert" on sommeil_log
  for insert with check (auth.uid() = client_id);

create policy "sommeil_log_update" on sommeil_log
  for update using (auth.uid() = client_id);


-- ── HUMEUR_LOG ──
create policy "humeur_log_select" on humeur_log
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "humeur_log_insert" on humeur_log
  for insert with check (auth.uid() = client_id);

create policy "humeur_log_update" on humeur_log
  for update using (auth.uid() = client_id);


-- ── SPORT_LOG ──
create policy "sport_log_select" on sport_log
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "sport_log_insert" on sport_log
  for insert with check (auth.uid() = client_id);

create policy "sport_log_delete" on sport_log
  for delete using (auth.uid() = client_id);


-- ── ROUTINES ──
create policy "routines_select" on routines
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "routines_insert" on routines
  for insert with check (auth.uid() = client_id);

create policy "routines_update" on routines
  for update using (auth.uid() = client_id);


-- ── BUDGET ──
create policy "budget_select" on budget
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "budget_insert" on budget
  for insert with check (auth.uid() = client_id);

create policy "budget_update" on budget
  for update using (auth.uid() = client_id);


-- ── MESSAGES ──
create policy "messages_select" on messages
  for select using (
    auth.uid() = coach_id
    or auth.uid() = client_id
    or exists (select 1 from admin where id = auth.uid())
  );

create policy "messages_insert" on messages
  for insert with check (
    auth.uid() = coach_id or auth.uid() = client_id
  );

create policy "messages_update_lu" on messages
  for update using (
    auth.uid() = coach_id or auth.uid() = client_id
  );


-- ── ADMIN ──
-- Seuls les admins existants peuvent lire la table admin
create policy "admin_select" on admin
  for select using (
    exists (select 1 from admin where id = auth.uid())
  );


-- ============================================================
-- COMPTE ADMIN INITIAL
-- Remplace l'email par le tien, puis crée ton compte via /login
-- Une fois connecté, insère ton uuid depuis auth.users
-- ============================================================
-- Exemple (décommente après avoir créé ton compte) :
--
-- insert into profiles (id, email, role)
-- values ('TON-UUID-ICI', 'noa@example.com', 'admin')
-- on conflict (id) do update set role = 'admin';
--
-- insert into admin (id, email)
-- values ('TON-UUID-ICI', 'noa@example.com')
-- on conflict do nothing;
