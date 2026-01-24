-- Extend sports table for multi-API support
ALTER TABLE public.sports ADD COLUMN IF NOT EXISTS api_provider TEXT DEFAULT 'api-sports';
ALTER TABLE public.sports ADD COLUMN IF NOT EXISTS api_base_url TEXT;
ALTER TABLE public.sports ADD COLUMN IF NOT EXISTS api_config JSONB DEFAULT '{}';
ALTER TABLE public.sports ADD COLUMN IF NOT EXISTS is_configured BOOLEAN DEFAULT false;

-- Add sport_id to leagues table
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES public.sports(id);

-- Insert/update sports with API-Sports configuration
INSERT INTO public.sports (name, name_fr, slug, icon, api_provider, api_base_url, is_configured, display_order, is_active)
VALUES 
  ('Football', 'Football', 'football', '⚽', 'api-sports', 'https://v3.football.api-sports.io', true, 1, true),
  ('Basketball', 'Basketball', 'basketball', '🏀', 'api-sports', 'https://v1.basketball.api-sports.io', false, 2, true),
  ('Rugby', 'Rugby', 'rugby', '🏉', 'api-sports', 'https://v1.rugby.api-sports.io', false, 3, true),
  ('Hockey', 'Hockey', 'hockey', '🏒', 'api-sports', 'https://v1.hockey.api-sports.io', false, 4, true),
  ('Baseball', 'Baseball', 'baseball', '⚾', 'api-sports', 'https://v1.baseball.api-sports.io', false, 5, true),
  ('American Football', 'Football Américain', 'american-football', '🏈', 'api-sports', 'https://v1.american-football.api-sports.io', false, 6, true),
  ('Formula 1', 'Formule 1', 'formula-1', '🏎️', 'api-sports', 'https://v1.formula-1.api-sports.io', false, 7, true),
  ('Handball', 'Handball', 'handball', '🤾', 'api-sports', 'https://v1.handball.api-sports.io', false, 8, true),
  ('Volleyball', 'Volleyball', 'volleyball', '🏐', 'api-sports', 'https://v1.volleyball.api-sports.io', false, 9, true),
  ('MMA', 'MMA', 'mma', '🥊', 'api-sports', 'https://v1.mma.api-sports.io', false, 10, true)
ON CONFLICT (slug) DO UPDATE SET
  api_provider = EXCLUDED.api_provider,
  api_base_url = EXCLUDED.api_base_url,
  icon = EXCLUDED.icon,
  name_fr = EXCLUDED.name_fr,
  display_order = EXCLUDED.display_order;

-- Link existing leagues to Football sport
UPDATE public.leagues 
SET sport_id = (SELECT id FROM public.sports WHERE slug = 'football' LIMIT 1)
WHERE sport_id IS NULL;