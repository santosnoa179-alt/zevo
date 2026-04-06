-- ══════════════════════════════════════════════════════════
-- SYSTÈME DE RÉSERVATION — Tables et RLS
-- À exécuter dans Supabase SQL Editor
-- ══════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════
-- 1. COACH_DISPONIBILITES — Créneaux récurrents
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS coach_disponibilites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 0 = Lundi, 1 = Mardi, ..., 6 = Dimanche
  jour_semaine smallint NOT NULL CHECK (jour_semaine BETWEEN 0 AND 6),

  heure_debut time NOT NULL,
  heure_fin time NOT NULL,

  -- Durée d'un créneau en minutes
  duree_creneau smallint NOT NULL DEFAULT 60
    CHECK (duree_creneau IN (30, 45, 60, 90)),

  est_actif boolean NOT NULL DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT heure_fin_apres_debut CHECK (heure_fin > heure_debut)
);

CREATE INDEX IF NOT EXISTS idx_dispo_coach ON coach_disponibilites(coach_id);
CREATE INDEX IF NOT EXISTS idx_dispo_jour ON coach_disponibilites(coach_id, jour_semaine);

ALTER TABLE coach_disponibilites ENABLE ROW LEVEL SECURITY;

-- Coach CRUD
CREATE POLICY dispo_select_coach ON coach_disponibilites
  FOR SELECT USING (auth.uid() = coach_id);
CREATE POLICY dispo_insert_coach ON coach_disponibilites
  FOR INSERT WITH CHECK (auth.uid() = coach_id);
CREATE POLICY dispo_update_coach ON coach_disponibilites
  FOR UPDATE USING (auth.uid() = coach_id);
CREATE POLICY dispo_delete_coach ON coach_disponibilites
  FOR DELETE USING (auth.uid() = coach_id);

-- Les clients actifs du coach peuvent lire les disponibilités
CREATE POLICY dispo_select_client ON coach_disponibilites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = auth.uid()
        AND clients.coach_id = coach_disponibilites.coach_id
        AND clients.actif = true
    )
  );

GRANT ALL ON coach_disponibilites TO authenticated;


-- ══════════════════════════════════════════════
-- 2. RESERVATIONS — Rendez-vous clients
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reservations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  date_debut timestamptz NOT NULL,
  date_fin timestamptz NOT NULL,

  statut text NOT NULL DEFAULT 'confirmee'
    CHECK (statut IN ('confirmee', 'annulee_client', 'annulee_coach')),

  notes_client text,
  notes_coach text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT fin_apres_debut CHECK (date_fin > date_debut)
);

CREATE INDEX IF NOT EXISTS idx_reserv_coach ON reservations(coach_id);
CREATE INDEX IF NOT EXISTS idx_reserv_client ON reservations(client_id);
CREATE INDEX IF NOT EXISTS idx_reserv_date ON reservations(date_debut);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Coach voit et modifie ses réservations
CREATE POLICY reserv_select_coach ON reservations
  FOR SELECT USING (auth.uid() = coach_id);
CREATE POLICY reserv_update_coach ON reservations
  FOR UPDATE USING (auth.uid() = coach_id);

-- Client voit ses réservations
CREATE POLICY reserv_select_client ON reservations
  FOR SELECT USING (auth.uid() = client_id);

-- Client peut réserver (seulement chez son coach actif)
CREATE POLICY reserv_insert_client ON reservations
  FOR INSERT WITH CHECK (
    auth.uid() = client_id
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = auth.uid()
        AND clients.coach_id = reservations.coach_id
        AND clients.actif = true
    )
  );

-- Client peut modifier (annuler) ses propres réservations
CREATE POLICY reserv_update_client ON reservations
  FOR UPDATE USING (auth.uid() = client_id);

GRANT ALL ON reservations TO authenticated;


-- ══════════════════════════════════════════════
-- DONE
-- ══════════════════════════════════════════════
