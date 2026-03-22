-- ============================================
-- ZEVO — Drive : Gestionnaire de fichiers coach
-- ============================================
-- Colle dans Supabase Studio > SQL Editor > New query
-- ============================================

-- ============================================
-- 1. TABLE drive_folders
-- ============================================
CREATE TABLE IF NOT EXISTS drive_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES drive_folders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. TABLE drive_files
-- ============================================
CREATE TABLE IF NOT EXISTS drive_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  url text NOT NULL,
  size bigint,
  type text CHECK (type IN ('pdf', 'image', 'video', 'document', 'other')),
  folder_id uuid REFERENCES drive_folders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 3. INDEX
-- ============================================
CREATE INDEX IF NOT EXISTS idx_drive_folders_coach_id ON drive_folders(coach_id);
CREATE INDEX IF NOT EXISTS idx_drive_folders_parent_id ON drive_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_coach_id ON drive_files(coach_id);
CREATE INDEX IF NOT EXISTS idx_drive_files_folder_id ON drive_files(folder_id);

-- ============================================
-- 4. RLS
-- ============================================
ALTER TABLE drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_files ENABLE ROW LEVEL SECURITY;

-- Policies drive_folders : coach CRUD
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coach peut voir ses dossiers') THEN
    CREATE POLICY "Coach peut voir ses dossiers" ON drive_folders FOR SELECT USING (auth.uid() = coach_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coach peut creer des dossiers') THEN
    CREATE POLICY "Coach peut creer des dossiers" ON drive_folders FOR INSERT WITH CHECK (auth.uid() = coach_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coach peut modifier ses dossiers') THEN
    CREATE POLICY "Coach peut modifier ses dossiers" ON drive_folders FOR UPDATE USING (auth.uid() = coach_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coach peut supprimer ses dossiers') THEN
    CREATE POLICY "Coach peut supprimer ses dossiers" ON drive_folders FOR DELETE USING (auth.uid() = coach_id);
  END IF;
END $$;

-- Policies drive_files : coach CRUD
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coach peut voir ses fichiers') THEN
    CREATE POLICY "Coach peut voir ses fichiers" ON drive_files FOR SELECT USING (auth.uid() = coach_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coach peut ajouter des fichiers') THEN
    CREATE POLICY "Coach peut ajouter des fichiers" ON drive_files FOR INSERT WITH CHECK (auth.uid() = coach_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coach peut modifier ses fichiers') THEN
    CREATE POLICY "Coach peut modifier ses fichiers" ON drive_files FOR UPDATE USING (auth.uid() = coach_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coach peut supprimer ses fichiers') THEN
    CREATE POLICY "Coach peut supprimer ses fichiers" ON drive_files FOR DELETE USING (auth.uid() = coach_id);
  END IF;
END $$;

-- Policies drive_files : client SELECT (fichiers partages)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Client peut voir ses fichiers partages') THEN
    CREATE POLICY "Client peut voir ses fichiers partages" ON drive_files FOR SELECT USING (auth.uid() = client_id);
  END IF;
END $$;

-- ============================================
-- 5. GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON drive_folders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON drive_files TO authenticated;

-- ============================================
-- 6. STORAGE POLICIES (bucket "drive")
-- ============================================
-- IMPORTANT : Le bucket Storage "drive" doit etre cree manuellement
-- dans Supabase Dashboard > Storage > New bucket
-- Nom : drive
-- Public : false (prive)
-- ============================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coach peut lire ses fichiers drive') THEN
    CREATE POLICY "Coach peut lire ses fichiers drive" ON storage.objects FOR SELECT USING (
      bucket_id = 'drive' AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coach peut uploader dans drive') THEN
    CREATE POLICY "Coach peut uploader dans drive" ON storage.objects FOR INSERT WITH CHECK (
      bucket_id = 'drive' AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coach peut supprimer ses fichiers drive') THEN
    CREATE POLICY "Coach peut supprimer ses fichiers drive" ON storage.objects FOR DELETE USING (
      bucket_id = 'drive' AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;
