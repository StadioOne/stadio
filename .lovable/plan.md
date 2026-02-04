
# Plan : Synchronisation des ligues et système de favoris

## Objectif
Améliorer la page "Import depuis API Sports" pour permettre :
1. **Synchroniser les ligues** depuis l'API directement sur cette page
2. **Marquer des ligues en favoris** pour les retrouver facilement
3. **Retirer des ligues des favoris** quand elles ne sont plus nécessaires

---

## Modifications de la base de données

### Ajout d'une colonne `is_favorite` à la table `leagues`

```sql
ALTER TABLE public.leagues
ADD COLUMN is_favorite boolean DEFAULT false;

-- Ajouter un index pour optimiser les requêtes sur les favoris
CREATE INDEX idx_leagues_favorite ON public.leagues(is_favorite) WHERE is_favorite = true;
```

---

## Interface utilisateur

### 1. Bouton de synchronisation des ligues (Step 2)

Lorsqu'aucune ligue n'est disponible ou pour rafraîchir la liste, un bouton permettra de synchroniser les ligues depuis l'API :

```text
┌─────────────────────────────────────────────────────────────┐
│  Ligue et période                                           │
│  Sélectionnez une ligue suivie et la période à explorer     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Ligue] ▼  Sélectionnez une ligue                         │
│                                                             │
│  ★ Favoris (3)                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ⚽ Premier League (Angleterre) • 2024    ★ [Retirer] │  │
│  │ ⚽ Ligue 1 (France) • 2024               ★ [Retirer] │  │
│  │ ⚽ La Liga (Espagne) • 2024              ★ [Retirer] │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [🔄 Synchroniser les ligues]                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Sélecteur de ligue amélioré avec favoris

Le sélecteur affichera :
- **Section "Favoris"** en haut avec les ligues favorites
- **Section "Toutes les ligues"** avec les autres ligues suivies
- **Icône étoile** pour marquer/retirer des favoris

### 3. Gestion des favoris dans le sélecteur

Dans chaque ligne du sélecteur :
- Clic sur l'étoile vide → ajoute aux favoris
- Clic sur l'étoile pleine → retire des favoris

---

## Détails techniques

### Modifications de `src/pages/ApiSportsSettingsPage.tsx`

**1. Nouveaux imports**
```typescript
import { Star, Download } from "lucide-react";
```

**2. Modification de la requête des ligues**
Charger toutes les ligues suivies avec le nouveau champ :
```typescript
const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
  queryKey: ['sport-leagues-synced', selectedSport?.id],
  queryFn: async () => {
    if (!selectedSport) return [];
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('sport_id', selectedSport.id)
      .eq('is_synced', true)
      .order('is_favorite', { ascending: false })
      .order('name');
    if (error) throw error;
    return data;
  },
  enabled: !!selectedSport,
});
```

**3. Mutation pour synchroniser les ligues**
```typescript
const syncLeaguesMutation = useMutation({
  mutationFn: async () => {
    return callSportSyncEndpoint({
      action: 'sync_leagues',
      sport: selectedSport?.slug,
    });
  },
  onSuccess: (result) => {
    queryClient.invalidateQueries({ queryKey: ['sport-leagues-synced'] });
    toast.success(`${result.data?.synced || 0} ligues synchronisées`);
  },
  onError: (error) => {
    toast.error(error instanceof Error ? error.message : 'Erreur');
  },
});
```

**4. Mutation pour toggle favoris**
```typescript
const toggleFavoriteMutation = useMutation({
  mutationFn: async ({ leagueId, isFavorite }: { leagueId: string; isFavorite: boolean }) => {
    const { error } = await supabase
      .from('leagues')
      .update({ is_favorite: isFavorite })
      .eq('id', leagueId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['sport-leagues-synced'] });
    toast.success(isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris');
  },
});
```

**5. Séparation des ligues favorites/non-favorites**
```typescript
const favoriteLeagues = leagues.filter(l => l.is_favorite);
const otherLeagues = leagues.filter(l => !l.is_favorite);
```

**6. UI du sélecteur avec sections**
```tsx
<Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
  <SelectTrigger className="w-full max-w-md">
    <SelectValue placeholder="Sélectionnez une ligue" />
  </SelectTrigger>
  <SelectContent>
    {/* Section Favoris */}
    {favoriteLeagues.length > 0 && (
      <>
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          Favoris
        </div>
        {favoriteLeagues.map((league) => (
          <SelectItem key={league.id} value={league.id}>
            <div className="flex items-center gap-2 w-full">
              {league.logo_url && <img src={league.logo_url} className="h-4 w-4" />}
              <span className="flex-1">{league.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavoriteMutation.mutate({ leagueId: league.id, isFavorite: false });
                }}
              >
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              </Button>
            </div>
          </SelectItem>
        ))}
        <Separator className="my-1" />
      </>
    )}
    
    {/* Section Autres ligues */}
    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
      Toutes les ligues
    </div>
    {otherLeagues.map((league) => (
      <SelectItem key={league.id} value={league.id}>
        <div className="flex items-center gap-2 w-full">
          {league.logo_url && <img src={league.logo_url} className="h-4 w-4" />}
          <span className="flex-1">{league.name}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavoriteMutation.mutate({ leagueId: league.id, isFavorite: true });
            }}
          >
            <Star className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**7. Bouton de synchronisation**
Ajouter sous le sélecteur de ligue :
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => syncLeaguesMutation.mutate()}
  disabled={syncLeaguesMutation.isPending}
>
  {syncLeaguesMutation.isPending ? (
    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
  ) : (
    <Download className="h-4 w-4 mr-2" />
  )}
  Synchroniser les ligues
</Button>
```

---

## Résumé des fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| Migration SQL | Ajout colonne `is_favorite` + index |
| `src/pages/ApiSportsSettingsPage.tsx` | Sélecteur amélioré, bouton sync, toggle favoris |

---

## Comportement attendu

1. **Synchronisation** : L'utilisateur clique sur "Synchroniser les ligues" → appel API → ligues rafraîchies
2. **Ajout favori** : L'utilisateur clique sur l'étoile vide d'une ligue → elle remonte en haut de la liste dans "Favoris"
3. **Retrait favori** : L'utilisateur clique sur l'étoile pleine → la ligue redescend dans "Toutes les ligues"
4. **Sélection** : Les favoris s'affichent toujours en premier pour un accès rapide
