
# Plan : Ajouter la suppression d'événements dans le Catalogue

## Objectif
Permettre aux utilisateurs de supprimer un événement depuis la page Catalogue, avec une confirmation avant suppression pour éviter les erreurs.

## Emplacement de la fonctionnalité
La suppression sera accessible de deux façons :
1. **Dans la liste des événements** : Un bouton icône "Corbeille" sur chaque carte d'événement
2. **Dans le panneau de configuration (Sheet)** : Un bouton "Supprimer" en bas du formulaire

## Interface utilisateur

### 1. Bouton dans la liste
- Ajout d'un bouton avec l'icône `Trash2` à côté du bouton "Configurer" sur chaque carte
- Style `variant="ghost"` avec couleur destructive au survol
- Ouverture d'une modale de confirmation au clic

### 2. Bouton dans le Sheet de configuration  
- Ajout d'un bouton "Supprimer" avec l'icône `Trash2` en dessous des boutons "Enregistrer" et "Publier"
- Style `variant="destructive"` pour une visibilité claire
- Même modale de confirmation

### 3. Modale de confirmation
- Titre : "Supprimer l'événement"
- Message : Affichage du nom de l'événement pour éviter les erreurs
- Boutons : "Annuler" et "Supprimer" (rouge)

---

## Détails techniques

### Modifications de `src/pages/CatalogPage.tsx`

**1. Nouveaux imports**
```typescript
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
```

**2. Nouvel état pour la suppression**
```typescript
const [eventToDelete, setEventToDelete] = useState<CatalogEvent | null>(null);
```

**3. Nouvelle mutation de suppression**
```typescript
const deleteEventMutation = useMutation({
  mutationFn: async (eventId: string) => {
    // Supprimer d'abord le pricing associé
    await supabase
      .from('event_pricing')
      .delete()
      .eq('event_id', eventId);
    
    // Puis supprimer l'événement
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);
    
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['catalog-events'] });
    setEventToDelete(null);
    setSelectedEvent(null);
    toast.success('Événement supprimé');
  },
  onError: (error) => {
    toast.error(error instanceof Error ? error.message : 'Erreur de suppression');
  },
});
```

**4. Fonction de confirmation**
```typescript
const handleDeleteConfirm = () => {
  if (eventToDelete) {
    deleteEventMutation.mutate(eventToDelete.id);
  }
};
```

**5. Bouton dans chaque carte d'événement (ligne ~404)**
Ajouter à côté du bouton "Configurer" :
```tsx
<Button 
  variant="ghost" 
  size="sm"
  className="text-muted-foreground hover:text-destructive"
  onClick={(e) => { 
    e.stopPropagation(); 
    setEventToDelete(event); 
  }}
>
  <Trash2 className="h-4 w-4" />
</Button>
```

**6. Bouton dans le Sheet (ligne ~559)**
Ajouter avant les boutons d'action actuels :
```tsx
<Button
  variant="destructive"
  size="sm"
  onClick={() => setEventToDelete(selectedEvent)}
  className="w-full"
>
  <Trash2 className="h-4 w-4 mr-2" />
  Supprimer l'événement
</Button>
<Separator className="my-2" />
```

**7. Modale de confirmation (après le Sheet)**
```tsx
<AlertDialog 
  open={!!eventToDelete} 
  onOpenChange={(open) => !open && setEventToDelete(null)}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Supprimer l'événement</AlertDialogTitle>
      <AlertDialogDescription>
        Êtes-vous sûr de vouloir supprimer l'événement "
        {eventToDelete?.override_title || eventToDelete?.api_title || 
         `${eventToDelete?.home_team} vs ${eventToDelete?.away_team}`}" ?
        Cette action est irréversible.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Annuler</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDeleteConfirm}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        disabled={deleteEventMutation.isPending}
      >
        {deleteEventMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4 mr-2" />
        )}
        Supprimer
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Résumé des fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `src/pages/CatalogPage.tsx` | Ajout de la fonctionnalité complète de suppression |

## Comportement attendu

1. L'utilisateur clique sur l'icône corbeille (liste) ou le bouton "Supprimer" (Sheet)
2. Une modale de confirmation s'affiche avec le nom de l'événement
3. Si confirmé, l'événement et son pricing associé sont supprimés
4. Un toast de succès s'affiche et la liste se met à jour
5. Si annulé, la modale se ferme sans action

