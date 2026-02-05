
# Plan : Amélioration de la gestion des événements

## Objectif

Ajouter deux nouvelles fonctionnalités à la page Événements :

1. **Statut temporel dynamique** : "À venir", "En cours", "Terminé" basé sur `event_date`
2. **Actions Archiver et Supprimer** : accessibles depuis les menus d'actions de chaque événement

## Architecture actuelle vs future

```text
ACTUEL:
┌─────────────────────────────────────┐
│ Statut éditorial uniquement:        │
│ [Brouillon] [Publié] [Archivé]      │
│                                     │
│ Actions disponibles:                │
│ - Publier / Dépublier               │
│ - Démarrer/Arrêter le direct        │
│ - Épingler / Désépingler            │
└─────────────────────────────────────┘

FUTUR:
┌─────────────────────────────────────────────────────────────┐
│ Double affichage des statuts:                               │
│                                                             │
│ Statut éditorial: [Brouillon] [Publié] [Archivé]           │
│ Statut temporel:  [À venir]   [En cours] [Terminé]         │
│                                                             │
│ Nouvelles actions:                                          │
│ - Archiver (passage en status = 'archived')                │
│ - Supprimer (soft delete ou suppression définitive)        │
└─────────────────────────────────────────────────────────────┘
```

## Logique du statut temporel

Le statut temporel sera calculé dynamiquement côté client :

| Statut | Condition |
|--------|-----------|
| **À venir** | `event_date > now()` |
| **En cours** | `event_date <= now() AND event_date + durée > now()` (ou `is_live = true`) |
| **Terminé** | `event_date + durée < now()` |

Pour simplifier (pas de durée stockée), on utilisera :
- **À venir** : Date de l'événement dans le futur
- **En cours** : `is_live = true` OU événement dans les dernières 3h
- **Terminé** : Date passée de plus de 3h et `is_live = false`

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/components/events/TimeStatusBadge.tsx` | Badge pour afficher À venir / En cours / Terminé |
| `src/components/events/DeleteEventDialog.tsx` | Modal de confirmation de suppression |

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/hooks/useEvents.ts` | Ajouter filtre `timeStatus` (upcoming/ongoing/finished) |
| `src/hooks/useEventMutations.ts` | Ajouter `useArchiveEvent()` et `useDeleteEvent()` |
| `src/components/events/EventFilters.tsx` | Ajouter pills pour filtrer par statut temporel |
| `src/components/events/EventCard.tsx` | Afficher TimeStatusBadge + actions Archiver/Supprimer |
| `src/components/events/EventRow.tsx` | Afficher TimeStatusBadge + actions Archiver/Supprimer |
| `src/components/events/EventDetailPanel.tsx` | Ajouter boutons Archiver/Supprimer en footer |
| `src/components/events/EventsStats.tsx` | Ajouter stats pour À venir / En cours / Terminé |
| `src/pages/EventsPage.tsx` | Intégrer nouveaux handlers et état pour la modal de suppression |

## Détails techniques

### 1. Composant `TimeStatusBadge.tsx`

```typescript
type TimeStatus = 'upcoming' | 'ongoing' | 'finished';

function getTimeStatus(eventDate: string, isLive: boolean): TimeStatus {
  const now = new Date();
  const date = new Date(eventDate);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  if (isLive) return 'ongoing';
  if (date > now) return 'upcoming';
  if (date > threeHoursAgo) return 'ongoing';
  return 'finished';
}

// Badges avec couleurs:
// À venir: bleu (bg-blue-500/10 text-blue-600)
// En cours: vert pulsant (bg-green-500/10 text-green-600 animate-pulse)
// Terminé: gris (bg-muted text-muted-foreground)
```

### 2. Hook `useArchiveEvent`

```typescript
export function useArchiveEvent() {
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase
        .from('events')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', eventId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      toast.success('Événement archivé');
    }
  });
}
```

### 3. Hook `useDeleteEvent`

