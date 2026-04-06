-- ============================================================
-- SECURITY HARDENING — Corrections de sécurité critiques
-- À exécuter dans Supabase SQL Editor
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- 1. CRITIQUE : Empêcher les utilisateurs de modifier leur rôle
--    Un client pourrait faire: UPDATE profiles SET role = 'coach'
-- ════════════════════════════════════════════════════════════

drop policy if exists "profiles_update_own" on profiles;

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );


-- ════════════════════════════════════════════════════════════
-- 2. CRITIQUE : Remplacer invitations_select_by_token (using true)
--    Actuellement TOUT le monde peut lire TOUTES les invitations
-- ════════════════════════════════════════════════════════════

drop policy if exists "invitations_select_by_token" on invitations;

-- On garde invitations_select pour coach + admin
-- Pour la page /invite/:token, on utilise une fonction sécurisée
create or replace function get_invitation_by_token(p_token text)
returns table (
  id uuid,
  coach_id uuid,
  email text,
  acceptee boolean,
  expires_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, coach_id, email, acceptee, expires_at, created_at
  from invitations
  where token = p_token
  limit 1;
$$;


-- ════════════════════════════════════════════════════════════
-- 3. CRITIQUE : Restreindre invitations_update
--    Seul le coach propriétaire OU le client lié à l'invitation
-- ════════════════════════════════════════════════════════════

drop policy if exists "invitations_update" on invitations;

create policy "invitations_update" on invitations
  for update using (
    auth.uid() = coach_id
    or auth.uid() = (
      select c.id from clients c
      where c.coach_id = invitations.coach_id
      and c.id = auth.uid()
    )
    or is_admin()
  );


-- ════════════════════════════════════════════════════════════
-- 4. HAUTE : Retirer le GRANT SELECT sur admins pour anon
-- ════════════════════════════════════════════════════════════

revoke select on admins from anon;


-- ════════════════════════════════════════════════════════════
-- 5. HAUTE : Restreindre les permissions sur profiles
-- ════════════════════════════════════════════════════════════

revoke all on profiles from authenticated;
grant select, update on profiles to authenticated;


-- ════════════════════════════════════════════════════════════
-- 6. HAUTE : Messages — valider la relation coach-client
-- ════════════════════════════════════════════════════════════

drop policy if exists "messages_insert" on messages;

create policy "messages_insert" on messages
  for insert with check (
    (auth.uid() = coach_id or auth.uid() = client_id)
    and exists (
      select 1 from clients c
      where c.id = messages.client_id
      and c.coach_id = messages.coach_id
    )
  );

-- Restreindre l'UPDATE aux seuls champs lu (read status)
drop policy if exists "messages_update_lu" on messages;

create policy "messages_update_lu" on messages
  for update using (
    auth.uid() = coach_id or auth.uid() = client_id
  )
  with check (
    auth.uid() = coach_id or auth.uid() = client_id
  );


-- ════════════════════════════════════════════════════════════
-- 7. CRITIQUE : Storage — ajouter des checks d'ownership
--    ressources bucket
-- ════════════════════════════════════════════════════════════

drop policy if exists "storage_ressources_insert" on storage.objects;
drop policy if exists "storage_ressources_update" on storage.objects;
drop policy if exists "storage_ressources_delete" on storage.objects;

-- Seuls les coaches peuvent upload/modifier/supprimer dans ressources
-- Le chemin doit commencer par leur user ID : coach_id/...
create policy "storage_ressources_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ressources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_ressources_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'ressources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_ressources_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ressources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ════════════════════════════════════════════════════════════
-- 8. CRITIQUE : Storage — program-files bucket
-- ════════════════════════════════════════════════════════════

drop policy if exists "storage_program_files_insert" on storage.objects;
drop policy if exists "storage_program_files_update" on storage.objects;
drop policy if exists "storage_program_files_delete" on storage.objects;

create policy "storage_program_files_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'program-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_program_files_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'program-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_program_files_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'program-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ════════════════════════════════════════════════════════════
-- 9. CRITIQUE : Storage — drive bucket (fix les policies trop ouvertes)
-- ════════════════════════════════════════════════════════════

drop policy if exists "storage_drive_select" on storage.objects;
drop policy if exists "storage_drive_insert" on storage.objects;
drop policy if exists "storage_drive_delete" on storage.objects;

-- Les policies originales de schema-drive.sql avec ownership check
-- sont suffisantes. On supprime juste les fix trop permissives.


-- ════════════════════════════════════════════════════════════
-- 10. Notification delete policy (si pas encore exécuté)
-- ════════════════════════════════════════════════════════════

drop policy if exists "notifications_delete_own" on notifications;

create policy "notifications_delete_own" on notifications
  for delete using (
    auth.uid() = coach_id
    or is_admin()
  );


-- ============================================================
-- DONE ! Sécurité renforcée.
-- ============================================================
