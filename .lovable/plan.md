

# Plan : Refonte UX/UI de la page Evenements

## Constat actuel

La page Evenements presente plusieurs problemes d'ergonomie :
- Les **stats** sont de simples lignes de texte sans hierarchie visuelle -- difficile de lire les chiffres d'un coup d'oeil
- Les **filtres** s'etalent sur 2 lignes avec des pills et selects melanges -- dense et peu lisible
- Le panneau de detail s'ouvre dans un **Sheet lateral etroit** (comme l'ancien Catalogue) -- pas assez d'espace pour l'edition
- Les **EventCards** en mode grille montrent beaucoup d'infos mais sans hierarchie claire
- La pagination est basique et ne montre pas le nombre total d'elements

## Solution proposee

### 1. Stats en cartes visuelles

Remplacer les lignes de stats inline par des **KPI cards** avec un design plus visuel (comme le Dashboard) :
- 4 cartes principales : Total, Publies, En direct (avec pulse), Brouillons
- Ligne secondaire compacte pour les stats temporelles (A venir, En cours, Termines)
- Chaque carte cliquable pour filtrer directement

### 2. Barre de filtres repensee

Reorganiser les filtres en une seule ligne compacte et claire :
- Barre de recherche a gauche
- Selecteurs de statut sous forme de **Tabs** au lieu de pills (plus lisible)
- Filtres secondaires (sport, ligue, temporel) dans un panneau "Filtres avances" pliable
- Toggle Live et Epingles restent accessibles en permanence
- Vue grille/liste a droite

### 3. EventCard amelioree

Ameliorer les cartes pour une meilleure lisibilite :
- Image plus grande avec overlay gradient ameliore
- Informations structurees : date en haut a gauche, statut en haut a droite
- Zone basse avec titre, equipes et infos de prix plus lisibles
- Actions rapides au survol dans un overlay semi-transparent

### 4. EventDetailPanel en plein ecran (comme le Catalogue)

Transformer le `Sheet` lateral en `Dialog` plein ecran avec layout 2 colonnes, reprenant le meme pattern que le configurateur Catalogue :

```text
+----------------------------------------------------------------------+
|  < Retour                  Detail de l'evenement          [Actions]  |
+----------------------------------------------------------------------+
|                              |                                        |
|  PREVIEW (40%)              |  EDITION (60%)                         |
|                              |                                        |
|  +------------------------+ |  [Infos] [Editorial] [Geo] [Prix]     |
|  |                        | |                                        |
|  |    Image poster        | |  -- Onglet Infos (lecture seule) --    |
|  |    ou vignette         | |  Titre API, Description, Sport, Ligue  |
|  |                        | |  Equipes, Date, Lieu                   |
|  +------------------------+ |                                        |
|                              |  -- Onglet Editorial --               |
|  Equipe A vs Equipe B      |  Titre personnalise                    |
|  Football - La Liga         |  Description personnalisee             |
|  06/02/2026 21:00           |  URL image personnalisee               |
|                              |                                        |
|  Statut : Publie            |  -- Onglet Geo --                      |
|  Prix : 9.99 EUR            |  Pays autorises / bloques              |
|  Tier : Gold                |                                        |
|                              |  -- Onglet Prix --                     |
|                              |  Surcharge manuelle (switch)           |
|                              |  Prix / Tier manuels                   |
|                              |  Recalcul automatique                  |
+----------------------------------------------------------------------+
|  [Archiver]        [Publier/Depublier]  [Enregistrer]               |
+----------------------------------------------------------------------+
```

### 5. Pagination amelioree

Ajouter un compteur "Affichage X-Y sur Z resultats" a cote de la pagination et ameliorer la navigation pour les grands ensembles de donnees.

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/pages/EventsPage.tsx` | Restructuration du layout general avec les nouvelles sections |
| `src/components/events/EventsStats.tsx` | Redesign en cartes KPI cliquables |
| `src/components/events/EventFilters.tsx` | Reorganisation en tabs + filtres avances pliables |
| `src/components/events/EventCard.tsx` | Amelioration du design visuel et de la hierarchie d'infos |
| `src/components/events/EventDetailPanel.tsx` | Transformation Sheet vers Dialog plein ecran 2 colonnes avec Tabs |

## Details techniques

### EventsStats.tsx -- Cartes KPI

Les stats passent de simples lignes a des cartes structurees :
- Grille de 4 colonnes pour les stats principales (total, publies, live, brouillons)
- Chaque carte affiche : icone, valeur grande, label, et couleur thematique
- La carte "Live" integre le pulse animation
- Les stats temporelles restent en ligne compacte en dessous
- Ajout d'un `onClick` sur chaque carte pour appliquer le filtre correspondant

### EventFilters.tsx -- Tabs + filtres avances

- Remplacement des pills statut par un composant `Tabs` natif de shadcn (Tous / Brouillon / Publie / Archive)
- Les filtres secondaires (sport, ligue, temporel, live, epingled) sont regroupes dans un panneau `Collapsible` "Filtres avances"
- La recherche et le toggle vue restent toujours visibles
- Un badge compteur sur "Filtres avances" indique le nombre de filtres actifs

### EventCard.tsx -- Ameliorations visuelles

- Augmentation du ratio de l'image (de aspect-video a plus grand)
- Le prix s'affiche en bas a droite avec un fond semi-transparent
- Le tier s'affiche sous forme de badge couleur integre a l'image
- Les badges Live/Pinned sont repositionnes pour moins de chevauchement
- Animation d'entree plus fluide

### EventDetailPanel.tsx -- Dialog plein ecran

Transformation complete identique au configurateur Catalogue :
- `Sheet` remplace par `Dialog` avec `DialogContent` en `max-w-[95vw] h-[95vh]`
- Layout flex 2 colonnes (40/60)
- Colonne gauche : preview avec image, metadonnees, statut, prix actuel
- Colonne droite : 4 onglets (Infos, Editorial, Geo, Tarification) via `Tabs`
- Footer sticky avec actions (Archiver, Supprimer, Publier/Depublier, Enregistrer)
- Responsive : empilement vertical sous 1024px

### EventsPage.tsx -- Orchestration

- Integration des props `onClickStat` dans `EventsStats` pour filtrage rapide
- Mise a jour du compteur de pagination "X-Y sur Z"
- Pas de changement dans la logique metier (mutations, hooks, etc.)

## Ce qui ne change PAS

- Les hooks de donnees (`useEvents`, `useEventsStats`, `useEventMutations`)
- La logique metier (publish, unpublish, archive, delete, pricing)
- Le composant `DeleteEventDialog`
- Les badges existants (`StatusBadge`, `TierBadge`, `LiveBadge`, etc.)
- Le composant `EventRow` (vue liste) -- ameliorations mineures seulement
- Le composant `CountryTagsInput`

