-- ============================================================
-- FIX RLS FINAL — Drop IF EXISTS + Recréer toutes les policies
-- Safe à exécuter plusieurs fois (idempotent)
-- ============================================================

-- ── DROP ALL ──
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_read_own" on profiles;
drop policy if exists "coaches_select" on coaches;
drop policy if exists "admin_select_all_coaches" on coaches;
drop policy if exists "admin_update_all_coaches" on coaches;
drop policy if exists "admin_select_all_profiles" on profiles;
drop policy if exists "clients_select" on clients;
drop policy if exists "admin_select_all_clients" on clients;
drop policy if exists "invitations_select" on invitations;
drop policy if exists "invitations_insert" on invitations;
drop policy if exists "invitations_update" on invitations;
drop policy if exists "invitations_select_by_token" on invitations;
drop policy if exists "habitudes_select" on habitudes;
drop policy if exists "habitudes_log_select" on habitudes_log;
drop policy if exists "objectifs_select" on objectifs;
drop policy if exists "taches_select" on taches;
drop policy if exists "sommeil_log_select" on sommeil_log;
drop policy if exists "humeur_log_select" on humeur_log;
drop policy if exists "sport_log_select" on sport_log;
drop policy if exists "routines_select" on routines;
drop policy if exists "budget_select" on budget;
drop policy if exists "messages_select" on messages;
drop policy if exists "Admin voit toutes les ressources" on ressources;
drop policy if exists "Admin voit tous les programmes" on programmes;
drop policy if exists "Admin voit toutes les assignations" on programme_assignations;

-- ── CREATE ALL ──

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id or is_admin());

create policy "coaches_select" on coaches
  for select using (auth.uid() = id or is_admin());

create policy "clients_select" on clients
  for select using (auth.uid() = id or auth.uid() = coach_id or is_admin());

create policy "invitations_select" on invitations
  for select using (auth.uid() = coach_id or is_admin());

create policy "invitations_insert" on invitations
  for insert with check (auth.uid() = coach_id);

create policy "invitations_update" on invitations
  for update using (auth.uid() = coach_id or is_admin());

create policy "invitations_select_by_token" on invitations
  for select using (true);

create policy "habitudes_select" on habitudes
  for select using (
    auth.uid() = client_id
    or auth.uid() = assigned_by
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

create policy "habitudes_log_select" on habitudes_log
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

create policy "objectifs_select" on objectifs
  for select using (
    auth.uid() = client_id
    or auth.uid() = assigned_by
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

create policy "taches_select" on taches
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

create policy "sommeil_log_select" on sommeil_log
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

create policy "humeur_log_select" on humeur_log
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

create policy "sport_log_select" on sport_log
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

create policy "routines_select" on routines
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

create policy "budget_select" on budget
  for select using (
    auth.uid() = client_id
    or exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid())
    or is_admin()
  );

create policy "messages_select" on messages
  for select using (auth.uid() = coach_id or auth.uid() = client_id or is_admin());

create policy "Admin voit toutes les ressources" on ressources
  for select using (is_admin());

create policy "Admin voit tous les programmes" on programmes
  for select using (is_admin());

create policy "Admin voit toutes les assignations" on programme_assignations
  for select using (is_admin());

-- ============================================================
-- DONE !
-- ============================================================
