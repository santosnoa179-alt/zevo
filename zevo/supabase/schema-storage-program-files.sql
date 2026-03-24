-- ============================================================
-- ZEVO — Storage bucket 'program-files' + RLS policies
-- Exécute dans Supabase Studio > SQL Editor
-- ============================================================

-- 1. Créer le bucket (si pas déjà fait manuellement)
INSERT INTO storage.buckets (id, name, public)
VALUES ('program-files', 'program-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies pour les coachs (upload, read, delete)
DO $$ BEGIN

-- SELECT : Tout le monde peut lire (bucket public)
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'program_files_select_public') THEN
  CREATE POLICY program_files_select_public ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'program-files');
END IF;

-- INSERT : Les coachs peuvent uploader dans coach_uploads/
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'program_files_insert_coach') THEN
  CREATE POLICY program_files_insert_coach ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'program-files');
END IF;

-- DELETE : Les coachs peuvent supprimer leurs propres fichiers
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'program_files_delete_coach') THEN
  CREATE POLICY program_files_delete_coach ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'program-files');
END IF;

-- UPDATE : Pour les remplacements
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'program_files_update_coach') THEN
  CREATE POLICY program_files_update_coach ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'program-files');
END IF;

END $$;
