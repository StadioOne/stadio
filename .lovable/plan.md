

# Plan : Clarifier le libellé du bouton dans la page Catalogue

## Contexte

Dans la page Catalogue (`/catalog`), le bouton de promotion affiche actuellement "Publier vers Événements". Cela porte à confusion car :
- L'action ne **publie pas** réellement l'événement
- L'événement est simplement envoyé vers la page Événements avec le statut **draft** (brouillon)
- La publication effective se fait manuellement depuis la page Événements

## Modification proposée

Renommer le bouton de **"Publier vers Événements"** à **"Envoyer vers Événements"** pour être cohérent avec le composant `CatalogTab.tsx` et refléter l'action réelle.

Également, modifier le message de succès pour être plus clair.

## Fichiers à modifier

| Fichier | Ligne | Modification |
|---------|-------|--------------|
| `src/pages/CatalogPage.tsx` | ~904 | "Publier vers Événements" → "Envoyer vers Événements" |
| `src/pages/CatalogPage.tsx` | ~234 | Message toast de succès (optionnel) |

## Détail des changements

### Bouton d'action (ligne 904)

**Avant :**
```tsx
Publier vers Événements
```

**Après :**
```tsx
Envoyer vers Événements
```

### Message de succès (ligne 234)

Le message actuel "Événement envoyé vers la page Événements" est déjà correct et cohérent avec le nouveau libellé du bouton.

## Résultat attendu

- Le bouton affichera clairement qu'il s'agit d'un **envoi** vers la page Événements, pas d'une publication directe
- Cohérence avec le composant `CatalogTab.tsx` qui utilise déjà "Envoyer vers Événements"
- L'utilisateur comprendra qu'il devra ensuite publier l'événement depuis la page Événements

