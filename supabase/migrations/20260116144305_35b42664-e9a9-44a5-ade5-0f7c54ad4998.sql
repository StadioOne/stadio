-- =============================================
-- STADIO ADMIN - COMPLETE DATABASE SCHEMA
-- =============================================

-- 1. Create ENUMs
-- =============================================

-- Admin roles enum
CREATE TYPE public.admin_role AS ENUM ('owner', 'admin', 'editor', 'support');

-- Content status enum
CREATE TYPE public.content_status AS ENUM ('draft', 'published', 'archived');

-- Original content type enum
CREATE TYPE public.original_type AS ENUM ('article', 'podcast', 'emission');

-- Pricing tier enum
CREATE TYPE public.pricing_tier AS ENUM ('gold', 'silver', 'bronze');

-- Workflow status enum
CREATE TYPE public.workflow_status AS ENUM ('pending', 'running', 'success', 'failed');

-- =============================================
-- 2. Create Tables
-- =============================================

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role admin_role NOT NULL DEFAULT 'support',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Profiles table for admin users
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    preferred_language TEXT DEFAULT 'fr',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events table (sports events)
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE,
    sport TEXT NOT NULL,
    league TEXT,
    home_team TEXT,
    away_team TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    -- API data (read-only from external source)
    api_title TEXT,
    api_description TEXT,
    api_image_url TEXT,
    -- Editorial overrides
    override_title TEXT,
    override_description TEXT,
    override_image_url TEXT,
    -- Status and settings
    status content_status NOT NULL DEFAULT 'draft',
    is_pinned BOOLEAN DEFAULT false,
    is_live BOOLEAN DEFAULT false,
    -- Geo restrictions
    allowed_countries TEXT[] DEFAULT ARRAY[]::TEXT[],
    blocked_countries TEXT[] DEFAULT ARRAY[]::TEXT[],
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Event pricing table
CREATE TABLE public.event_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    -- Computed price (from algorithm)
    computed_price DECIMAL(10,2),
    computed_tier pricing_tier,
    computation_date TIMESTAMPTZ,
    -- Manual override
    manual_price DECIMAL(10,2),
    manual_tier pricing_tier,
    is_manual_override BOOLEAN DEFAULT false,
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Event pricing history
CREATE TABLE public.event_pricing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_pricing_id UUID NOT NULL REFERENCES public.event_pricing(id) ON DELETE CASCADE,
    previous_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    previous_tier pricing_tier,
    new_tier pricing_tier,
    change_type TEXT, -- 'computed', 'manual_override', 'revert'
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories table (editorial sections)
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_fr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description_fr TEXT,
    description_en TEXT,
    -- Display settings
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    -- Auto rules (JSON for flexibility)
    auto_rules JSONB DEFAULT '{}'::jsonb,
    -- Pinned events (manual)
    pinned_event_ids UUID[] DEFAULT ARRAY[]::UUID[],
    -- Metadata
    status content_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Authors table
CREATE TABLE public.authors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    bio_fr TEXT,
    bio_en TEXT,
    avatar_url TEXT,
    social_twitter TEXT,
    social_linkedin TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stadio Originals table
CREATE TABLE public.originals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type original_type NOT NULL,
    -- Content
    title_fr TEXT NOT NULL,
    title_en TEXT,
    content_fr TEXT,
    content_en TEXT,
    excerpt_fr TEXT,
    excerpt_en TEXT,
    -- Media
    cover_image_url TEXT,
    media_url TEXT, -- for podcast/emission
    duration_seconds INTEGER, -- for podcast/emission
    -- Relations
    author_id UUID REFERENCES public.authors(id),
    category_ids UUID[] DEFAULT ARRAY[]::UUID[],
    related_event_ids UUID[] DEFAULT ARRAY[]::UUID[],
    -- SEO
    slug TEXT UNIQUE,
    meta_title TEXT,
    meta_description TEXT,
    -- Status
    status content_status NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Audit log table
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow runs table (n8n jobs tracking)
CREATE TABLE public.workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name TEXT NOT NULL,
    workflow_type TEXT, -- 'import_fixtures', 'rebuild_lists', 'recompute_notoriety', etc.
    status workflow_status NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    duration_ms INTEGER,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    triggered_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Analytics cache table (for dashboard KPIs)
