
# Plan : Attribution de diffuseur dans le Catalogue

## Analyse de la demande

L'utilisateur souhaite améliorer la sélection du diffuseur dans la page Catalogue avec deux options :
1. **Attribution automatique** basée sur les contrats (`rights_packages`) existants des diffuseurs
2. **Recherche manuelle** dans la liste des diffuseurs enregistrés

## Situation actuelle

Actuellement dans `CatalogPage.tsx` (lignes 546-566), le diffuseur est saisi manuellement via deux champs texte libres :
- `broadcaster` : nom du diffuseur (texte libre)
- `broadcaster_logo_url` : URL du logo (texte libre)

## Solution proposée

### 1. Nouveau composant `BroadcasterSelector`

Un composant réutilisable avec deux modes :

**Mode automatique :**
- Analyse l'événement (sport, league, date) 
- Recherche les `rights_packages` actifs correspondants
- Affiche le(s) diffuseur(s) ayant des droits sur cette compétition/sport
- Badge "Auto" pour indiquer une attribution automatique

**Mode manuel :**
- Combobox avec recherche dans la liste des `broadcasters`
- Affiche le logo et le nom du diffuseur
- Permet la sélection ou la suppression

### 2. Hook `useBroadcasterSuggestions`

```text
┌─────────────────────────────────────────────────────────────┐
│                  useBroadcasterSuggestions                  │
├─────────────────────────────────────────────────────────────┤
│ Input: sport_id, league_id, event_date                      │
│                                                             │
│ Logique:                                                    │
│ 1. Requête rights_packages avec:                            │
│    - status = 'active'                                      │
│    - sport_id correspondant OU scope_type = 'sport'         │
│    - league_id correspondant OU scope_type = 'competition'  │
│    - start_at <= event_date <= end_at                       │
│                                                             │
│ 2. Join avec broadcasters pour récupérer:                   │
│    - id, name, logo_url, status                             │
│                                                             │
│ 3. Retourne liste de suggestions avec confidence score      │
└─────────────────────────────────────────────────────────────┘
```

### 3. Modification de la structure de données

L'événement stocke actuellement `broadcaster` (texte) et `broadcaster_logo_url`. 

Pour une meilleure intégrité des données, on pourrait :
- Option A : Garder les champs texte actuels (compatibilité) → sélection met à jour les deux champs
- Option B : Ajouter un `broadcaster_id` (FK) → migration nécessaire

**Recommandation** : Option A pour cette phase (pas de migration)

## Fichiers à créer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/hooks/useBroadcasterSuggestions.ts` | Créer | Hook pour trouver les diffuseurs avec contrats valides |
| `src/components/catalog/BroadcasterSelector.tsx` | Créer | Composant de sélection avec mode auto/manuel |
| `src/pages/CatalogPage.tsx` | Modifier | Intégrer le nouveau composant |

## Détails techniques

### Hook `useBroadcasterSuggestions`

```text
Paramètres:
- sport_id: string | null
- league_id: string | null  
- event_date: string

Retour:
- suggestions: Array<{
    broadcaster: Broadcaster,
    matchType: 'sport' | 'competition' | 'season',
    package: RightsPackage
  }>
- isLoading: boolean
```

### Composant `BroadcasterSelector`

**Props:**
- `value`: `{ name: string, logo_url: string | null }` ou `null`
- `onChange`: callback avec broadcaster sélectionné
- `sportId`, `leagueId`, `eventDate`: pour les suggestions automatiques

**Interface:**
```text
┌─────────────────────────────────────────────────────┐
│ Diffuseur                                           │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🔍 Rechercher un diffuseur...                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Suggestions automatiques (basées sur les contrats) │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Logo] Canal+         [Badge: Ligue 1]  [Auto]  │ │
│ │ [Logo] beIN Sports    [Badge: Sport]            │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Tous les diffuseurs                                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │ [Logo] DAZN                                     │ │
│ │ [Logo] RMC Sport                                │ │
│ │ ...                                             │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Modification de `CatalogPage.tsx`

Remplacer les lignes 546-566 (champs texte broadcaster) par :

```text
<BroadcasterSelector
  value={editForm.broadcaster ? {
    name: editForm.broadcaster,
    logo_url: editForm.broadcaster_logo_url
  } : null}
  onChange={(b) => setEditForm(prev => ({
    ...prev,
    broadcaster: b?.name || '',
    broadcaster_logo_url: b?.logo_url || ''
  }))}
  sportId={selectedEvent?.sport_id}
  leagueId={selectedEvent?.league_id}
  eventDate={selectedEvent?.event_date}
/>
```

## Points d'attention

1. **Performance** : Le hook met en cache les suggestions pour éviter des requêtes multiples
2. **UX** : Les suggestions automatiques apparaissent en premier avec un badge explicatif
3. **Fallback** : Si aucun contrat ne correspond, afficher "Aucune suggestion" et permettre la sélection manuelle
4. **Compatibilité** : Les événements existants avec texte libre restent fonctionnels
