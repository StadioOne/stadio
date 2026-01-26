
# Plan : Implémentation complète de la page Ops & Workflows

## Contexte

La page "Ops & Workflows" (`/workflows`) permet de gérer et monitorer les automatisations n8n intégrées à Stadio Admin. Actuellement, c'est un placeholder vide. L'intégration n8n existe déjà avec :
- Edge Function `admin-n8n-trigger` pour déclencher les workflows
- Table `workflow_runs` pour stocker l'historique des exécutions
- MCP n8n connecté avec 3 workflows actifs détectés
- Secrets configurés : `N8N_WEBHOOK_URL` et `N8N_WEBHOOK_SECRET`

## Workflows n8n existants (via MCP)

| Nom | Description | Déclencheur |
|-----|-------------|-------------|
| Auto Sync Compétitions Football | Synchronisation automatique des matchs | Schedule (3h) |
| Mise à jour automatique des prix | Recalcul des prix événements | Schedule (3h50) |
| Calcul Automatique Notoriété | Calcul de notoriété des événements | Schedule (3h30) |

## Fonctionnalités à implémenter

### 1. Vue principale avec cartes de workflows
- Affichage en grille des workflows disponibles (prédéfinis + n8n dynamiques)
- Chaque carte affiche : Nom, Description, Statut, Dernier run, Bouton Trigger
- Badge de statut coloré (pending=jaune, running=bleu, success=vert, failed=rouge)

### 2. Statistiques globales
- Total des exécutions
- Répartition par statut (succès, échecs, en cours)
- Temps moyen d'exécution

### 3. Historique des exécutions
- Tableau chronologique des `workflow_runs`
- Colonnes : Date, Workflow, Déclenché par, Statut, Durée, Erreur
- Pagination (20 entrées par page)
- Filtres par workflow et statut

### 4. Panel de détail d'exécution
- Clic sur une ligne ouvre un panel latéral
- Affiche les données d'entrée (input_data) et sortie (output_data)
- Affiche le message d'erreur si échec
- Durée d'exécution

### 5. Déclenchement manuel
- Bouton "Déclencher" sur chaque workflow
- Confirmation avant exécution
- Feedback immédiat (toast + mise à jour statut)
- Restrictions par rôle (certains workflows réservés aux admin/owner)

### 6. Connexion n8n (optionnel)
- Indicateur de connexion n8n (configuré/non configuré)
- Affichage des workflows découverts via MCP

## Fichiers à créer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/hooks/useWorkflows.ts` | Créer | Hook React Query pour workflow_runs + stats |
| `src/hooks/useWorkflowMutations.ts` | Créer | Hook pour déclencher les workflows |
| `src/pages/WorkflowsPage.tsx` | Modifier | Page principale refondée |
| `src/components/workflows/WorkflowStats.tsx` | Créer | Statistiques globales |
| `src/components/workflows/WorkflowCard.tsx` | Créer | Carte d'un workflow disponible |
| `src/components/workflows/WorkflowGrid.tsx` | Créer | Grille des workflows disponibles |
| `src/components/workflows/WorkflowRunsTable.tsx` | Créer | Tableau de l'historique |
| `src/components/workflows/WorkflowRunRow.tsx` | Créer | Ligne du tableau |
| `src/components/workflows/WorkflowRunDetailPanel.tsx` | Créer | Panel de détail |
| `src/components/workflows/StatusBadge.tsx` | Créer | Badge de statut workflow |
| `src/components/workflows/WorkflowEmptyState.tsx` | Créer | État vide |
| `src/lib/i18n.ts` | Modifier | Ajouter traductions workflows |

## Détails techniques

### Types

