-- ============================================================
-- ÉTAPE 3 SEULE : Recréer toutes les policies avec is_admin()
-- (Les drops ont déjà été exécutés)
-- ============================================================

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
-- DONE ! Toutes les policies sont recréées avec is_admin()
-- ============================================================
