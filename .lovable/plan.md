
# Plan : Implémentation complète de la page Tarification

## Contexte Stadio Admin

Cette page s'intègre dans l'écosystème Stadio Admin qui gère un service de streaming sportif pay-per-view. Le système de tarification est un élément central du business model :

- **3 tiers tarifaires** : Bronze (4.99-14.99€), Silver (9.99-24.99€), Gold (14.99-49.99€)
- **Calcul automatique** basé sur la ligue, le statut épinglé, le live
- **Overrides manuels** possibles pour les admins/owners
- **Historique complet** via `event_pricing_history`
- **Edge Function existante** : `admin-pricing-recompute` (batch + single event)

## Architecture de la page

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Header: "Tarification"                    [Recalculer tous les prix]   │
│  Sous-titre: "Gestion des prix et tiers"                                 │
├──────────────────────────────────────────────────────────────────────────┤
│  Stats: [Total] [Bronze: XX] [Silver: XX] [Gold: XX] [Manuels: XX]      │
├──────────────────────────────────────────────────────────────────────────┤
│  Tabs: [ Configuration ] [ Événements ] [ Historique ]                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Tab "Configuration" (owner only):                                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Tier     │ Min    │ Base   │ Max    │ Actions                      │ │
│  │──────────│────────│────────│────────│──────────────────────────────│ │
│  │ Gold     │ 14.99€ │ 24.99€ │ 49.99€ │ [Modifier]                   │ │
│  │ Silver   │ 9.99€  │ 14.99€ │ 24.99€ │ [Modifier]                   │ │
│  │ Bronze   │ 4.99€  │ 9.99€  │ 14.99€ │ [Modifier]                   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Tab "Événements":                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Filtres: [Tier ▼] [Override ▼] [Statut ▼] [Recherche...]          │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ Table:                                                              │ │
│  │ Événement        │ Sport    │ Ligue    │ Tier   │ Prix   │ Type   │ │
│  │ Arsenal vs Liver │ Football │ PL       │ [Gold] │ 24.99€ │ [Calc] │ │
│  │ PSG vs Marseille │ Football │ Ligue 1  │ [Gold] │ 19.99€ │ [Man]  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Tab "Historique":                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Timeline des changements avec diff avant/après                     │ │
│  │ Date        │ Événement    │ Avant    │ Après    │ Type   │ Par   │ │
│  │ 04/02 19:35 │ PSG vs OM    │ Silver   │ Gold     │ Manual │ Admin │ │
│  │ 04/02 19:15 │ Bayern vs BVB│ -        │ Bronze   │ Init   │ Sys   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/hooks/usePricing.ts` | Hook combiné pour pricing config, events avec pricing, et historique |
| `src/hooks/usePricingMutations.ts` | Mutations pour update config, batch recompute |
| `src/components/pricing/PricingStats.tsx` | Cards de statistiques par tier |
| `src/components/pricing/PricingFilters.tsx` | Filtres tier/override/status/search |
| `src/components/pricing/PricingConfigTab.tsx` | Tableau de configuration des tiers |
| `src/components/pricing/PricingEventsTab.tsx` | Liste des événements avec pricing |
| `src/components/pricing/PricingEventsRow.tsx` | Ligne du tableau événements |
| `src/components/pricing/PricingHistoryTab.tsx` | Timeline de l'historique |
| `src/components/pricing/PricingHistoryRow.tsx` | Ligne de l'historique |
| `src/components/pricing/PricingEditDialog.tsx` | Modal d'édition tier/prix |
| `src/components/pricing/PricingConfigEditDialog.tsx` | Modal édition config tier |

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/PricingPage.tsx` | Refonte complète avec tabs et composants |
| `src/lib/api.ts` | Ajouter méthode `pricing.updateConfig` |
| `src/lib/api-types.ts` | Ajouter types pour PricingConfig, PricingHistory |

## Détails techniques

### Hook `usePricing.ts`

```typescript
// Récupère la configuration des tiers
export function usePricingConfig() {
  return useQuery({
    queryKey: ['pricing', 'config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('tier');
      if (error) throw error;
      return data;
    }
  });
}

// Récupère les événements avec pricing
export function useEventsPricing(filters: PricingFilters) {
  return useQuery({
    queryKey: ['pricing', 'events', filters],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select(`
          id, api_title, override_title, sport, league, 
          event_date, status, home_team, away_team,
          pricing:event_pricing(*)
        `, { count: 'exact' })
        .in('status', ['draft', 'published']);
      
      // Appliquer filtres...
      return query;
    }
  });
}

// Stats par tier
export function usePricingStats() {
  return useQuery({
    queryKey: ['pricing', 'stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('event_pricing')
        .select('computed_tier, is_manual_override');
      
      return {
        total: data?.length || 0,
        gold: data?.filter(p => p.computed_tier === 'gold').length || 0,
        silver: data?.filter(p => p.computed_tier === 'silver').length || 0,
        bronze: data?.filter(p => p.computed_tier === 'bronze').length || 0,
        manual: data?.filter(p => p.is_manual_override).length || 0,
      };
    }
  });
}

// Historique des modifications
export function usePricingHistory(limit = 50) {
  return useQuery({
    queryKey: ['pricing', 'history', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_pricing_history')
        .select(`
          id, previous_price, new_price, previous_tier, new_tier,
          change_type, changed_by, created_at,
          event_pricing:event_pricing_id(
            event:event_id(id, api_title, override_title, sport, league)
          ),
          actor:changed_by(email, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    }
  });
}
```

### Hook `usePricingMutations.ts`

```typescript
// Mise à jour config tier (owner only)
export function useUpdatePricingConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tierId, data }: { tierId: string; data: Partial<PricingConfig> }) => {
      const { data: updated, error } = await supabase
        .from('pricing_config')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', tierId)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing', 'config'] });
      toast.success('Configuration mise à jour');
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    }
  });
}

