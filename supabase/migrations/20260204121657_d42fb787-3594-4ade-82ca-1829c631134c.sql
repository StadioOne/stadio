-- Ajout de la colonne is_favorite à la table leagues
ALTER TABLE public.leagues
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- Créer un index partiel pour optimiser les requêtes sur les favoris
CREATE INDEX IF NOT EXISTS idx_leagues_favorite ON public.leagues(is_favorite) WHERE is_favorite = true;