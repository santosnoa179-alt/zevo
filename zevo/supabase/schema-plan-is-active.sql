-- Add is_active column to client_nutrition_plans
ALTER TABLE client_nutrition_plans ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

-- Index for fast lookup of active plan per client
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_active ON client_nutrition_plans(client_id, is_active) WHERE is_active = true;
