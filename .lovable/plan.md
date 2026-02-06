
# Plan : Suppression des pages Analytics

## Objectif

Supprimer les 3 pages Analytics (vue d'ensemble, fixtures, originals) et toutes les references associees dans la navigation et le routage.

## Fichiers a supprimer

| Fichier | Raison |
|---------|--------|
| `src/pages/AnalyticsPage.tsx` | Page principale Analytics |
| `src/pages/AnalyticsFixturesPage.tsx` | Sous-page Fixtures |
| `src/pages/AnalyticsOriginalsPage.tsx` | Sous-page Originals |
| `src/hooks/useAnalytics.ts` | Hook dedie Analytics |
| `src/components/analytics/AnalyticsFilters.tsx` | Composant filtre |
| `src/components/analytics/AnalyticsPagination.tsx` | Composant pagination |
| `src/components/analytics/CountryTable.tsx` | Table geo |
| `src/components/analytics/ExportButton.tsx` | Bouton export |
| `src/components/analytics/KPICard.tsx` | Carte KPI |
| `src/components/analytics/PeriodSelector.tsx` | Selecteur periode |
| `src/components/analytics/TrendBadge.tsx` | Badge tendance |

## Fichiers a modifier

| Fichier | Modification |
|---------|--------------|
| `src/App.tsx` | Retirer les 3 routes `/analytics`, `/analytics/fixtures`, `/analytics/originals` et les imports |
| `src/components/admin/AdminSidebar.tsx` | Retirer le menu collapsible "Analytics" et ses sous-items |
| `src/components/dashboard/QuickActionsCard.tsx` | Retirer le bouton "Voir les analytics" |
| `src/lib/i18n.ts` | Nettoyer les cles de traduction `analytics.*` |

## Impact

- Aucun impact sur les Edge Functions backend (elles restent deployees mais simplement non utilisees cote front)
- Le bouton "Voir les analytics" dans le dashboard sera retire
- Le menu lateral sera simplifie (plus de sous-menu Analytics)
