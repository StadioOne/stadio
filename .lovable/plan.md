
# Plan : Détection des doublons lors de l'import des matchs

## Objectif
Comparer les matchs proposés par l'API avec les événements déjà présents en base (statut `catalog`, `draft`, `published`) afin d'indiquer visuellement les doublons et éviter les imports inutiles.

---

## Stratégie de détection

### Identification des doublons
- Chaque match de l'API possède un `id` numérique unique (ex: `1035478`)
- La table `events` stocke cet identifiant dans la colonne `external_id` (format texte)
- La comparaison se fait via : `external_id = game.id.toString()`

### Affichage visuel
- Les matchs **déjà importés** seront marqués avec un badge indiquant leur statut actuel
- Ces matchs seront **désélectionnés par défaut** et auront un style visuel distinct
- Possibilité de les sélectionner quand même (pour mettre à jour les données)

---

## Interface utilisateur

```text
┌────────────────────────────────────────────────────────────────────┐
│ ☐ PSG vs Marseille                   15 Mar    [NS]  ← Normal     │
│ ☐ Lyon vs Nice                       16 Mar    [NS]               │
│ ☐ Monaco vs Lens      [Déjà importé] 17 Mar    [NS]  ← Badge vert │
│ ☐ Lille vs Rennes     [Publié]       18 Mar    [NS]  ← Badge bleu │
└────────────────────────────────────────────────────────────────────┘
```

### Badges de statut
- **`Catalogue`** : badge vert pour les événements au statut `catalog`
- **`Brouillon`** : badge jaune pour le statut `draft`  
- **`Publié`** : badge bleu pour le statut `published`

### Comportement de sélection
- Les matchs déjà importés ne sont pas inclus dans "Tout sélectionner"
- Ils peuvent être sélectionnés manuellement si l'utilisateur souhaite mettre à jour les données
- Le compteur affiche le nombre de nouveaux matchs vs doublons

---

## Détails techniques

### Modifications de `src/pages/ApiSportsSettingsPage.tsx`

**1. Nouvelle requête pour charger les événements existants**

Après avoir récupéré les matchs de l'API, on charge les `external_id` déjà présents en base :

```typescript
// Fetch existing events to detect duplicates
const { data: existingEvents = [] } = useQuery({
  queryKey: ['existing-events-external-ids'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('events')
      .select('external_id, status')
      .not('external_id', 'is', null);
    if (error) throw error;
    return data as { external_id: string; status: string }[];
  },
});
```

**2. Map pour vérification rapide des doublons**

```typescript
// Create a map of external_id -> status for quick lookup
const existingEventsMap = useMemo(() => {
  const map = new Map<string, string>();
  existingEvents.forEach(e => {
    if (e.external_id) {
      map.set(e.external_id, e.status);
    }
  });
  return map;
}, [existingEvents]);

// Check if a game already exists
const getGameStatus = (gameId: number): string | null => {
  return existingEventsMap.get(gameId.toString()) || null;
};
```

**3. Filtrage des matchs pour "Tout sélectionner"**

Modifier `toggleAllGames` pour exclure les doublons :

```typescript
const toggleAllGames = () => {
  const newGames = games.filter(g => !getGameStatus(g.id));
  if (selectedGames.size === newGames.length && newGames.length > 0) {
    setSelectedGames(new Set());
  } else {
    setSelectedGames(new Set(newGames.map(g => g.id)));
  }
};
```

**4. Compteur amélioré**

```typescript
const newGamesCount = games.filter(g => !getGameStatus(g.id)).length;
const duplicatesCount = games.length - newGamesCount;

// Affichage
<span className="text-sm text-muted-foreground">
  {selectedGames.size} sélectionné(s) • {newGamesCount} nouveaux
  {duplicatesCount > 0 && (
    <span className="text-amber-600 ml-2">
      ({duplicatesCount} déjà importé{duplicatesCount > 1 ? 's' : ''})
    </span>
  )}
</span>
```

**5. Rendu des matchs avec indication de doublon**

```tsx
{games.map((game) => {
  const existingStatus = getGameStatus(game.id);
  const isDuplicate = !!existingStatus;
  
  return (
    <div
      key={game.id}
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors",
        selectedGames.has(game.id) && "border-primary bg-primary/5",
        isDuplicate && !selectedGames.has(game.id) && "opacity-60 bg-muted/30"
      )}
      onClick={() => toggleGame(game.id)}
    >
      <Checkbox ... />
      
      {/* Teams */}
      <div className="flex-1 min-w-0">
        ...
      </div>

      {/* Date */}
      <div className="text-right flex-shrink-0">
        ...
      </div>

      {/* Status badges */}
      {isDuplicate && (
        <Badge 
          variant={
            existingStatus === 'published' ? 'default' : 
            existingStatus === 'draft' ? 'secondary' : 'outline'
          }
          className={cn(
            existingStatus === 'catalog' && "bg-green-100 text-green-700 border-green-300",
            existingStatus === 'published' && "bg-blue-100 text-blue-700 border-blue-300"
          )}
        >
          {existingStatus === 'catalog' && 'Catalogue'}
          {existingStatus === 'draft' && 'Brouillon'}
          {existingStatus === 'published' && 'Publié'}
        </Badge>
      )}
      
      <Badge variant="outline">{game.status}</Badge>
    </div>
  );
})}
```

**6. Import avec icône CheckCircle2**

Nouvel import requis :
```typescript
import { CheckCircle2 } from "lucide-react";
```

---

## Résumé des modifications

| Fichier | Modifications |
|---------|---------------|
| `src/pages/ApiSportsSettingsPage.tsx` | Détection et affichage des doublons |

---

## Comportement attendu

1. L'utilisateur sélectionne une ligue et recherche les matchs
2. Les matchs déjà importés apparaissent avec un badge coloré indiquant leur statut
3. Ces matchs sont visuellement atténués (opacity réduite)
4. "Tout sélectionner" n'inclut que les nouveaux matchs
5. L'utilisateur peut quand même sélectionner manuellement un doublon pour mettre à jour ses données
6. Le compteur affiche clairement le nombre de nouveaux vs existants
