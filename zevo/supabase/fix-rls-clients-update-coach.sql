-- Fix : permettre au coach de modifier ses propres clients (notamment clients.actif)
-- La policy existante "clients_update_own" ne permet qu'au client de se modifier lui-même.
-- Le coach a besoin de modifier .actif quand il change le statut d'un abonnement.

-- Ajouter une policy UPDATE pour le coach
create policy "clients_update_coach" on clients
  for update using (auth.uid() = coach_id);