```typescript
export function useDeleteEvent() {
  return useMutation({
    mutationFn: async (eventId: string) => {
      // Suppression en cascade : pricing d'abord, puis événement
      await supabase.from('event_pricing').delete().eq('event_id', eventId);
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      toast.success('Événement supprimé');
    }
  });
}
```

### 4. Mise à jour des filtres

Ajout d'un nouveau groupe de pills dans `EventFilters.tsx` :

```typescript
const TIME_STATUS_OPTIONS = [
  { value: 'all', label: 'Tous', icon: Clock },
  { value: 'upcoming', label: 'À venir', icon: CalendarClock },
  { value: 'ongoing', label: 'En cours', icon: Play },
  { value: 'finished', label: 'Terminés', icon: CheckCircle2 },
];
```

### 5. Mise à jour du menu d'actions

Dans `EventCard.tsx` et `EventRow.tsx` :

```typescript
<DropdownMenuSeparator />

<DropdownMenuItem onClick={() => onArchive?.(event.id)}>
  <Archive className="h-4 w-4 mr-2" />
  Archiver
</DropdownMenuItem>

<DropdownMenuItem 
  onClick={() => onDelete?.(event.id)}
  className="text-destructive focus:text-destructive"
>
  <Trash2 className="h-4 w-4 mr-2" />
  Supprimer
</DropdownMenuItem>
```

### 6. Modal de confirmation

```typescript
<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Supprimer l'événement ?</AlertDialogTitle>
      <AlertDialogDescription>
        Cette action est irréversible. L'événement "{eventToDelete?.title}" 
        et toutes ses données associées seront définitivement supprimés.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Annuler</AlertDialogCancel>
      <AlertDialogAction 
        onClick={confirmDelete}
        className="bg-destructive text-destructive-foreground"
      >
        Supprimer
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Mise à jour des statistiques

`EventsStats.tsx` affichera deux lignes :

```text
Ligne 1 (Éditorial): Total | Publiés | Brouillons | Archivés
Ligne 2 (Temporel):  À venir | En cours | Terminés
```

## Interface utilisateur finale

```text
┌──────────────────────────────────────────────────────────────────────┐
│  Événements                                                          │
├──────────────────────────────────────────────────────────────────────┤
│  Stats: [120 Total] [45 Publiés] [8 Live] [67 Brouillons]           │
│         [52 À venir] [3 En cours] [65 Terminés]                     │
├──────────────────────────────────────────────────────────────────────┤
│  Filtres:                                                            │
│  Statut: [Tous] [Brouillon] [Publié] [Archivé]                      │
│  Temps:  [Tous] [À venir] [En cours] [Terminés]                     │
│  + Sport, Ligue, Live, Épinglés                                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │  [Football] │  │  [Football] │  │  [Tennis]   │                  │
│  │  [À venir]  │  │  [En cours] │  │  [Terminé]  │                  │
│  │  [Publié]   │  │  [Publié]   │  │  [Brouillon]│                  │
│  │  PSG vs OM  │  │  Lyon vs... │  │  Nadal vs...│                  │
│  │  [...menu]  │  │  [...menu]  │  │  [...menu]  │                  │
│  │  - Dépublier│  │  - Dépublier│  │  - Publier  │                  │
│  │  - Archiver │  │  - Archiver │  │  - Archiver │                  │
│  │  - Supprimer│  │  - Supprimer│  │  - Supprimer│                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Sécurité

- La suppression nécessite une confirmation explicite via AlertDialog
- Seuls les événements non-publiés ou archivés peuvent être supprimés (optionnel selon besoin)
- L'archivage est réversible (un événement archivé peut être remis en brouillon)

## Tests à effectuer

1. Vérifier l'affichage du badge temporel sur les cartes et lignes
2. Tester le filtre par statut temporel
3. Archiver un événement et vérifier le changement de statut
4. Supprimer un événement et confirmer la suppression
5. Vérifier que les stats se mettent à jour correctement
