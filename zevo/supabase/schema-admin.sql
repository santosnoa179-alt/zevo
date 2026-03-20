-- ============================================================
-- PHASE 9 — Super Admin (FIX v2 — RLS sans récursion)
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Table des administrateurs (whitelist)
create table if not exists admins (
  id uuid primary key references auth.users(id),
  created_at timestamptz default now()
);

-- ════════════════════════════════════════════════════════════
-- ÉTAPE 1 : Nettoyer TOUTES les anciennes policies
-- ════════════════════════════════════════════════════════════

drop policy if exists "admins_select" on admins;
drop policy if exists "admins_select_own" on admins;
drop policy if exists "admin_select_all_coaches" on coaches;
drop policy if exists "admin_update_all_coaches" on coaches;
drop policy if exists "admin_select_all_profiles" on profiles;
drop policy if exists "admin_select_all_clients" on clients;

-- ════════════════════════════════════════════════════════════
-- ÉTAPE 2 : DÉSACTIVER le RLS sur admins
-- C'est une table whitelist minuscule. Pas besoin de RLS.
-- Ça évite toute récursion.
-- ════════════════════════════════════════════════════════════

alter table admins disable row level security;

-- ════════════════════════════════════════════════════════════
-- ÉTAPE 3 : Fonction SECURITY DEFINER
-- S'exécute avec les droits du créateur → bypass RLS
-- Peut lire admins librement car RLS est désactivé dessus
-- ════════════════════════════════════════════════════════════

drop function if exists is_admin();

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from admins where id = auth.uid()
  );
$$ language sql security definer stable;

-- ════════════════════════════════════════════════════════════
-- ÉTAPE 4 : Policies admin sur les autres tables
-- ════════════════════════════════════════════════════════════

create policy "admin_select_all_coaches" on coaches
  for select using (is_admin());

create policy "admin_update_all_coaches" on coaches
  for update using (is_admin());

create policy "admin_select_all_profiles" on profiles
  for select using (is_admin());

create policy "admin_select_all_clients" on clients
  for select using (is_admin());

-- ============================================================
-- Pour ajouter un admin :
-- INSERT INTO admins (id) VALUES ('votre-user-id-ici');
-- ============================================================
