
# Redeploiement complet des Edge Functions

## Objectif
Redeployer toutes les 24 Edge Functions du projet vers le backend Lovable Cloud pour s'assurer qu'elles sont toutes actives et accessibles.

## Fonctions a deployer

### IA et generation
- `admin-ai-description` -- Generation de descriptions d'evenements
- `admin-ai-image` -- Generation d'images
- `admin-ai-suggest-price` -- Suggestion de prix par IA

### Analytics
- `admin-analytics-aggregate` -- Agregation des donnees analytiques
- `admin-analytics-cleanup` -- Nettoyage des anciennes donnees (retention 90 jours)
- `admin-analytics-fixtures` -- Analytics par match
- `admin-analytics-geo` -- Analytics geographiques
- `admin-analytics-originals` -- Analytics des contenus originaux
- `admin-analytics-overview` -- Vue d'ensemble analytique

### API externes
- `admin-api-football-sync` -- Synchronisation API Football
- `admin-api-sports-sync` -- Synchronisation API Sports

### Gestion des utilisateurs
- `admin-app-users` -- Proxy vers le projet Stadio App pour gerer les utilisateurs

### Audit et dashboard
- `admin-audit-log` -- Journal d'audit
- `admin-dashboard` -- Donnees du tableau de bord

### Evenements
- `admin-events-publish` -- Publication d'evenements
- `admin-events-unpublish` -- Depublication d'evenements

### Contenus originaux
- `admin-originals-publish` -- Publication de contenus originaux
- `admin-originals-unpublish` -- Depublication de contenus originaux

### Autres
- `admin-lists-rebuild` -- Reconstruction des listes/categories
- `admin-n8n-trigger` -- Declenchement de workflows n8n
- `admin-pricing-recompute` -- Recalcul des prix
- `admin-rights-resolve` -- Resolution des droits de diffusion
- `public-analytics-ingest` -- Ingestion d'evenements analytiques (public)
- `public-events-api` -- API publique des evenements

## Action
Deployer les 24 fonctions en une seule operation. Aucune modification de code n'est necessaire, les fichiers existent deja.
