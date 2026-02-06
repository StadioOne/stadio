
# Plan : Refonte du configurateur Catalogue en pleine page

## Constat

Le configurateur d'evenement s'ouvre dans un `Sheet` (panneau lateral de 500px). C'est trop etroit pour le contenu riche (prompt IA, preview image, tarification, diffuseur). L'utilisateur doit scroller beaucoup et le formulaire est lineaire.

## Solution

Remplacer le `Sheet` par une page/vue plein ecran en overlay (Dialog fullscreen) avec un layout en deux colonnes :
- **Colonne gauche** : Preview visuelle de l'evenement (image, infos cles)
- **Colonne droite** : Formulaire d'edition organise en sections avec Tabs

## Nouvelle architecture visuelle

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Retour au catalogue          Configurer l'événement          [Supprimer] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─── PREVIEW (40%) ─────────────┐  ┌─── EDITION (60%) ──────────────────┐ │
│  │                                │  │                                     │ │
│  │  ┌─────────────────────────┐  │  │  [Contenu] [Image] [Diffusion] [Prix]│
│  │  │                         │  │  │                                     │ │
│  │  │    Image poster 2:3     │  │  │  ── Onglet Contenu ──              │ │
│  │  │    (ou placeholder)     │  │  │                                     │ │
│  │  │                         │  │  │  Titre personnalise:               │ │
│  │  │                         │  │  │  [________________________]        │ │
│  │  └─────────────────────────┘  │  │                                     │ │
│  │                                │  │  Description:         [Generer IA] │ │
│  │  Celta Vigo vs Osasuna       │  │  [________________________]        │ │
│  │  Football · La Liga           │  │  [________________________]        │ │
│  │  06/02/2026 21:00             │  │                                     │ │
│  │  Estadio Abanca-Balaidos     │  │  ── Onglet Image ──                │ │
│  │                                │  │  [IA] [URL]                        │ │
│  │  Status: En attente           │  │  Prompt: [___________________]     │ │
│  │                                │  │  [Generer]                         │ │
│  │                                │  │                                     │ │
│  └────────────────────────────────┘  │  ── Onglet Diffusion ──           │ │
│                                       │  Diffuseur: [Selector]            │ │
│                                       │                                     │ │
│                                       │  ── Onglet Prix ──                │ │
│                                       │  Prix: [___] Tier: [___]          │ │
│                                       │  "Vide = calcul auto"             │ │
│                                       └─────────────────────────────────────┘ │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                              [Enregistrer]  [Envoyer vers Evenements →]     │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Fichier a modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/CatalogPage.tsx` | Remplacer le `Sheet` par un `Dialog` plein ecran avec layout 2 colonnes et onglets |

Aucun nouveau fichier necessaire -- tout reste dans `CatalogPage.tsx` pour garder la simplicite actuelle.

## Details techniques

### 1. Remplacement Sheet → Dialog fullscreen

Le `Sheet` sera remplace par un `Dialog` avec `DialogContent` en plein ecran :

```typescript
<Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
  <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full p-0 gap-0">
    ...
  </DialogContent>
</Dialog>
```

### 2. Layout deux colonnes

```typescript
<div className="flex h-full">
  {/* Colonne gauche - Preview */}
  <div className="w-[40%] border-r bg-muted/30 p-6 flex flex-col">
    {/* Image preview en ratio 2:3 */}
    {/* Infos cles de l'evenement */}
  </div>

  {/* Colonne droite - Edition */}
  <div className="flex-1 flex flex-col">
    {/* Header avec titre */}
    {/* Tabs: Contenu | Image | Diffusion | Tarification */}
    {/* Footer sticky avec boutons d'action */}
  </div>
</div>
```

### 3. Organisation en onglets (Tabs)

4 onglets pour structurer le formulaire :

- **Contenu** : Titre personnalise + Description (avec bouton IA)
- **Image** : Bascule IA/URL, prompt modifiable, preview, bouton generer
- **Diffusion** : Selecteur de diffuseur avec suggestions
- **Tarification** : Prix manuel + Tier avec explication du calcul auto

### 4. Preview dynamique (colonne gauche)

- Image du poster avec aspect-ratio 2:3 (ou placeholder si pas d'image)
- Titre de l'evenement (override ou api_title)
- Sport + Ligue en badges
- Date et heure formatees
- Lieu (venue)
- Badge "En attente" pour le statut catalogue
- Badges d'avancement : Description OK, Image OK, Broadcaster OK

### 5. Footer sticky

Barre d'actions fixe en bas de la colonne droite :

```typescript
<div className="border-t p-4 flex items-center justify-between mt-auto">
  <Button variant="destructive" variant="ghost" onClick={...}>
    <Trash2 /> Supprimer
  </Button>
  <div className="flex gap-3">
    <Button variant="outline" onClick={handleSaveOnly}>Enregistrer</Button>
    <Button onClick={handleSaveAndPromote}>
      <Send /> Envoyer vers Evenements
    </Button>
  </div>
</div>
```

### 6. Tarification fonctionnelle

La section tarification reste identique en logique :
- Champ prix manuel (number, step 0.01)
- Selecteur de tier (Bronze/Silver/Gold) avec `TierBadge`
- Message explicatif "Laissez vide pour le calcul automatique"
- Lors de la promotion, si des valeurs sont renseignees, `is_manual_override` est active dans `event_pricing`

### 7. Responsivite

Sur ecrans plus petits (< 1024px), le layout passe en colonne unique :
- La preview se reduit a un bandeau compact en haut
- Le formulaire prend toute la largeur

## Ce qui ne change PAS

- Toute la logique metier (mutations, queries, generation IA)
- Le composant `BroadcasterSelector`
- La modale de confirmation de suppression `AlertDialog`
- La liste des evenements du catalogue (partie gauche de la page)
- Les filtres et stats en haut de page
