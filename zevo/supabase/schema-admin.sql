-- ============================================================
-- PHASE 9 — Super Admin
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Table des administrateurs (whitelist)
create table if not exists admins (
  id uuid primary key references auth.users(id),
  created_at timestamptz default now()
);

alter table admins enable row level security;

-- Seul un admin peut lire la table admins
create policy "admins_select" on admins
  for select using (auth.uid() in (select id from admins));

-- ── Policies supplémentaires pour l'admin ──

-- L'admin peut lire TOUS les coaches
create policy "admin_select_all_coaches" on coaches
  for select using (auth.uid() in (select id from admins));

-- L'admin peut modifier TOUS les coaches (activer/suspendre, changer plan)
create policy "admin_update_all_coaches" on coaches
  for update using (auth.uid() in (select id from admins));

-- L'admin peut lire TOUS les profiles
create policy "admin_select_all_profiles" on profiles
  for select using (auth.uid() in (select id from admins));

-- L'admin peut lire TOUS les clients (pour les stats)
create policy "admin_select_all_clients" on clients
  for select using (auth.uid() in (select id from admins));

-- ============================================================
-- Pour ajouter un admin, insérez son user_id :
-- INSERT INTO admins (id) VALUES ('votre-user-id-ici');
-- ============================================================
