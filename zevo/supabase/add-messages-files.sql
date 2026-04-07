-- ═══════════════════════════════════════════════════════════════
-- Migration : Ajout support fichiers/images dans les messages
-- ═══════════════════════════════════════════════════════════════

-- Nouvelles colonnes sur la table messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_type text; -- 'image', 'pdf', 'document', etc.

-- Bucket storage pour les fichiers de messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'messages-fichiers',
  'messages-fichiers',
  true,
  10485760, -- 10 MB max
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
    'application/pdf',
    'video/mp4', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Politique storage : les utilisateurs authentifiés peuvent uploader
CREATE POLICY "messages_fichiers_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'messages-fichiers');

-- Politique storage : tout le monde peut lire (bucket public)
CREATE POLICY "messages_fichiers_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'messages-fichiers');

-- Politique storage : le propriétaire peut supprimer
CREATE POLICY "messages_fichiers_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'messages-fichiers' AND (storage.foldername(name))[1] = auth.uid()::text);
