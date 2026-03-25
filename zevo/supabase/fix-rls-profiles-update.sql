-- ============================================================
-- ZEVO — Fix RLS : permettre au coach de modifier les profils clients
-- Exécuter dans Supabase Studio > SQL Editor > New query
-- ============================================================

-- 1. Supprimer les anciennes policies (au cas où elles existent mal)
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS profiles_update_coach ON profiles;

-- 2. Policy : un utilisateur peut modifier SON PROPRE profil
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Policy : un coach peut modifier les profils de SES CLIENTS
-- La table clients a : clients.id = profiles.id (FK), clients.coach_id = UUID du coach
CREATE POLICY profiles_update_coach ON profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = profiles.id
      AND clients.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = profiles.id
      AND clients.coach_id = auth.uid()
    )
  );

-- 4. Vérification : s'assurer que RLS est activé
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Grant
GRANT ALL ON profiles TO authenticated;
