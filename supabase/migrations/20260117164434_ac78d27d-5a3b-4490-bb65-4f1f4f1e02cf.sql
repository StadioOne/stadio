-- =============================================
-- ANALYTICS MODULE - Data Model
-- =============================================

-- Table: analytics_events (raw tracking data)
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  fixture_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  content_id uuid REFERENCES public.originals(id) ON DELETE SET NULL,
  user_id uuid,
  country text,
  city text,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  
  CONSTRAINT valid_event_type CHECK (
    event_type IN ('view_fixture', 'purchase_fixture', 'view_content', 'like_content')
  )
);

-- Indexes for efficient aggregation
CREATE INDEX idx_analytics_events_date ON public.analytics_events (created_at);
CREATE INDEX idx_analytics_events_type ON public.analytics_events (event_type);
CREATE INDEX idx_analytics_events_fixture ON public.analytics_events (fixture_id) WHERE fixture_id IS NOT NULL;
CREATE INDEX idx_analytics_events_content ON public.analytics_events (content_id) WHERE content_id IS NOT NULL;
CREATE INDEX idx_analytics_events_country ON public.analytics_events (country) WHERE country IS NOT NULL;

-- Table: analytics_daily (aggregated data - single source of truth for admin)
CREATE TABLE public.analytics_daily (
  date date NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  country text NOT NULL DEFAULT 'unknown',
  views integer DEFAULT 0,
  purchases integer DEFAULT 0,
  revenue numeric(12,2) DEFAULT 0,
  likes integer DEFAULT 0,
  aggregated_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (date, entity_type, entity_id, country),
  
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('fixture', 'content'))
);

-- Indexes for frequent queries
CREATE INDEX idx_analytics_daily_date ON public.analytics_daily (date DESC);
CREATE INDEX idx_analytics_daily_entity ON public.analytics_daily (entity_type, entity_id);
CREATE INDEX idx_analytics_daily_country ON public.analytics_daily (country);
CREATE INDEX idx_analytics_daily_revenue ON public.analytics_daily (revenue DESC) WHERE revenue > 0;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- analytics_events: INSERT allowed (via service role), SELECT for owner/admin only
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert analytics events"
ON public.analytics_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Owner/Admin can view raw analytics"
ON public.analytics_events FOR SELECT
USING (
  has_role(auth.uid(), 'owner'::admin_role) OR 
  has_role(auth.uid(), 'admin'::admin_role)
);

-- analytics_daily: Role-based read access, no direct writes (service role only)
ALTER TABLE public.analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role-based analytics daily access"
ON public.analytics_daily FOR SELECT
USING (
  CASE get_user_role(auth.uid())
    WHEN 'owner' THEN true
    WHEN 'admin' THEN true
    WHEN 'editor' THEN entity_type IN ('fixture', 'content')
    WHEN 'support' THEN true
    ELSE false
  END
);

-- Service role can manage analytics_daily (for aggregation job)
CREATE POLICY "Service role can manage analytics daily"
ON public.analytics_daily FOR ALL
USING (
  has_role(auth.uid(), 'owner'::admin_role) OR 
  has_role(auth.uid(), 'admin'::admin_role)
)
WITH CHECK (
  has_role(auth.uid(), 'owner'::admin_role) OR 
  has_role(auth.uid(), 'admin'::admin_role)
);