```typescript
interface WorkflowRun {
  id: string;
  workflow_name: string;
  workflow_type: string | null;
  status: 'pending' | 'running' | 'success' | 'failed';
  triggered_by: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  nameKey: string; // i18n key
  description: string;
  descriptionKey: string;
  icon: LucideIcon;
  type: 'internal' | 'n8n';
  requiredRoles: AdminRole[];
  params?: Record<string, unknown>;
}

interface WorkflowsStats {
  total: number;
  pending: number;
  running: number;
  success: number;
  failed: number;
  avgDurationMs: number | null;
}

interface WorkflowsFilters {
  workflow?: string;
  status?: 'pending' | 'running' | 'success' | 'failed' | 'all';
  limit?: number;
  offset?: number;
}
```

### Workflows prédéfinis

```typescript
const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  {
    id: 'import_fixtures',
    name: 'Import Fixtures',
    nameKey: 'workflows.definitions.importFixtures',
    description: 'Import des matchs depuis API-Sports',
    descriptionKey: 'workflows.definitions.importFixturesDesc',
    icon: Calendar,
    type: 'n8n',
    requiredRoles: ['admin', 'owner'],
  },
  {
    id: 'recompute_pricing',
    name: 'Recalcul Pricing',
    nameKey: 'workflows.definitions.recomputePricing',
    description: 'Recalcule les prix de tous les événements',
    descriptionKey: 'workflows.definitions.recomputePricingDesc',
    icon: DollarSign,
    type: 'n8n',
    requiredRoles: ['admin', 'owner'],
  },
  {
    id: 'rebuild_editorial_lists',
    name: 'Rebuild Listes',
    nameKey: 'workflows.definitions.rebuildLists',
    description: 'Reconstruit les listes éditoriales',
    descriptionKey: 'workflows.definitions.rebuildListsDesc',
    icon: List,
    type: 'n8n',
    requiredRoles: ['editor', 'admin', 'owner'],
  },
  {
    id: 'refresh_notoriety',
    name: 'Refresh Notoriété',
    nameKey: 'workflows.definitions.refreshNotoriety',
    description: 'Met à jour les scores de notoriété',
    descriptionKey: 'workflows.definitions.refreshNotorietyDesc',
    icon: TrendingUp,
    type: 'n8n',
    requiredRoles: ['admin', 'owner'],
  },
  {
    id: 'send_notifications',
    name: 'Notifications',
    nameKey: 'workflows.definitions.sendNotifications',
    description: 'Envoie les notifications push',
    descriptionKey: 'workflows.definitions.sendNotificationsDesc',
    icon: Bell,
    type: 'n8n',
    requiredRoles: ['admin', 'owner'],
  },
];
```

### Hook useWorkflows

```typescript
// Récupérer l'historique des exécutions
export function useWorkflowRuns(filters?: WorkflowsFilters) {
  return useQuery({
    queryKey: ['workflow-runs', filters],
    queryFn: async () => {
      let query = supabase
        .from('workflow_runs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.workflow) {
        query = query.eq('workflow_name', filters.workflow);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }
      
      return query;
    }
  });
}

// Statistiques
export function useWorkflowsStats() {
  return useQuery({
    queryKey: ['workflow-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_runs')
        .select('status, duration_ms');
      
      if (error) throw error;
      
      return {
        total: data.length,
        pending: data.filter(r => r.status === 'pending').length,
        running: data.filter(r => r.status === 'running').length,
        success: data.filter(r => r.status === 'success').length,
        failed: data.filter(r => r.status === 'failed').length,
        avgDurationMs: calculateAvg(data.map(r => r.duration_ms).filter(Boolean)),
      };
    }
  });
}
```

### Hook useWorkflowMutations

```typescript
export function useTriggerWorkflow() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ workflow, params }: { workflow: string; params?: Record<string, unknown> }) => {
      return adminApi.workflows.trigger(workflow as WorkflowType, params);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-runs'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-stats'] });
      toast.success(t('workflows.triggerSuccess', { name: data.workflow }));
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    },
  });
}
```

### Palette de couleurs pour les statuts

| Statut | Couleur | Badge |
|--------|---------|-------|
| pending | Jaune | bg-yellow-100 text-yellow-800 |
| running | Bleu | bg-blue-100 text-blue-800 + animation pulse |
| success | Vert | bg-green-100 text-green-800 |
| failed | Rouge | bg-red-100 text-red-800 |