// Recalcul batch (admin+)
export function useBatchRecompute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => adminApi.pricing.recompute({ batch: true }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pricing'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`${data.processed} événements recalculés`);
    },
    onError: (error) => {
      toast.error(handleApiError(error));
    }
  });
}
```

### Composant `PricingStats.tsx`

Reprend le pattern de `EventsStats.tsx` avec les icônes des tiers :

```typescript
const stats = [
  { label: 'Total', value: total, icon: DollarSign, className: 'text-foreground' },
  { label: 'Gold', value: gold, icon: Crown, className: 'text-tier-gold' },
  { label: 'Silver', value: silver, icon: Medal, className: 'text-tier-silver' },
  { label: 'Bronze', value: bronze, icon: Award, className: 'text-tier-bronze' },
  { label: 'Manuels', value: manual, icon: PenLine, className: 'text-warning' },
];
```

### Composant `PricingFilters.tsx`

Inspiré de `EventFilters.tsx` avec les filtres spécifiques :

- **Tier** : All / Gold / Silver / Bronze
- **Type** : All / Calculé / Manuel
- **Statut** : All / Draft / Published
- **Recherche** : par titre/équipe/ligue

### Page `PricingPage.tsx`

Structure avec tabs suivant le pattern existant :

```typescript
export default function PricingPage() {
  const { t } = useTranslation();
  const { role, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'config' | 'events' | 'history'>('events');
  
  const { data: stats, isLoading: statsLoading } = usePricingStats();
  const batchRecompute = useBatchRecompute();
  
  const canEditConfig = hasRole('owner');
  const canBatchRecompute = hasRole(['admin']);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            {t('pricing.title')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('pricing.subtitle')}</p>
        </div>
        {canBatchRecompute && (
          <Button onClick={() => batchRecompute.mutate()} disabled={batchRecompute.isPending}>
            <RefreshCw className={cn("h-4 w-4 mr-2", batchRecompute.isPending && "animate-spin")} />
            Recalculer tous les prix
          </Button>
        )}
      </div>
      
      {/* Stats */}
      <PricingStats {...stats} isLoading={statsLoading} />
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {canEditConfig && <TabsTrigger value="config">Configuration</TabsTrigger>}
          <TabsTrigger value="events">Événements</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>
        
        <TabsContent value="config">
          <PricingConfigTab />
        </TabsContent>
        <TabsContent value="events">
          <PricingEventsTab />
        </TabsContent>
        <TabsContent value="history">
          <PricingHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Réutilisation des composants existants

| Composant | Utilisation |
|-----------|-------------|
| `TierBadge` | Affichage des tiers Gold/Silver/Bronze |
| `OverrideBadge` | Distinction Calculé vs Manuel |
| `StatusBadge` | Statut draft/published |
| `Sheet` | Panel de détail événement |
| `Table` | Tableaux config/events/historique |
| `Tabs` | Navigation entre les sections |
| `Skeleton` | États de chargement |
| `Pagination` | Liste événements |

## Permissions par rôle

| Action | owner | admin | editor | support |
|--------|-------|-------|--------|---------|
| Voir la page | oui | oui | oui | oui |
| Voir config tiers | oui | oui | oui | oui |
| Modifier config tiers | oui | non | non | non |
| Modifier prix événement | oui | oui | non | non |
| Recalcul batch | oui | oui | non | non |
| Voir historique | oui | oui | oui | oui |

## Intégration avec l'existant

- **`useEventMutations.ts`** : Réutilise `useUpdateEventPricing` et `useRecomputeEventPricing`
- **`adminApi.pricing`** : Utilise les méthodes existantes
- **`EventDetailPanel`** : Logique pricing déjà implémentée, réutilisable
- **Traductions** : Clés `pricing.*` déjà définies dans i18n.ts

## Tests à effectuer

1. Vérifier l'affichage des stats par tier
2. Modifier la config d'un tier (owner) et valider la contrainte min < base < max
3. Filtrer les événements par tier/type
4. Modifier manuellement le prix d'un événement
5. Lancer un recalcul batch et vérifier les résultats
6. Consulter l'historique des modifications
7. Vérifier les permissions selon le rôle connecté
