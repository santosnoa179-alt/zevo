-- ============================================================
-- FIX GRANTS — Table admins
-- Le RLS est bien désactivé mais le rôle "authenticated"
-- n'a pas le GRANT SELECT sur la table.
-- ============================================================

-- Accorder les permissions de lecture à authenticated
grant select on admins to authenticated;
grant select on admins to anon;

-- S'assurer que le RLS est bien désactivé
alter table admins disable row level security;

-- Recréer la fonction is_admin() pour être sûr
drop function if exists is_admin() cascade;

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from admins where id = auth.uid()
  );
$$ language sql security definer stable;

-- ============================================================
-- DONE
-- ============================================================