## Maquette de l'interface

```text
+------------------------------------------------------------------+
|  Ops & Workflows                                                  |
|  Automatisations et jobs n8n                                     |
+------------------------------------------------------------------+
|  [Total: 15] [Succès: 12] [Échecs: 2] [En cours: 1] [Durée moy]  |
+------------------------------------------------------------------+
|  WORKFLOWS DISPONIBLES                                            |
+------------------------------------------------------------------+
|  +-----------------+  +-----------------+  +-----------------+    |
|  | [📅 Icon]       |  | [💰 Icon]       |  | [📋 Icon]       |   |
|  | Import Fixtures |  | Recalcul Prix   |  | Rebuild Listes  |   |
|  | Dernier: 3h     |  | Dernier: 3h50   |  | Jamais          |   |
|  | [✓ Succès]      |  | [✓ Succès]      |  | [- Aucun]       |   |
|  | [Déclencher]    |  | [Déclencher]    |  | [Déclencher]    |   |
|  +-----------------+  +-----------------+  +-----------------+    |
+------------------------------------------------------------------+
|  HISTORIQUE DES EXÉCUTIONS                                        |
+------------------------------------------------------------------+
|  [Tous les workflows ▼]  [Tous les statuts ▼]                    |
+------------------------------------------------------------------+
|  Date           Workflow           Déclenché par  Statut   Durée |
|  ─────────────────────────────────────────────────────────────── |
|  26 jan 03:00   Import Fixtures    Automatique    [✓]      45s   |
|  26 jan 03:50   Recalcul Prix      Automatique    [✓]      12s   |
|  25 jan 15:30   Import Fixtures    admin@...      [✗]      -     |
|  ─────────────────────────────────────────────────────────────── |
|  [< Précédent]  Page 1 sur 3  [Suivant >]                        |
+------------------------------------------------------------------+
```

### Panel de détail (Sheet)

```text
+--------------------------------------+
|  Détail de l'exécution       [×]    |
+--------------------------------------+
|  Workflow: Import Fixtures           |
|  Type: n8n                           |
|  ID: 550e8400-e29b-41d4...          |
+--------------------------------------+
|  Statut                              |
|  ┌─────────────────────────────────┐|
|  │ [✓ Succès]                      │|
|  │ Démarré: 26 jan 2026 03:00:00   │|
|  │ Terminé: 26 jan 2026 03:00:45   │|
|  │ Durée: 45 secondes              │|
|  └─────────────────────────────────┘|
+--------------------------------------+
|  Déclenché par                       |
|  ┌─────────────────────────────────┐|
|  │ Automatique (schedule)          │|
|  │ ou                              │|
|  │ admin@stadio.io                 │|
|  └─────────────────────────────────┘|
+--------------------------------------+
|  Données d'entrée                    |
|  ┌─────────────────────────────────┐|
|  │ {                               │|
|  │   "leagueIds": [1, 2, 3],       │|
|  │   "dateFrom": "2026-01-26"      │|
|  │ }                               │|
|  └─────────────────────────────────┘|
+--------------------------------------+
|  Données de sortie                   |
|  ┌─────────────────────────────────┐|
|  │ {                               │|
|  │   "processed": 42,              │|
|  │   "created": 12,                │|
|  │   "updated": 30                 │|
|  │ }                               │|
|  └─────────────────────────────────┘|
+--------------------------------------+
```

## Traductions à ajouter (i18n)

