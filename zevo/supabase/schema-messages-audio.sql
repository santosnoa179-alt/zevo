-- ══════════════════════════════════════
-- AJOUT : Notes vocales dans la messagerie
-- ══════════════════════════════════════

-- 1. Colonne audio_url sur messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_duration REAL; -- durée en secondes

-- 2. Bucket Storage pour les vocaux
INSERT INTO storage.buckets (id, name, public)
VALUES ('messages_vocaux', 'messages_vocaux', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policy : les coaches et clients peuvent uploader leurs vocaux
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vocaux_insert_policy') THEN
  CREATE POLICY vocaux_insert_policy ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'messages_vocaux' AND auth.uid() IS NOT NULL);
END IF;
END $$;

-- 4. Policy : lecture publique des vocaux (le bucket est public)
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'vocaux_select_policy') THEN
  CREATE POLICY vocaux_select_policy ON storage.objects
    FOR SELECT USING (bucket_id = 'messages_vocaux');
END IF;
END $$;
