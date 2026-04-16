-- ============================================================
-- ZEVO — Fix RLS : le client doit pouvoir lire les exercices
-- liés à SES séances (sinon le join exercices(...) renvoie null
-- côté WorkoutTrackerPage → l'app affiche "Exercice" + pas de GIF)
-- ============================================================
--
-- Problème :
-- La policy `exercices_select_own` autorise uniquement :
--   coach_id IS NULL (catalogue Zevo Standard)
--   OU auth.uid() = coach_id (le coach lui-même)
--
-- Mais quand un coach ajoute un exo de la library à une séance
-- via SessionEditorModal, on bridge l'exo dans `exercices` avec
-- coach_id = user?.id (le coach). Le client, lui, a un auth.uid()
-- qui ne correspond ni à NULL ni à coach_id.
--
-- Conséquence : le join `seance_exercices.select('..., exercices(nom, gif_url, ...)')`
-- renvoie `exercices: null` pour le client → nom/gif non affichés.
--
-- Solution : ajouter une policy qui laisse un client lire un exercice
-- si cet exercice apparaît dans une de SES seance_exercices.
-- ============================================================

-- Supprimer d'abord l'ancienne policy si elle existe (idempotent)
DROP POLICY IF EXISTS exercices_select_client ON exercices;

-- Le client peut lire un exercice s'il existe un lien via seance_exercices
-- vers une seance dont il est le client.
CREATE POLICY exercices_select_client ON exercices FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM seance_exercices se
      JOIN seances s ON s.id = se.seance_id
      WHERE se.exercice_id = exercices.id
        AND s.client_id = auth.uid()
    )
  );

-- Index pour accélérer la condition EXISTS (peut déjà exister)
CREATE INDEX IF NOT EXISTS idx_seance_exercices_exercice_id ON seance_exercices(exercice_id);

COMMENT ON POLICY exercices_select_client ON exercices IS
'Permet au client de lire uniquement les exercices présents dans ses propres séances (requis pour WorkoutTrackerPage : afficher nom, gif_url, muscle_group).';
