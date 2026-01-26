-- Phase 1: Extension du schéma pour le workflow Catalogue

-- 1.1 Ajouter les colonnes broadcaster à la table events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS broadcaster TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS broadcaster_logo_url TEXT;

-- 1.2 Ajouter la valeur 'catalog' à l'enum content_status
-- Cette valeur représente les événements importés depuis l'API, en attente de configuration
ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'catalog' BEFORE 'draft';