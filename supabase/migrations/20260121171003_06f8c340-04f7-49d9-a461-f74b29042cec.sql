-- Add new columns to analytics_events table
ALTER TABLE analytics_events 
  ADD COLUMN IF NOT EXISTS received_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS anon_id text,
  ADD COLUMN IF NOT EXISTS ip inet,
  ADD COLUMN IF NOT EXISTS user_agent_full text;

-- Create index for occurred_at (retention cleanup)
CREATE INDEX IF NOT EXISTS idx_ae_occurred_at ON analytics_events (occurred_at DESC);

-- Create rate_limits table for anti-abuse protection
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_start);

-- Enable RLS on rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for rate_limits - only service role can access (no client access)
-- No SELECT/INSERT/UPDATE/DELETE policies for authenticated users = blocked

-- Drop existing analytics_events policies and create stricter ones
DROP POLICY IF EXISTS "Admins can insert analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Owner/Admin can view raw analytics" ON analytics_events;

-- Only allow service role to manage analytics_events (via Edge Functions)
-- No policies = no client access, only service_role can insert/read