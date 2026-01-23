-- Create league_teams junction table to link teams to leagues by season
CREATE TABLE public.league_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(league_id, team_id, season)
);

-- Add indexes for performance
CREATE INDEX idx_league_teams_league_id ON public.league_teams(league_id);
CREATE INDEX idx_league_teams_team_id ON public.league_teams(team_id);
CREATE INDEX idx_league_teams_season ON public.league_teams(season);

-- Enable RLS
ALTER TABLE public.league_teams ENABLE ROW LEVEL SECURITY;

-- Admins can view all league_teams
CREATE POLICY "Admins can view league_teams" 
ON public.league_teams 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Admins can manage league_teams
CREATE POLICY "Admins can manage league_teams" 
ON public.league_teams 
FOR ALL 
USING (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role))
WITH CHECK (has_role(auth.uid(), 'owner'::admin_role) OR has_role(auth.uid(), 'admin'::admin_role));

-- Public can view league_teams for active leagues
CREATE POLICY "Public can view league_teams for active leagues" 
ON public.league_teams 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.leagues 
    WHERE leagues.id = league_teams.league_id 
    AND leagues.is_active = true
  )
);