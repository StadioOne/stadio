
# Plan : Refonte complète du Tableau de Bord Stadio Admin

## Constat actuel

La page dashboard est actuellement un squelette statique avec des valeurs en dur ("--", "0") et deux cartes vides "Top événements" / "Top Originals". Elle ne consomme pas l'Edge Function `admin-dashboard` qui existe deja et retourne des KPIs reels. C'est la page d'accueil de l'admin : elle doit donner une vue d'ensemble instantanee et actionnable.

## Nouvelle architecture de la page

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Bonjour, {prénom} !                    Période: [Aujourd'hui ▼]        │
│  Voici l'état de votre plateforme                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │  117       │  │  7         │  │  0         │  │  1         │        │
│  │  Événements│  │  Publiés   │  │  En direct │  │  Originals │        │
│  │  📅        │  │  ✅        │  │  🔴        │  │  📄        │        │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │
│                                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │  1         │  │  2         │  │  XX à venir│  │  X workflows│       │
│  │  Auteurs   │  │  Catégories│  │  Prochains │  │  (24h)     │        │
│  │  ✍️        │  │  📁        │  │  ⏰        │  │  ⚡        │        │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─── Prochains événements ────────────┐  ┌─── Activité récente ──────┐ │
│  │                                      │  │                           │ │
│  │  🟢 PSG vs Marseille                │  │  ● Admin a publié ...     │ │
│  │     Ligue 1 · 08/02 21:00           │  │    il y a 2h              │ │
│  │  🔵 Arsenal vs Liverpool            │  │  ● Editor a modifié ...   │ │
│  │     Premier League · 09/02 17:30    │  │    il y a 5h              │ │
│  │  🔵 Real vs Barcelona              │  │  ● Admin a archivé ...    │ │
│  │     La Liga · 10/02 21:00           │  │    il y a 1j              │ │
│  │                                      │  │                           │ │
│  │  [Voir tous les événements →]       │  │  [Voir le journal →]      │ │
│  └──────────────────────────────────────┘  └───────────────────────────┘ │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─── Raccourcis rapides ────────────────────────────────────────────┐  │
│  │  [+ Nouvel événement]  [Recalculer prix]  [Sync API Sports]      │  │
│  │  [Rebuild listes]      [Voir Analytics]                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `src/hooks/useDashboard.ts` | Hook dedie qui appelle `admin-dashboard` + requetes directes pour upcoming events et audit recents |
| `src/components/dashboard/DashboardKPIGrid.tsx` | Grille de 8 KPIs dynamiques avec icones et couleurs |
| `src/components/dashboard/UpcomingEventsCard.tsx` | Liste des 5 prochains evenements avec TimeStatusBadge |
| `src/components/dashboard/RecentActivityCard.tsx` | 5 dernieres entrees du journal d'audit |
| `src/components/dashboard/QuickActionsCard.tsx` | Boutons de raccourcis vers les actions frequentes |

## Fichiers a modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/DashboardPage.tsx` | Refonte complete avec les nouveaux composants |
| `src/lib/i18n.ts` | Ajout des cles de traduction dashboard manquantes |

## Details techniques

### 1. Hook `useDashboard.ts`

```typescript
// Appel de l'Edge Function existante pour les KPIs
export function useDashboardKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => adminApi.dashboard.getKPIs(),
    staleTime: 5 * 60 * 1000,
  });
}

// 5 prochains evenements (requete directe Supabase)
export function useUpcomingEvents(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'upcoming'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, api_title, override_title, sport, league, event_date, is_live, status')
        .gte('event_date', new Date().toISOString())
        .in('status', ['draft', 'published'])
        .order('event_date', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });
}

// 5 dernieres actions d'audit
export function useRecentActivity(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, actor_email, actor_role, action, entity, entity_id, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
  });
}
```

### 2. Composant `DashboardKPIGrid.tsx`

Deux lignes de 4 cartes :

**Ligne 1 - Contenu principal** :
- Total evenements (icone Calendar, couleur foreground)
- Evenements publies (icone Eye, couleur success)
- En direct (icone Radio, couleur destructive, pulse si > 0)
- Originals publies (icone FileText, couleur primary)

**Ligne 2 - Ressources** :
- Auteurs actifs (icone PenTool)
- Categories visibles (icone FolderOpen)
- A venir prochaines 24h (icone CalendarClock, couleur blue) -- calcule depuis upcoming events
- Workflows recents 24h (icone Zap, couleur warning)

Chaque carte utilise le pattern existant avec `Card`, `Skeleton` en loading, et le style `card-hover`.

### 3. Composant `UpcomingEventsCard.tsx`

- Liste des 5 prochains evenements
- Chaque ligne : titre (override ou api), sport/ligue en badge, date relative (`date-fns formatDistanceToNow`)
- Reutilise `TimeStatusBadge` et `StatusBadge`
- Lien "Voir tous les evenements" vers `/events`

### 4. Composant `RecentActivityCard.tsx`

- Liste des 5 dernieres entrees d'audit
- Chaque ligne : action (badge colore), entite, acteur (email tronque), date relative
- Reutilise `ActionBadge` et `RoleBadge` existants
- Lien "Voir le journal" vers `/audit`

### 5. Composant `QuickActionsCard.tsx`

Boutons de raccourcis avec icones :
- "Gerer les evenements" -> `/events`
- "Recalculer les prix" -> appel mutation batch recompute
- "Voir les analytics" -> `/analytics`
- "Gerer le catalogue" -> `/catalog`

Visibilite conditionnelle selon le role (ex: recalcul prix reserve admin+).

### 6. Page `DashboardPage.tsx` refaite

```typescript
export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] 
    || user?.email?.split('@')[0] || '';

  return (
    <div className="space-y-6">
      {/* Header avec salutation personnalisee */}
      <div>
        <h1 className="text-2xl font-semibold">
          {t('dashboard.greeting', { name: firstName })}
        </h1>
        <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {/* KPIs Grid - 2 lignes de 4 */}
      <DashboardKPIGrid />

      {/* Contenu principal : 2 colonnes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingEventsCard />
        <RecentActivityCard />
      </div>

      {/* Raccourcis rapides */}
      <QuickActionsCard />
    </div>
  );
}
```

### 7. Traductions a ajouter

```typescript
dashboard: {
  title: "Tableau de bord",
  greeting: "Bonjour, {{name}} !",
  subtitle: "Voici l'état de votre plateforme",
  kpis: {
    totalEvents: "Événements",
    publishedEvents: "Publiés",
    liveEvents: "En direct",
    publishedOriginals: "Originals publiés",
    activeAuthors: "Auteurs actifs",
    visibleCategories: "Catégories",
    upcomingNext24h: "À venir (24h)",
    recentWorkflows: "Workflows (24h)",
  },
  sections: {
    upcomingEvents: "Prochains événements",
    recentActivity: "Activité récente",
    quickActions: "Raccourcis rapides",
    viewAllEvents: "Voir tous les événements",
    viewAuditLog: "Voir le journal",
    noUpcoming: "Aucun événement à venir",
    noActivity: "Aucune activité récente",
  },
  actions: {
    manageEvents: "Gérer les événements",
    recalculatePrices: "Recalculer les prix",
    viewAnalytics: "Voir les analytics",
    manageCatalog: "Gérer le catalogue",
  },
}
```

## Securite et RBAC

- Les KPIs financiers (CA) ne sont PAS affiches sur le dashboard (reserves a la page Analytics avec controle `canSeeRevenue`)
- Le bouton "Recalculer les prix" n'est visible que pour admin+
- Toutes les donnees proviennent de l'Edge Function authentifiee ou de requetes Supabase protegees par RLS

## Ameliorations UX cles

1. **Salutation personnalisee** : "Bonjour, {prenom}" au lieu d'un titre generique
2. **Donnees reelles** : plus aucune valeur en dur, tout vient du backend
3. **Contexte temporel** : prochains evenements avec dates relatives
4. **Activite recente** : visibilite sur les dernieres actions de l'equipe
5. **Raccourcis** : acces rapide aux actions frequentes sans naviguer dans le menu
6. **Loading states** : squelettes de chargement sur chaque section
7. **Responsive** : grille adaptative 1/2/4 colonnes selon la taille d'ecran
