-- ============================================
-- PHASE 1: Create sports table
-- ============================================
CREATE TABLE public.sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_fr TEXT,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;

-- RLS policies for sports
CREATE POLICY "Admins can view all sports"
  ON public.sports FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Public can view active sports"
  ON public.sports FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage sports"
  ON public.sports FOR ALL
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'));

-- Index for performance
CREATE INDEX idx_sports_slug ON public.sports(slug);
CREATE INDEX idx_sports_active ON public.sports(is_active);

-- Insert initial sports
INSERT INTO public.sports (name, name_fr, slug, icon, display_order) VALUES
  ('Football', 'Football', 'football', 'soccer', 1),
  ('Basketball', 'Basketball', 'basketball', 'basketball', 2),
  ('Tennis', 'Tennis', 'tennis', 'tennis', 3),
  ('Rugby', 'Rugby', 'rugby', 'rugby', 4),
  ('Hockey', 'Hockey', 'hockey', 'hockey', 5),
  ('Baseball', 'Baseball', 'baseball', 'baseball', 6);

-- Add sport_id to events table
ALTER TABLE public.events ADD COLUMN sport_id UUID REFERENCES public.sports(id);

-- Create index for sport_id
CREATE INDEX idx_events_sport_id ON public.events(sport_id);

-- ============================================
-- PHASE 3: Create event_categories junction table
-- ============================================
CREATE TABLE public.event_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, category_id)
);

-- Enable RLS
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_categories
CREATE POLICY "Admins can view event_categories"
  ON public.event_categories FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Editors+ can manage event_categories"
  ON public.event_categories FOR ALL
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));

-- Indexes for performance
CREATE INDEX idx_event_categories_event ON public.event_categories(event_id);
CREATE INDEX idx_event_categories_category ON public.event_categories(category_id);
CREATE INDEX idx_event_categories_pinned ON public.event_categories(is_pinned) WHERE is_pinned = true;

-- ============================================
-- PHASE 4 (Optional): Create events_published view
-- ============================================
CREATE VIEW public.events_published AS
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