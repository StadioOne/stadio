-- Phase 2: Database Migration

-- 2.1 Add published_at column to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- 2.2 Create pricing configuration table for min/max constraints
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier pricing_tier NOT NULL UNIQUE,
  min_price numeric NOT NULL DEFAULT 4.99,
  max_price numeric NOT NULL DEFAULT 49.99,
  base_price numeric NOT NULL DEFAULT 9.99,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default pricing configurations for each tier
INSERT INTO public.pricing_config (tier, min_price, max_price, base_price) VALUES
  ('bronze', 4.99, 14.99, 9.99),
  ('silver', 9.99, 24.99, 14.99),
  ('gold', 14.99, 49.99, 24.99)
ON CONFLICT (tier) DO NOTHING;

-- Enable RLS on pricing_config
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Admins can view pricing config
CREATE POLICY "Admins can view pricing config"
ON public.pricing_config FOR SELECT
USING (is_admin(auth.uid()));

-- Owners can manage pricing config
CREATE POLICY "Owners can manage pricing config"
ON public.pricing_config FOR ALL
USING (has_role(auth.uid(), 'owner'))
WITH CHECK (has_role(auth.uid(), 'owner'));

-- 2.3 Create function to remove event from all pinned categories
CREATE OR REPLACE FUNCTION public.remove_event_from_pinned(_event_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.categories
  SET pinned_event_ids = array_remove(pinned_event_ids, _event_id),
      updated_at = now()
  WHERE _event_id = ANY(pinned_event_ids);
$$;