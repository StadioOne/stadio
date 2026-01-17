-- =====================================================
-- AUDIT LOG SCHEMA MIGRATION
-- Aligns with production-grade audit system specification
-- =====================================================

-- Step 1: Add new columns (actor_role, metadata)
ALTER TABLE public.audit_log 
  ADD COLUMN IF NOT EXISTS actor_role text NOT NULL DEFAULT 'unknown';

ALTER TABLE public.audit_log 
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Step 2: Rename columns for spec compliance
-- user_id -> actor_user_id (if not already named)
-- entity_type -> entity (if not already named)
-- Note: These might already exist with the new names based on context
-- Using DO block for safe conditional renames

DO $$ 
BEGIN
  -- Check if user_id column exists and rename to actor_user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'actor_user_id'
  ) THEN
    ALTER TABLE public.audit_log RENAME COLUMN user_id TO actor_user_id;
  END IF;

  -- Check if user_email column exists and rename to actor_email
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'user_email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'actor_email'
  ) THEN
    ALTER TABLE public.audit_log RENAME COLUMN user_email TO actor_email;
  END IF;

  -- Check if entity_type column exists and rename to entity
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'entity_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'entity'
  ) THEN
    ALTER TABLE public.audit_log RENAME COLUMN entity_type TO entity;
  END IF;
END $$;

-- Step 3: Update RLS policies for role-based access
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
DROP POLICY IF EXISTS "System can insert audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Role-based audit log access" ON public.audit_log;

-- Create new SELECT policy with role-based filtering
-- owner/admin: full access
-- editor: limited to events, originals, categories
-- support: read-only all
CREATE POLICY "Role-based audit log access" ON public.audit_log
FOR SELECT TO authenticated
USING (
  CASE public.get_user_role(auth.uid())
    WHEN 'owner' THEN true
    WHEN 'admin' THEN true
    WHEN 'editor' THEN entity IN ('events', 'originals', 'categories')
    WHEN 'support' THEN true
    ELSE false
  END
);

-- No INSERT policy needed - service role bypasses RLS
-- This ensures only Edge Functions can write to audit_log

-- Step 4: Add index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_user_id);