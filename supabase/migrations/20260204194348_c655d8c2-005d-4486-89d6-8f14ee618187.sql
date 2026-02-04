-- Add unique constraint on event_id in event_pricing table
-- This is required for the upsert operation to work correctly
ALTER TABLE public.event_pricing 
ADD CONSTRAINT event_pricing_event_id_unique UNIQUE (event_id);