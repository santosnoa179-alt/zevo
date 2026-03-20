-- ============================================================
-- FIX RLS — Remplacer toutes les références à la table "admin"
-- par la fonction is_admin() (SECURITY DEFINER, sans récursion)
--
-- CONTEXTE :
-- schema.sql utilisait "exists (select 1 from admin where id = auth.uid())"
-- dans toutes les policies. La table "admin" a RLS activé dessus,
-- ce qui provoque une récursion infinie.
--
-- schema-admin.sql a déjà créé :
--   - table "admins" (pluriel) SANS RLS
--   - fonction is_admin() SECURITY DEFINER qui lit "admins"
--
-- Ce script supprime toutes les policies cassées et les recrée
-- avec is_admin() à la place.
--
-- À exécuter dans Supabase SQL Editor.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- ÉTAPE 1 : Drop TOUTES les policies qui dépendent de "admin"
-- (AVANT de drop la table, sinon erreur de dépendance)
-- ════════════════════════════════════════════════════════════

-- profiles
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_read_own" on profiles;

-- coaches
drop policy if exists "coaches_select" on coaches;

-- clients
drop policy if exists "clients_select" on clients;

-- invitations
drop policy if exists "invitations_select" on invitations;
drop policy if exists "invitations_update" on invitations;
drop policy if exists "invitations_select_by_token" on invitations;
drop policy if exists "invitations_insert" on invitations;

-- habitudes
drop policy if exists "habitudes_select" on habitudes;

-- habitudes_log
drop policy if exists "habitudes_log_select" on habitudes_log;

-- objectifs
drop policy if exists "objectifs_select" on objectifs;

-- taches
drop policy if exists "taches_select" on taches;

-- sommeil_log
drop policy if exists "sommeil_log_select" on sommeil_log;

-- humeur_log
drop policy if exists "humeur_log_select" on humeur_log;

-- sport_log
drop policy if exists "sport_log_select" on sport_log;

-- routines
drop policy if exists "routines_select" on routines;

-- budget
drop policy if exists "budget_select" on budget;

-- messages
drop policy if exists "messages_select" on messages;

-- ressources (bibliothèque)
drop policy if exists "Admin voit toutes les ressources" on ressources;

-- programmes
drop policy if exists "Admin voit tous les programmes" on programmes;

-- programme_assignations
drop policy if exists "Admin voit toutes les assignations" on programme_assignations;

-- admin table policy
drop policy if exists "admin_select" on admin;


-- ════════════════════════════════════════════════════════════
-- ÉTAPE 2 : Supprimer la table "admin" (singulier)
-- On garde uniquement "admins" (pluriel) sans RLS
-- ════════════════════════════════════════════════════════════

drop table if exists admin;


-- ════════════════════════════════════════════════════════════
-- ÉTAPE 3 : Recréer toutes les policies avec is_admin()
-- ════════════════════════════════════════════════════════════

-- ── PROFILES ──
create policy "profiles_select_own" on profiles
  for select using (
    auth.uid() = id
    or is_admin()
  );

-- ── COACHES ──
create policy "coaches_select" on coaches
  for select using (
    auth.uid() = id
    or is_admin()
  );

-- ── CLIENTS ──
create policy "clients_select" on clients
  for select using (
    auth.uid() = id
    or auth.uid() = coach_id
    or is_admin()
  );

-- ── INVITATIONS ──
create policy "invitations_select" on invitations
  for select using (
    auth.uid() = coach_id
    or is_admin()
  );

create policy "invitations_insert" on invitations
  for insert with check (auth.uid() = coach_id);

create policy "invitations_update" on invitations
  for update using (
    auth.uid() = coach_id
    or is_admin()
  );

-- Lecture publique du token pour /invite/:token
create policy "invitations_select_by_token" on invitations
  for select using (true);

-- ── HABITUDES ──
create policy "habitudes_select" on habitudes
  for select using (
    auth.uid() = client_id
    or auth.uid() = assigned_by
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

-- ── HABITUDES_LOG ──
create policy "habitudes_log_select" on habitudes_log
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

-- ── OBJECTIFS ──
create policy "objectifs_select" on objectifs
  for select using (
    auth.uid() = client_id
    or auth.uid() = assigned_by
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

-- ── TACHES ──
create policy "taches_select" on taches
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

-- ── SOMMEIL_LOG ──
create policy "sommeil_log_select" on sommeil_log
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

-- ── HUMEUR_LOG ──
create policy "humeur_log_select" on humeur_log
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

-- ── SPORT_LOG ──
create policy "sport_log_select" on sport_log
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

-- ── ROUTINES ──
create policy "routines_select" on routines
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

-- ── BUDGET ──
create policy "budget_select" on budget
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

-- ── MESSAGES ──
create policy "messages_select" on messages
  for select using (
    auth.uid() = coach_id
    or auth.uid() = client_id
    or is_admin()
  );

-- ── RESSOURCES (bibliothèque) ──
create policy "Admin voit toutes les ressources" on ressources
  for select using (is_admin());

-- ── PROGRAMMES ──
create policy "Admin voit tous les programmes" on programmes
  for select using (is_admin());

-- ── PROGRAMME_ASSIGNATIONS ──
create policy "Admin voit toutes les assignations" on programme_assignations
  for select using (is_admin());


-- ============================================================
-- DONE ! Toutes les policies utilisent maintenant is_admin()
-- qui lit la table "admins" (sans RLS) via SECURITY DEFINER.
-- Plus aucune récursion possible.
-- ============================================================
