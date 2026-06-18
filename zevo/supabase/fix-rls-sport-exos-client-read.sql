-- Session 16 juin 2026 — Fix "pas de nom ni de GIF dans le tracker client".
-- Le tracker (WorkoutTrackerPage) résout le nom/gif d'un exercice Pro déployé
-- via le join sport_seance_exercices (FK seance_exercices.sport_seance_exercice_id)
-- puis exercises (ExerciseDB). Or la policy SELECT existante sur
-- sport_seance_exercices n'autorise le client que si le PROGRAMME lui appartient,
-- alors que sport_seance_exercice_id pointe vers les exos du programme TEMPLATE
-- (client_id NULL) → join NULL → ni nom ni gif.
--
-- Cette policy additionnelle autorise un client à lire un exo source dès qu'il
-- est référencé par une de SES propres séances (lien seance_exercices -> seances).
-- Sûr : un client ne peut lire que les exos liés à ses séances.

DROP POLICY IF EXISTS "clients_read_sport_exos_via_seances" ON public.sport_seance_exercices;
CREATE POLICY "clients_read_sport_exos_via_seances"
ON public.sport_seance_exercices FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.seance_exercices se
  JOIN public.seances s ON s.id = se.seance_id
  WHERE se.sport_seance_exercice_id = sport_seance_exercices.id
    AND s.client_id = auth.uid()
));