CREATE TABLE public.analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value JSONB NOT NULL,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    geo_zone TEXT,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ
);

-- =============================================
-- 3. Security Definer Functions
-- =============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role admin_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to check if user has any admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
    )
$$;

-- Function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    ORDER BY 
        CASE role 
            WHEN 'owner' THEN 1 
            WHEN 'admin' THEN 2 
            WHEN 'editor' THEN 3 
            WHEN 'support' THEN 4 
        END
    LIMIT 1
$$;

-- =============================================
-- 4. Enable RLS on all tables
-- =============================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.originals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. RLS Policies
-- =============================================

-- User Roles Policies
CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Owners can manage roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'owner'))
    WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Profiles Policies
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Events Policies
CREATE POLICY "Admins can view all events" ON public.events
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Editors+ can manage events" ON public.events
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'editor')
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'editor')
    );

-- Event Pricing Policies
CREATE POLICY "Admins can view pricing" ON public.event_pricing
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Editors+ can manage pricing" ON public.event_pricing
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'editor')
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'editor')
    );

-- Event Pricing History Policies
CREATE POLICY "Admins can view pricing history" ON public.event_pricing_history
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert pricing history" ON public.event_pricing_history
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

-- Categories Policies
CREATE POLICY "Admins can view categories" ON public.categories
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Editors+ can manage categories" ON public.categories
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'editor')
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'editor')
    );

-- Authors Policies
CREATE POLICY "Admins can view authors" ON public.authors
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Editors+ can manage authors" ON public.authors
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'editor')
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'editor')
    );

-- Originals Policies
CREATE POLICY "Admins can view originals" ON public.originals
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Editors+ can manage originals" ON public.originals
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'editor')
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin') OR 
        public.has_role(auth.uid(), 'editor')
    );

-- Audit Log Policies
CREATE POLICY "Admins can view audit log" ON public.audit_log
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "System can insert audit log" ON public.audit_log
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

-- Workflow Runs Policies
CREATE POLICY "Admins can view workflow runs" ON public.workflow_runs
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins+ can manage workflow runs" ON public.workflow_runs
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin')
    );

-- Analytics Cache Policies
CREATE POLICY "Admins can view analytics" ON public.analytics_cache
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "System can manage analytics cache" ON public.analytics_cache
    FOR ALL TO authenticated
    USING (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'owner') OR 
        public.has_role(auth.uid(), 'admin')
    );

-- =============================================
-- 6. Triggers for updated_at
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_user_roles
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_events
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_event_pricing
    BEFORE UPDATE ON public.event_pricing
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_categories
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_originals
    BEFORE UPDATE ON public.originals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 7. Function to create profile on signup
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 8. Indexes for performance
-- =============================================

CREATE INDEX idx_events_sport ON public.events(sport);
CREATE INDEX idx_events_league ON public.events(league);
CREATE INDEX idx_events_event_date ON public.events(event_date);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_is_live ON public.events(is_live);

CREATE INDEX idx_originals_type ON public.originals(type);
CREATE INDEX idx_originals_status ON public.originals(status);
CREATE INDEX idx_originals_author ON public.originals(author_id);
CREATE INDEX idx_originals_published ON public.originals(published_at);

CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at);

CREATE INDEX idx_workflow_runs_status ON public.workflow_runs(status);
CREATE INDEX idx_workflow_runs_type ON public.workflow_runs(workflow_type);

CREATE INDEX idx_analytics_metric ON public.analytics_cache(metric_name);
CREATE INDEX idx_analytics_period ON public.analytics_cache(period_start, period_end);