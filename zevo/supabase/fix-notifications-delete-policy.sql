-- ============================================================
-- Ajouter une policy DELETE sur la table notifications
-- pour permettre aux coaches de supprimer leurs notifications
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Supprimer si existe déjà
drop policy if exists "notifications_delete_own" on notifications;

-- Le coach peut supprimer ses propres notifications
create policy "notifications_delete_own" on notifications
  for delete using (
    auth.uid() = coach_id
    or is_admin()
  );
