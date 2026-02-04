-- Enums pour le module Broadcasters
CREATE TYPE broadcaster_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE broadcaster_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE rights_exclusivity AS ENUM ('exclusive', 'shared', 'non_exclusive');
CREATE TYPE rights_platform AS ENUM ('ott', 'linear', 'both');
CREATE TYPE rights_status AS ENUM ('draft', 'active', 'expired', 'revoked');
CREATE TYPE package_scope AS ENUM ('sport', 'competition', 'season');

-- Table des diffuseurs
CREATE TABLE public.broadcasters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  logo_url TEXT,
  contact_email TEXT,
  status broadcaster_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger updated_at pour broadcasters
CREATE TRIGGER update_broadcasters_updated_at
  BEFORE UPDATE ON public.broadcasters
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.broadcasters ENABLE ROW LEVEL SECURITY;

-- Policies broadcasters (admin only)
CREATE POLICY "Admins can view broadcasters"
  ON public.broadcasters FOR SELECT
  USING (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role));

CREATE POLICY "Admins can manage broadcasters"
  ON public.broadcasters FOR ALL
  USING (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role));

-- Table utilisateurs broadcaster (multi-tenant)
CREATE TABLE public.broadcaster_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcaster_id UUID NOT NULL REFERENCES public.broadcasters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role broadcaster_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(broadcaster_id, user_id)
);

-- Enable RLS
ALTER TABLE public.broadcaster_users ENABLE ROW LEVEL SECURITY;

-- Policies broadcaster_users
CREATE POLICY "Admins can manage broadcaster_users"
  ON public.broadcaster_users FOR ALL
  USING (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role));

CREATE POLICY "Broadcaster users can view own membership"
  ON public.broadcaster_users FOR SELECT
  USING (user_id = auth.uid());

-- Table territories (pays/zones)
CREATE TABLE public.territories (
  code TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT
);

-- Enable RLS
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;

-- Territories visibles par tous les admins
CREATE POLICY "Admins can view territories"
  ON public.territories FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage territories"
  ON public.territories FOR ALL
  USING (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role));

-- Insert quelques territoires de base
INSERT INTO public.territories (code, name, region) VALUES
  ('FR', 'France', 'Europe'),
  ('BE', 'Belgique', 'Europe'),
  ('CH', 'Suisse', 'Europe'),
  ('DE', 'Allemagne', 'Europe'),
  ('IT', 'Italie', 'Europe'),
  ('ES', 'Espagne', 'Europe'),
  ('PT', 'Portugal', 'Europe'),
  ('GB', 'Royaume-Uni', 'Europe'),
  ('NL', 'Pays-Bas', 'Europe'),
  ('US', 'États-Unis', 'Amérique du Nord'),
  ('CA', 'Canada', 'Amérique du Nord'),
  ('MX', 'Mexique', 'Amérique du Nord'),
  ('BR', 'Brésil', 'Amérique du Sud'),
  ('AR', 'Argentine', 'Amérique du Sud'),
  ('JP', 'Japon', 'Asie'),
  ('CN', 'Chine', 'Asie'),
  ('AU', 'Australie', 'Océanie');

-- Table des packages de droits (contrats)
CREATE TABLE public.rights_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcaster_id UUID NOT NULL REFERENCES public.broadcasters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope_type package_scope NOT NULL,
  sport_id UUID REFERENCES public.sports(id) ON DELETE SET NULL,
  league_id UUID REFERENCES public.leagues(id) ON DELETE SET NULL,
  season INTEGER,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_exclusive_default BOOLEAN NOT NULL DEFAULT false,
  territories_default TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  status rights_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE TRIGGER update_rights_packages_updated_at
  BEFORE UPDATE ON public.rights_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.rights_packages ENABLE ROW LEVEL SECURITY;

-- Policies rights_packages
CREATE POLICY "Admins can view rights_packages"
  ON public.rights_packages FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage rights_packages"
  ON public.rights_packages FOR ALL
  USING (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role));

CREATE POLICY "Broadcaster users can view own packages"
  ON public.rights_packages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.broadcaster_users
      WHERE broadcaster_users.broadcaster_id = rights_packages.broadcaster_id
      AND broadcaster_users.user_id = auth.uid()
    )
  );

-- Table des droits par événement
CREATE TABLE public.rights_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  broadcaster_id UUID NOT NULL REFERENCES public.broadcasters(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.rights_packages(id) ON DELETE SET NULL,
  rights_live BOOLEAN NOT NULL DEFAULT false,
  rights_replay BOOLEAN NOT NULL DEFAULT false,
  rights_highlights BOOLEAN NOT NULL DEFAULT false,
  replay_window_hours INTEGER,
  territories_allowed TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  territories_blocked TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  exclusivity rights_exclusivity NOT NULL DEFAULT 'non_exclusive',
  platform rights_platform NOT NULL DEFAULT 'both',
  status rights_status NOT NULL DEFAULT 'draft',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Trigger updated_at
CREATE TRIGGER update_rights_events_updated_at
  BEFORE UPDATE ON public.rights_events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.rights_events ENABLE ROW LEVEL SECURITY;

-- Policies rights_events
CREATE POLICY "Admins can view rights_events"
  ON public.rights_events FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage rights_events"
  ON public.rights_events FOR ALL
  USING (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role));

CREATE POLICY "Broadcaster users can view own rights"
  ON public.rights_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.broadcaster_users
      WHERE broadcaster_users.broadcaster_id = rights_events.broadcaster_id
      AND broadcaster_users.user_id = auth.uid()
    )
  );

-- Index pour les performances
CREATE INDEX idx_rights_events_event_id ON public.rights_events(event_id);
CREATE INDEX idx_rights_events_broadcaster_id ON public.rights_events(broadcaster_id);
CREATE INDEX idx_rights_events_status ON public.rights_events(status);
CREATE INDEX idx_rights_events_territories ON public.rights_events USING GIN(territories_allowed);
CREATE INDEX idx_rights_packages_broadcaster_id ON public.rights_packages(broadcaster_id);
CREATE INDEX idx_broadcaster_users_user_id ON public.broadcaster_users(user_id);