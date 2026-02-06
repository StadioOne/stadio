

# Plan : Ajout d'une vignette Matchday Card dans le configurateur Catalogue

## Objectif

Ajouter un second type d'image dans l'onglet "Image" du configurateur : une **vignette Matchday** au style similaire a l'image de reference (NFL Sunday Ticket). Cette image sera generee par l'IA avec un design minimaliste montrant les logos/couleurs des deux equipes face-a-face, dans un format paysage (16:9), utilisable comme vignette dans l'application utilisateur.

## Schema de donnees

### Migration : ajout colonne `thumbnail_url`

Ajout d'une colonne `thumbnail_url` dans la table `events` pour stocker cette seconde image independamment du poster principal (`override_image_url`).

```sql
ALTER TABLE public.events ADD COLUMN thumbnail_url TEXT;
```

## Modifications

### Fichier : `src/pages/CatalogPage.tsx`

**1. Interface CatalogEvent** : ajout de `thumbnail_url: string | null`

**2. Requete des logos equipes** : Lorsqu'un evenement est ouvert, recuperation des logos depuis la table `teams` via `home_team_id` et `away_team_id` pour les afficher comme reference visuelle dans la section vignette.

**3. Etat du formulaire** : ajout de `thumbnail_url` dans `editForm`, plus un etat `isGeneratingThumbnail` et un `thumbnailPrompt`.

**4. Onglet Image reorganise** : Deux sous-sections separees par un separateur :

```text
┌─── Onglet Image ────────────────────────────────────────────┐
│                                                              │
│  ── Image principale (Poster cinématique) ──                │
│  [IA] [URL]                                                 │
│  Prompt: [_______________________________]                  │
│  [Générer le poster]                                        │
│  [Aperçu poster 2:3]                                        │
│                                                              │
│  ─────────── Séparateur ───────────                         │
│                                                              │
│  ── Vignette Matchday ──                                    │
│  "Image simplifiée avec les identités des deux équipes"     │
│                                                              │
│  ┌─────────┐     VS     ┌─────────┐   ← Logos récupérés    │
│  │ Logo    │            │ Logo    │     de la table teams   │
│  │ Home    │            │ Away    │                          │
│  └─────────┘            └─────────┘                         │
│                                                              │
│  Prompt: [_______________________________]                  │
│  [Générer la vignette IA]  [URL manuelle]                   │
│  [Aperçu vignette 16:9]                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**5. Prompt de generation de la vignette** : Un template specifique inspire de l'image de reference :

```text
Create a clean, modern matchday card image (16:9 landscape ratio) for a sports event.

Layout:
- Split background with two team identity colors (diagonal or vertical split)
- Left side: visual representation of {{HOME_TEAM}} with their team emblem/crest style
- Right side: visual representation of {{AWAY_TEAM}} with their team emblem/crest style
- Both sides feature large, prominent team emblems/crests
- Bottom overlay: event badge with "À venir" or competition name

Teams: {{HOME_TEAM}} vs {{AWAY_TEAM}}
Competition: {{LEAGUE}}
Date: {{EVENT_DATE}}

Style: bold colors, clean geometric shapes, professional sports broadcast aesthetic, similar to NFL Sunday Ticket / YouTube TV matchday cards.
No real logos, no watermarks. Use stylized crests inspired by each team's identity.
```

**6. Fonction `handleGenerateThumbnail`** : Appel a la meme Edge Function `admin-ai-image` avec le prompt vignette. Le resultat est stocke dans `editForm.thumbnail_url`.

**7. Sauvegarde** : `handleSaveOnly` et `handleSaveAndPromote` incluront `thumbnail_url` dans les updates envoyees a la base.

**8. Preview colonne gauche** : Affichage de la vignette sous le poster principal en format 16:9, plus petit. Ajout d'un badge de completion "Vignette" dans les indicateurs.

**9. Liste du catalogue** : Ajout d'un badge "Vignette OK" quand `thumbnail_url` est renseigne.

## Ce qui ne change PAS

- L'Edge Function `admin-ai-image` (reutilisee avec un prompt different)
- Le bucket de stockage `event-images`
- Les onglets Contenu, Diffusion et Tarification
- La logique de promotion vers draft

