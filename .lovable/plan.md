
# Plan : Workflow Catalogue Multi-Sports

## Analyse de l'existant vs. Workflow souhaité

### Workflow actuel
```text
API-Sports --> Import direct --> Table events (draft) --> Page Events --> Publication
```

### Workflow souhaité
```text
API-Sports --> CATALOGUE (staging/config) --> Page Events (publié)
                    |
                    +-- Configuration: tarif, description, image, broadcaster
```

## Changements requis

### Phase 1 : Extension du schéma de données

**1.1 Ajouter le champ broadcaster à la table events**
```sql
ALTER TABLE public.events ADD COLUMN broadcaster TEXT;
ALTER TABLE public.events ADD COLUMN broadcaster_logo_url TEXT;
```

**1.2 Créer un statut "catalog" pour distinguer les événements en préparation**

Option A: Ajouter une valeur au enum `content_status`
```sql
ALTER TYPE content_status ADD VALUE 'catalog' BEFORE 'draft';
```

Cela donne le cycle: `catalog` -> `draft` -> `published` -> `archived`

- **catalog**: Importé depuis API, en attente de configuration (visible uniquement dans API-Sports)
- **draft**: Configuré, prêt pour publication (visible dans Events)
- **published**: Publié et visible aux utilisateurs finaux
- **archived**: Archivé

### Phase 2 : Mise à jour de l'Edge Function admin-api-sports-sync

**2.1 Ajouter action `import_games`**
```typescript
case 'import_games': {
  // Importer les matchs sélectionnés avec status = 'catalog'
  // Lier au sport_id, league_id appropriés
  // Retourner les IDs créés
}
```

### Phase 3 : Refonte de l'interface SportConfigPanel

**3.1 Onglet "Matchs" fonctionnel**

Structure de l'onglet Matchs:
```text
+----------------------------------------------------------+
|  [Sélection de ligue dropdown]  [Date de / Date à]       |
+----------------------------------------------------------+
|  Matchs disponibles depuis l'API:                         |
|  +------------------------------------------------------+ |
|  | [ ] PSG vs OM        | 15 fév 21:00 | Ligue 1       | |
|  | [x] Lyon vs Monaco   | 16 fév 17:00 | Ligue 1       | |
|  | [x] Real vs Barça    | 17 fév 21:00 | La Liga      | |
|  +------------------------------------------------------+ |
|                                                           |
|  [Importer X sélectionnés dans le Catalogue]              |
+----------------------------------------------------------+
```

**3.2 Onglet "Catalogue" (nouveau)**

Affiche les événements avec `status = 'catalog'` pour ce sport.
Permet de configurer chaque événement avant de l'envoyer vers Events.

```text
+----------------------------------------------------------+
|  CATALOGUE - Événements en préparation                   |
+----------------------------------------------------------+
| Lyon vs Monaco - 16 fév                                   |
| [Tarif: €___] [Tier: Bronze/Silver/Gold]                 |
| [Description: _________________________]                  |
| [Image URL: ___________________________]                  |
| [Broadcaster: Dropdown ou texte]                         |
|                                                           |
| [Envoyer vers Events (status: draft)]                    |
+----------------------------------------------------------+
```

### Phase 4 : Modifier la page Events

**4.1 Exclure les événements "catalog" de la page Events**

Dans `useEvents.ts`, ajouter un filtre par défaut:
```typescript
// Exclure les événements en "catalog" de la liste Events
if (!filters.status || filters.status === 'all') {
  query = query.neq('status', 'catalog');
}
```

Les événements n'apparaissent dans Events qu'une fois sortis du Catalogue.

### Phase 5 : Mise à jour du LeagueDetailPanel pour multi-sports

**5.1 Modifier pour utiliser admin-api-sports-sync**

Remplacer l'appel à `admin-api-football-sync` par `admin-api-sports-sync` avec le slug du sport en paramètre.

## Structure des fichiers à créer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| Migration SQL | Créer | Ajouter `broadcaster`, modifier enum |
| `supabase/functions/admin-api-sports-sync/index.ts` | Modifier | Ajouter action `import_games` |
| `src/components/api-sports/SportConfigPanel.tsx` | Modifier | Implémenter onglet Matchs |
| `src/components/api-sports/CatalogTab.tsx` | Créer | Nouvel onglet Catalogue |
| `src/components/api-sports/GamesTab.tsx` | Créer | Onglet matchs avec import |
| `src/hooks/useCatalogEvents.ts` | Créer | Hook pour gérer les events catalog |
| `src/hooks/useEvents.ts` | Modifier | Exclure status catalog |
| `src/lib/i18n.ts` | Modifier | Traductions catalogue |

## Ordre d'implémentation avec tests

### Étape 1: Migration base de données
- Ajouter colonnes broadcaster
- Ajouter valeur 'catalog' à l'enum
- **Test**: Vérifier schéma mis à jour

### Étape 2: Mise à jour Edge Function
- Ajouter action import_games avec status='catalog'
- **Test**: Appel API pour importer des matchs

### Étape 3: Onglet Matchs dans SportConfigPanel
- Interface de prévisualisation et sélection
- Bouton d'import vers catalogue
- **Test**: Sélectionner et importer des matchs

### Étape 4: Onglet Catalogue
- Liste des événements catalog
- Formulaire de configuration (prix, description, image, broadcaster)
- Action "Promouvoir vers Events"
- **Test**: Configurer un événement et le promouvoir

### Étape 5: Filtre Events page
- Exclure status=catalog de la page Events
- **Test**: Vérifier que seuls draft/published apparaissent

## Résumé du flux final

```text
1. API-Sports > Sélectionner sport > Onglet Matchs
   → Prévisualiser matchs disponibles
   → Sélectionner et importer vers Catalogue

2. API-Sports > Onglet Catalogue  
   → Voir événements importés (status=catalog)
   → Configurer: tarif, description, image, broadcaster
   → Promouvoir vers Events (status->draft)

3. Page Events
   → Voir événements draft/published uniquement
   → Publier les drafts pour les rendre visibles aux utilisateurs
```

## Questions techniques résolues

| Question | Réponse |
|----------|---------|
| Où stocker le catalogue? | Table events avec status='catalog' |
| Comment différencier catalogue vs events? | Nouveau status enum 'catalog' |
| Le broadcaster est-il une table liée? | Non, champ texte simple pour commencer |
| Comment tester? | Tests après chaque étape via l'UI |
