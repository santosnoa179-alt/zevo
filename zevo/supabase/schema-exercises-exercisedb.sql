-- Table exercises — catalogue ExerciseDB (RapidAPI)
-- Remplie une seule fois via /api/sync-exercises, puis lue depuis Supabase uniquement.

create table if not exists exercises (
  id text primary key,                          -- ExerciseDB ID (ex: "0001")
  name text not null,
  target_muscle text not null,                  -- ex: "pectorals", "biceps"
  equipment text not null default 'body weight', -- ex: "barbell", "dumbbell"
  gif_url text,                                 -- URL du GIF animé
  body_part text not null,                      -- ex: "chest", "upper arms"
  secondary_muscles text[] default '{}',        -- ex: {"triceps","anterior deltoids"}
  instructions text[] default '{}',             -- étapes de l'exercice
  created_at timestamptz default now()
);

-- Index pour les filtres courants
create index if not exists idx_exercises_body_part on exercises (body_part);
create index if not exists idx_exercises_target on exercises (target_muscle);
create index if not exists idx_exercises_equipment on exercises (equipment);
create index if not exists idx_exercises_name on exercises using gin (name gin_trgm_ops);

-- RLS : lecture publique (tous les utilisateurs authentifiés)
alter table exercises enable row level security;

drop policy if exists "exercises_select_all" on exercises;
create policy "exercises_select_all" on exercises
  for select using (true);

-- Seul le service role peut insérer/updater (via l'API serverless)
drop policy if exists "exercises_insert_service" on exercises;
create policy "exercises_insert_service" on exercises
  for insert with check (false);

drop policy if exists "exercises_update_service" on exercises;
create policy "exercises_update_service" on exercises
  for update using (false);
