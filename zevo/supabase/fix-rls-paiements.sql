-- ============================================================
-- FIX RLS — À exécuter si les pages Paiements donnent des 403
-- Ce script supprime puis recrée les policies proprement
-- ============================================================

-- Vérifier que les tables existent (ne rien faire si elles existent déjà)
-- Si tu as des erreurs "already exists", c'est normal, ignore-les.

-- ══════════════════════════════════════
-- 1. DÉSACTIVER puis RÉACTIVER RLS proprement
-- ══════════════════════════════════════

-- abonnements_clients
alter table if exists abonnements_clients enable row level security;
drop policy if exists "abo_select_coach" on abonnements_clients;
drop policy if exists "abo_insert_coach" on abonnements_clients;
drop policy if exists "abo_update_coach" on abonnements_clients;
drop policy if exists "abo_delete_coach" on abonnements_clients;
drop policy if exists "abo_select_client" on abonnements_clients;

create policy "abo_select_coach" on abonnements_clients for select using (auth.uid() = coach_id);
create policy "abo_insert_coach" on abonnements_clients for insert with check (auth.uid() = coach_id);
create policy "abo_update_coach" on abonnements_clients for update using (auth.uid() = coach_id);
create policy "abo_delete_coach" on abonnements_clients for delete using (auth.uid() = coach_id);
create policy "abo_select_client" on abonnements_clients for select using (auth.uid() = client_id);

-- factures
alter table if exists factures enable row level security;
drop policy if exists "factures_select_coach" on factures;
drop policy if exists "factures_insert_coach" on factures;
drop policy if exists "factures_update_coach" on factures;
drop policy if exists "factures_select_client" on factures;

create policy "factures_select_coach" on factures for select using (auth.uid() = coach_id);
create policy "factures_insert_coach" on factures for insert with check (auth.uid() = coach_id);
create policy "factures_update_coach" on factures for update using (auth.uid() = coach_id);
create policy "factures_select_client" on factures for select using (auth.uid() = client_id);

-- liens_paiement
alter table if exists liens_paiement enable row level security;
drop policy if exists "liens_select_coach" on liens_paiement;
drop policy if exists "liens_insert_coach" on liens_paiement;
drop policy if exists "liens_update_coach" on liens_paiement;
drop policy if exists "liens_delete_coach" on liens_paiement;

create policy "liens_select_coach" on liens_paiement for select using (auth.uid() = coach_id);
create policy "liens_insert_coach" on liens_paiement for insert with check (auth.uid() = coach_id);
create policy "liens_update_coach" on liens_paiement for update using (auth.uid() = coach_id);
create policy "liens_delete_coach" on liens_paiement for delete using (auth.uid() = coach_id);

-- codes_reduction
alter table if exists codes_reduction enable row level security;
drop policy if exists "codes_select_coach" on codes_reduction;
drop policy if exists "codes_insert_coach" on codes_reduction;
drop policy if exists "codes_update_coach" on codes_reduction;
drop policy if exists "codes_delete_coach" on codes_reduction;

create policy "codes_select_coach" on codes_reduction for select using (auth.uid() = coach_id);
create policy "codes_insert_coach" on codes_reduction for insert with check (auth.uid() = coach_id);
create policy "codes_update_coach" on codes_reduction for update using (auth.uid() = coach_id);
create policy "codes_delete_coach" on codes_reduction for delete using (auth.uid() = coach_id);

-- virements_coach
alter table if exists virements_coach enable row level security;
drop policy if exists "virements_select_coach" on virements_coach;
drop policy if exists "virements_insert_coach" on virements_coach;

create policy "virements_select_coach" on virements_coach for select using (auth.uid() = coach_id);
create policy "virements_insert_coach" on virements_coach for insert with check (auth.uid() = coach_id);

-- ══════════════════════════════════════
-- 2. VÉRIFICATION — Lance cette requête pour vérifier que tout est OK
-- ══════════════════════════════════════
-- SELECT tablename, policyname FROM pg_policies
-- WHERE tablename IN ('abonnements_clients','factures','liens_paiement','codes_reduction','virements_coach')
-- ORDER BY tablename;
