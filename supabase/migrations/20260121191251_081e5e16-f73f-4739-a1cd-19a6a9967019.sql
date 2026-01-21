-- =============================================
-- Table: leagues (Référentiel des compétitions)
-- =============================================
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_fr TEXT,
  country TEXT,
  country_code TEXT,
  logo_url TEXT,
  type TEXT,
  season INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_synced BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherche rapide par external_id
CREATE INDEX idx_leagues_external_id ON public.leagues(external_id);
CREATE INDEX idx_leagues_is_synced ON public.leagues(is_synced) WHERE is_synced = true;

-- Trigger updated_at
CREATE TRIGGER update_leagues_updated_at
  BEFORE UPDATE ON public.leagues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active leagues"
  ON public.leagues FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all leagues"
  ON public.leagues FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage leagues"
  ON public.leagues FOR ALL
  USING (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role));

-- =============================================
-- Table: teams (Référentiel des équipes)
-- =============================================
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_short TEXT,
  logo_url TEXT,
  country TEXT,
  venue_name TEXT,
  venue_city TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_teams_external_id ON public.teams(external_id);
CREATE INDEX idx_teams_country ON public.teams(country);

-- Trigger updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active teams"
  ON public.teams FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all teams"
  ON public.teams FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage teams"
  ON public.teams FOR ALL
  USING (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role));

-- =============================================
-- Alter table: events (Ajout des relations)
-- =============================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES public.leagues(id),
  ADD COLUMN IF NOT EXISTS home_team_id UUID REFERENCES public.teams(id),
  ADD COLUMN IF NOT EXISTS away_team_id UUID REFERENCES public.teams(id),
  ADD COLUMN IF NOT EXISTS season INTEGER,
  ADD COLUMN IF NOT EXISTS round TEXT,
  ADD COLUMN IF NOT EXISTS venue TEXT,
  ADD COLUMN IF NOT EXISTS match_status TEXT,
  ADD COLUMN IF NOT EXISTS home_score INTEGER,
  ADD COLUMN IF NOT EXISTS away_score INTEGER,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_events_league_id ON public.events(league_id);
CREATE INDEX IF NOT EXISTS idx_events_home_team_id ON public.events(home_team_id);
CREATE INDEX IF NOT EXISTS idx_events_away_team_id ON public.events(away_team_id);
CREATE INDEX IF NOT EXISTS idx_events_external_id ON public.events(external_id);
CREATE INDEX IF NOT EXISTS idx_events_match_status ON public.events(match_status);