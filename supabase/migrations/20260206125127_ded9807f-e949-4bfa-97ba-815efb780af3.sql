ALTER TABLE public.events ADD COLUMN thumbnail_url TEXT;

COMMENT ON COLUMN public.events.thumbnail_url IS 'URL de la vignette matchday (logos equipes, format paysage 16:9)';