```typescript
workflows: {
  title: "Ops & Workflows",
  subtitle: "Automatisations et jobs n8n",
  description: "Gérez et déclenchez les workflows d'automatisation",
  
  // Stats
  stats: {
    total: "Total exécutions",
    pending: "En attente",
    running: "En cours",
    success: "Succès",
    failed: "Échecs",
    avgDuration: "Durée moyenne",
  },
  
  // Workflows
  availableWorkflows: "Workflows disponibles",
  trigger: "Déclencher",
  triggering: "Déclenchement...",
  triggerSuccess: "Workflow {{name}} déclenché avec succès",
  triggerError: "Erreur lors du déclenchement",
  lastRun: "Dernier run",
  never: "Jamais",
  ago: "il y a",
  
  // Définitions
  definitions: {
    importFixtures: "Import Fixtures",
    importFixturesDesc: "Import des matchs depuis API-Sports",
    recomputePricing: "Recalcul Pricing",
    recomputePricingDesc: "Recalcule les prix de tous les événements",
    rebuildLists: "Rebuild Listes",
    rebuildListsDesc: "Reconstruit les listes éditoriales",
    refreshNotoriety: "Refresh Notoriété",
    refreshNotorietyDesc: "Met à jour les scores de notoriété",
    sendNotifications: "Notifications",
    sendNotificationsDesc: "Envoie les notifications push",
  },
  
  // Historique
  history: "Historique des exécutions",
  workflow: "Workflow",
  triggeredBy: "Déclenché par",
  automatic: "Automatique",
  status: "Statut",
  duration: "Durée",
  startedAt: "Démarré le",
  finishedAt: "Terminé le",
  
  // Statuts
  statuses: {
    pending: "En attente",
    running: "En cours",
    success: "Succès",
    failed: "Échec",
  },
  
  // Filtres
  allWorkflows: "Tous les workflows",
  allStatuses: "Tous les statuts",
  
  // Détail
  runDetail: "Détail de l'exécution",
  workflowType: "Type",
  inputData: "Données d'entrée",
  outputData: "Données de sortie",
  errorMessage: "Message d'erreur",
  noData: "Aucune donnée",
  
  // États vides
  emptyTitle: "Aucune exécution",
  emptyDescription: "Les exécutions de workflows apparaîtront ici.",
  noResults: "Aucun résultat",
  noResultsDescription: "Aucune exécution ne correspond à vos filtres.",
  
  // Connexion n8n
  n8nConnection: "Connexion n8n",
  n8nConnected: "n8n connecté",
  n8nDisconnected: "n8n non configuré",
  n8nHint: "Configurez N8N_WEBHOOK_URL et N8N_WEBHOOK_SECRET",
  
  // Permissions
  roleRequired: "Rôle requis: {{roles}}",
  noPermission: "Vous n'avez pas les permissions pour déclencher ce workflow",
}
```

## Sécurité et restrictions

1. **Permissions par workflow** : Chaque workflow a des rôles requis
   - `import_fixtures`, `recompute_pricing`, `refresh_notoriety`, `send_notifications` : admin, owner
   - `rebuild_editorial_lists` : editor, admin, owner

2. **Validation côté serveur** : L'Edge Function `admin-n8n-trigger` vérifie les rôles

3. **Audit automatique** : Chaque déclenchement est loggé dans `audit_log`

## Ordre d'implémentation

### Étape 1 : Hooks (15 min)
1. Créer `src/hooks/useWorkflows.ts` avec `useWorkflowRuns` et `useWorkflowsStats`
2. Créer `src/hooks/useWorkflowMutations.ts` avec `useTriggerWorkflow`

### Étape 2 : Composants de base (20 min)
1. Créer `StatusBadge.tsx`
2. Créer `WorkflowStats.tsx`
3. Créer `WorkflowCard.tsx`
4. Créer `WorkflowGrid.tsx`

### Étape 3 : Tableau et historique (15 min)
1. Créer `WorkflowRunsTable.tsx`
2. Créer `WorkflowRunRow.tsx`
3. Créer `WorkflowEmptyState.tsx`

### Étape 4 : Panel de détail (10 min)
1. Créer `WorkflowRunDetailPanel.tsx`

### Étape 5 : Page principale (10 min)
1. Refondre `WorkflowsPage.tsx`
2. Ajouter traductions i18n

### Étape 6 : Tests
- Vérifier l'affichage des workflows disponibles
- Tester le déclenchement manuel
- Vérifier les restrictions de rôle
- Tester l'affichage de l'historique
