
# Plan : API Publique pour accès aux Events

## Objectif
Créer une Edge Function publique sécurisée qui expose les événements publiés à une autre application Lovable, en suivant le même pattern que `public-analytics-ingest`.

## Architecture proposée

```text
┌─────────────────────┐         ┌──────────────────────────┐         ┌─────────────────┐
│  Autre App Lovable  │──────▶  │  public-events-api       │──────▶  │  events_published│
│  (Client externe)   │  HTTPS  │  (Edge Function)         │  SELECT │  (Vue Supabase)  │
└─────────────────────┘         └──────────────────────────┘         └─────────────────┘
         │                                │
         │                                │
         ▼                                ▼
   Header requis:                 - Validation API Key
   x-stadio-api-key              - Rate limiting (100/min)
                                 - Filtres optionnels
```

## Endpoints disponibles

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/public-events-api` | Liste les événements publiés |
| GET | `/public-events-api?id=xxx` | Détail d'un événement |
| GET | `/public-events-api?sport=football` | Filtrer par sport |
| GET | `/public-events-api?is_live=true` | Événements en direct |
| GET | `/public-events-api?limit=20&offset=0` | Pagination |

## Sécurité

1. **Clé API dédiée** : Nouveau secret `STADIO_PUBLIC_API_KEY` différent de la clé analytics
2. **Rate limiting** : 100 requêtes/minute par IP+clé
3. **Lecture seule** : Uniquement des données publiques via la vue `events_published`
4. **CORS configuré** : Permet les appels cross-origin depuis l'autre app

## Fichiers à créer/modifier

### 1. Nouveau secret
- `STADIO_PUBLIC_API_KEY` : Clé API partagée avec l'autre application

### 2. Nouvelle Edge Function
`supabase/functions/public-events-api/index.ts`
- Validation de la clé API via header `x-stadio-api-key`
- Rate limiting réutilisant `_shared/rate-limit.ts`
- Query sur la vue `events_published` avec filtres optionnels
- Réponse JSON paginée

### 3. Configuration
`supabase/config.toml` : Ajouter la nouvelle fonction avec `verify_jwt = false`

### 4. Module partagé (optionnel)
`supabase/functions/_shared/public-api-auth.ts` : Validation générique pour APIs publiques

## Exemple d'utilisation côté client (autre app)

```typescript
const response = await fetch(
  'https://dnpnzmlemabyiyqfpcfs.supabase.co/functions/v1/public-events-api?limit=20&is_live=true',
  {
    headers: {
      'x-stadio-api-key': 'votre-cle-api-secrete',
      'Content-Type': 'application/json'
    }
  }
);

const { data, meta } = await response.json();
// data: tableau d'événements
// meta: { total, limit, offset, rate_limit_remaining }
```

## Format de réponse

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "event_date": "2026-01-30T20:00:00Z",
      "sport": "football",
      "league": "Ligue 1",
      "home_team": "PSG",
      "away_team": "OM",
      "is_live": false,
      "is_pinned": true,
      "override_title": "Le Classique",
      "computed_price": 14.99,
      "sport_name": "Football",
      "sport_icon": "⚽"
    }
  ],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "rate_limit_remaining": 95
  },
  "request_id": "req_xxx"
}
```

## Détails techniques

### Validation de la clé API
Réutilisation du pattern existant avec un nouveau header et secret :
- Header : `x-stadio-api-key`
- Secret : `STADIO_PUBLIC_API_KEY`

### Paramètres de requête supportés
| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | uuid | ID spécifique d'un événement |
| `sport` | string | Filtrer par nom de sport |
| `sport_id` | uuid | Filtrer par ID de sport |
| `league` | string | Filtrer par nom de ligue |
| `is_live` | boolean | Événements en direct |
| `is_pinned` | boolean | Événements épinglés |
| `date_from` | ISO date | Date minimum |
| `date_to` | ISO date | Date maximum |
| `limit` | number | Nombre max de résultats (défaut: 50, max: 100) |
| `offset` | number | Décalage pour pagination |

### Rate Limiting
- 100 requêtes par minute par combinaison IP + clé API
- Headers de réponse standards (`X-RateLimit-*`)
- Réponse 429 avec `Retry-After` si dépassé

## Étapes d'implémentation

1. Créer le secret `STADIO_PUBLIC_API_KEY` via l'outil de gestion des secrets
2. Créer `supabase/functions/_shared/public-api-auth.ts` pour la validation générique
3. Créer `supabase/functions/public-events-api/index.ts` avec toute la logique
4. Ajouter la configuration dans `supabase/config.toml`
5. Documenter l'utilisation pour l'autre application

