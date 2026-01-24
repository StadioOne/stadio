-- Fix security definer view warning
-- Drop and recreate view with SECURITY INVOKER
DROP VIEW IF EXISTS public.events_published;

CREATE VIEW public.events_published 
WITH (security_invoker = true)
AS
SELECT 
  e.*,
  ep.computed_price,
  ep.computed_tier,
  ep.manual_price,
  ep.manual_tier,
  ep.is_manual_override,
  s.name as sport_name,
  s.slug as sport_slug,
  s.icon as sport_icon
FROM public.events e
LEFT JOIN public.event_pricing ep ON e.id = ep.event_id
LEFT JOIN public.sports s ON e.sport_id = s.id
WHERE e.status = 'published';