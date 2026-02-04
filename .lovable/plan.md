
# Plan : Correction de la double notification lors de la publication d'un événement

## Problème identifié

Lors de la publication d'un événement depuis le configurateur du catalogue, l'utilisateur voit **deux notifications** (toasts) qui apparaissent :

1. **"Événement mis à jour"** - de la mutation `updateEventMutation`
2. **"Événement envoyé vers la page Événements"** - de la mutation `promoteToDraftMutation`

Cela crée de la confusion car l'utilisateur peut interpréter la première notification comme une erreur, surtout si les deux apparaissent rapidement.

## Cause technique

```text
handleSaveAndPromote()
    │
    ├── 1. updateEventMutation.mutateAsync()
    │       └── onSuccess → toast.success("Événement mis à jour") ❌
    │
    └── 2. promoteToDraftMutation.mutateAsync()
            └── onSuccess → toast.success("Événement envoyé...") ✓
```

Les deux mutations ont leurs propres callbacks `onSuccess` qui affichent des toasts. Même en utilisant `mutateAsync()` (qui attend la fin), les callbacks sont toujours déclenchés.

## Solution proposée

Modifier la logique `handleSaveAndPromote` pour :
1. **Supprimer le toast** de `updateEventMutation` quand appelé dans le contexte de "save and promote"
2. Afficher **un seul toast** à la fin de l'opération complète

### Approche technique

Utiliser un flag de contexte ou modifier les handlers pour distinguer les deux cas d'usage :
- **Enregistrer seul** → affiche "Événement mis à jour"
- **Enregistrer + Promouvoir** → affiche uniquement "Événement envoyé vers la page Événements"

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/CatalogPage.tsx` | Refactoriser les mutations pour un seul toast lors de la promotion |
| `src/components/api-sports/CatalogTab.tsx` | Appliquer la même correction |

## Implémentation détaillée

### Option retenue : Mutation silencieuse avec try/catch

Remplacer l'appel `mutateAsync` par une version silencieuse qui ne déclenche pas le toast :

```typescript
const handleSaveAndPromote = async () => {
  if (!selectedEvent) return;

  try {
    // 1. Mise à jour silencieuse (sans toast)
    const { error: updateError } = await supabase
      .from('events')
      .update({
        override_title: editForm.override_title || null,
        override_description: editForm.override_description || null,
        override_image_url: editForm.override_image_url || null,
        broadcaster: editForm.broadcaster || null,
        broadcaster_logo_url: editForm.broadcaster_logo_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedEvent.id);

    if (updateError) throw updateError;

    // 2. Promotion vers draft
    await promoteToDraftMutation.mutateAsync(selectedEvent.id);
    
    // Le toast de succès est géré par promoteToDraftMutation.onSuccess
    
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Erreur lors de la publication');
  }
};
```

Cette approche :
- N'utilise PAS `updateEventMutation.mutateAsync()` pour éviter son toast
- Fait l'update directement avec Supabase
- Garde le toast final de `promoteToDraftMutation`
- Gère les erreurs avec un seul message

## Changements UI

| Avant | Après |
|-------|-------|
| Toast 1: "Événement mis à jour" | (rien) |
| Toast 2: "Événement envoyé vers la page Événements" | Toast unique: "Événement envoyé vers la page Événements" |

## Tests à effectuer

1. Ouvrir un événement du catalogue
2. Modifier le titre ou la description
3. Cliquer sur "Publier vers Événements"
4. Vérifier qu'**un seul toast** de succès apparaît
5. Vérifier que l'événement apparaît bien dans la page Événements avec le statut "draft"
