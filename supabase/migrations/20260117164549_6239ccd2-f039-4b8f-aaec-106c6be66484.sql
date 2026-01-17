-- Fix: Replace overly permissive INSERT policy with service-role based check
-- The INSERT on analytics_events should only be allowed via Edge Functions (service role)
-- Regular users cannot insert directly

DROP POLICY IF EXISTS "System can insert analytics events" ON public.analytics_events;

-- Only admins can insert analytics events (in practice, Edge Functions will use service role)
CREATE POLICY "Admins can insert analytics events"
ON public.analytics_events FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'owner'::admin_role) OR 
  has_role(auth.uid(), 'admin'::admin_role)
);