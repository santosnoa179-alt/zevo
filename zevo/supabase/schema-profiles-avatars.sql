-- ============================================================
-- ZEVO — Profils enrichis + Avatars Storage
-- Colle ce fichier dans Supabase Studio > SQL Editor > New query
-- ============================================================

-- 1. Ajout des colonnes prenom et avatar_url sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS prenom text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Création du bucket "avatars" dans Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policies Storage — lecture publique, upload/update/delete par le propriétaire
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_public_read' AND tablename = 'objects') THEN
    CREATE POLICY avatars_public_read ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_owner_insert' AND tablename = 'objects') THEN
    CREATE POLICY avatars_owner_insert ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_owner_update' AND tablename = 'objects') THEN
    CREATE POLICY avatars_owner_update ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'avatars_owner_delete' AND tablename = 'objects') THEN
    CREATE POLICY avatars_owner_delete ON storage.objects
      FOR DELETE USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- 4. Policy pour que les clients puissent modifier leur propre profil (prenom, avatar_url)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update_own' AND tablename = 'profiles') THEN
    CREATE POLICY profiles_update_own ON profiles
      FOR UPDATE USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
