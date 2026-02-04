
# Plan : Génération de description IA avec Mistral AI

## Objectif

Ajouter un bouton "Générer avec IA" à côté du champ Description dans la page Catalogue. L'IA utilisera Mistral AI avec recherche web pour récupérer des informations contextuelles sur l'événement sportif et proposer une description engageante.

## Architecture technique

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (CatalogPage)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Description                           [✨ Générer avec IA]  │    │
│  │ ┌─────────────────────────────────────────────────────────┐ │    │
│  │ │ Textarea avec description générée...                   │ │    │
│  │ └─────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                               │                                     │
│                               ▼                                     │
│                    Appel Edge Function                              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Edge Function: admin-ai-description                     │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Reçoit les données de l'événement                                │
│ 2. Construit un prompt contextuel                                   │
│ 3. Appelle Mistral AI avec web_search tool activé                   │
│ 4. Retourne la description générée                                  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Mistral AI API                               │
├─────────────────────────────────────────────────────────────────────┤
│ Modèle: mistral-large-latest (avec web_search tool)                 │
│ Recherche web automatique pour contexte live                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Fichiers à créer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `supabase/functions/admin-ai-description/index.ts` | Créer | Edge Function pour appeler Mistral AI |
| `supabase/config.toml` | Modifier | Ajouter configuration de la fonction |
| `src/pages/CatalogPage.tsx` | Modifier | Ajouter bouton et logique de génération |
| Secret `MISTRAL_API_KEY` | Ajouter | Stocker la clé API fournie |

## Détails d'implémentation

### 1. Edge Function `admin-ai-description`

**Endpoint :** POST `/functions/v1/admin-ai-description`

**Input :**
```json
{
  "event": {
    "sport": "Football",
    "league": "Ligue 1",
    "home_team": "PSG",
    "away_team": "Olympique de Marseille",
    "event_date": "2024-03-15T21:00:00Z",
    "venue": "Parc des Princes",
    "round": "Journée 28"
  }
}
```

**Logique :**
1. Valider l'authentification admin
2. Construire un prompt avec le contexte de l'événement
3. Appeler Mistral AI avec le tool `web_search` pour obtenir des infos live
4. Parser et retourner la description

**Prompt système :**
```text
Tu es un rédacteur sportif expert. Génère une description engageante 
pour un événement sportif destinée à une plateforme de streaming.

La description doit :
- Être en français
- Contenir 2-3 phrases maximum (80-150 mots)
- Mentionner les enjeux du match si pertinent
- Être dynamique et attractive pour les spectateurs

Utilise la recherche web pour trouver des informations actuelles 
sur les équipes, leur forme récente, et les enjeux du match.
```

### 2. Modification de CatalogPage.tsx

**Ajout d'un bouton à côté du label Description :**

```text
┌────────────────────────────────────────────────────────────┐
│ Description                                                │
│ ┌──────────────────────────────────┐  ┌─────────────────┐  │
│ │                                  │  │ ✨ Générer IA   │  │
│ └──────────────────────────────────┘  └─────────────────┘  │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Textarea...                                            │ │
│ │                                                        │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

**États UI :**
- Idle : Bouton "Générer avec IA" avec icône sparkles
- Loading : Bouton désactivé avec spinner + "Génération..."
- Succès : Description insérée dans le textarea, toast de confirmation
- Erreur : Toast d'erreur, textarea inchangé

### 3. Appel API Mistral

```typescript
// Structure de l'appel Mistral avec web search
const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${MISTRAL_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'mistral-large-latest',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    tools: [{
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for current information'
      }
    }],
    tool_choice: 'auto',
    max_tokens: 500,
  }),
});
```

## Sécurité

- Edge Function protégée par authentification admin
- Clé API stockée en tant que secret Supabase (jamais exposée côté client)
- Rate limiting implicite via l'appel authentifié

## UX Flow

1. L'admin ouvre le sheet de configuration d'un événement
2. Il clique sur "Générer avec IA"
3. Spinner pendant 3-5 secondes (recherche web + génération)
4. La description apparaît dans le textarea
5. L'admin peut modifier le texte avant d'enregistrer
