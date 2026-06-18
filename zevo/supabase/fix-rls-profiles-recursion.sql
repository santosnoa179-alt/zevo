-- Session 16 juin 2026 — Fix "récursion infinie 42P17 sur profiles" (IMPACT LARGE).
-- La policy UPDATE profiles_update_own avait un WITH CHECK qui faisait
--   role = (SELECT role FROM profiles WHERE id = auth.uid())
-- pour empêcher un user de changer son propre role. Ce SELECT sur profiles
-- DANS une policy de profiles provoquait une récursion infinie → TOUT UPDATE de
-- profiles par un user authenticated plantait en 500 (pas juste tutorial_seen :
-- aussi modif profil client/coach, poids, objectifs...).
--
-- Fix : on supprime la policy récursive (la policy profiles_self_update, qui
-- autorise auth.uid() = id, suffit pour que le user mette à jour son profil) et
-- on déplace la protection du role dans un trigger BEFORE UPDATE non-récursif :
-- un user authenticated ne peut pas changer son propre role ; service_role et
-- accès SQL direct restent autorisés.

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE OR REPLACE FUNCTION public.lock_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(current_setting('request.jwt.claims', true)::json->>'role', '') = 'authenticated' THEN
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_lock_profile_role ON public.profiles;
CREATE TRIGGER trg_lock_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_profile_role();
