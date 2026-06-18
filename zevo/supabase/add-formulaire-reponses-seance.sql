-- Session 16 juin 2026 — Feature "formulaires post-séance liés à la séance".
-- Les formulaires récurrents (recurrence.intervalle = 'post_seance') génèrent un
-- questionnaire PAR séance terminée (WorkoutTrackerPage). On rattache chaque
-- réponse à la séance concernée pour que le coach voie, dans la liste des
-- réponses (CoachFormulairesPage), après quelle séance le formulaire a été rempli
-- (badge "Séance : <titre> — <date>").
--
-- ON DELETE SET NULL : si la séance est supprimée, on garde la réponse du client
-- (qui a de la valeur en soi), on perd juste l'étiquette de séance.

ALTER TABLE formulaire_reponses
  ADD COLUMN IF NOT EXISTS seance_id uuid REFERENCES seances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_formulaire_reponses_seance ON formulaire_reponses(seance_id);

COMMENT ON COLUMN formulaire_reponses.seance_id IS 'Séance à laquelle se rattache la réponse (formulaires post-séance). NULL pour les formulaires non liés à une séance ou les réponses antérieures à cette feature.';
