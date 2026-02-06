

# Plan : Simplification de la tarification

## Constat

Le systeme actuel de tarification est surdimensionne :
- 3 tiers (Gold, Silver, Bronze) avec fourchettes de prix configurables (table `pricing_config`)
- Un algorithme de scoring complexe (ligue, pinned, live) dans l'Edge Function
- Un concept de "computed price vs manual override" avec toggle, 2 champs distincts
- Un onglet "Configuration" reserve au owner pour configurer les fourchettes par tier
- Un onglet "Historique" avec tracking granulaire des changements
- La meme logique dupliquee dans 3 endroits (Catalogue, Events, page Pricing)

Le besoin reel est bien plus simple : **un prix entre 0,99 et 5 EUR**, suggere par l'IA (Mistral), modifiable manuellement.

## Nouvelle logique

- **1 seul champ** : `price` (numeric, sur la table `events` directement)
- **Plus de tiers** (Gold/Silver/Bronze) : suppression du concept
- **Plus de table `pricing_config`** : inutile
- **Plus de `computed_price` vs `manual_price`** : un seul prix, point final
- **Suggestion IA** : Mistral analyse le contexte (sport, ligue, equipes, date) et propose un prix entre 0,99 EUR et 5,00 EUR
- **Modification manuelle** : un simple champ input numerique pour ajuster le prix suggere

## Modifications

### 1. Base de donnees

Migration pour ajouter une colonne `price` directement sur la table `events` :

```sql
ALTER TABLE public.events ADD COLUMN price NUMERIC(5,2) DEFAULT NULL;
```

Les tables `event_pricing`, `event_pricing_history` et `pricing_config` restent en place (pas de suppression de donnees) mais ne seront plus utilisees par le code.

### 2. Edge Function : `admin-ai-suggest-price` (nouvelle)

Nouvelle Edge Function qui utilise Mistral (deja configure avec `MISTRAL_API_KEY`) pour suggerer un prix :

- Recoit : sport, ligue, equipes, date
- Prompt : "En tant qu'expert du streaming sportif, propose un prix unitaire entre 0,99 et 5,00 EUR pour cet evenement. Reponds uniquement avec le nombre (ex: 2.99)."
- Retourne : `{ price: 2.99 }`

### 3. Page Pricing (`src/pages/PricingPage.tsx`)

Simplification radicale :
- Suppression de l'onglet "Configuration" (plus de tiers a configurer)
- Suppression de l'onglet "Historique" (complexite inutile)
- **Vue unique** : tableau des evenements avec leur prix, un bouton "Suggerer par IA" par ligne, et un champ editable pour le prix
- Stats simplifiees : nombre total, prix moyen, evenements sans prix

### 4. Configurateur Events (`EventDetailPanel.tsx`)

Remplacement de l'onglet "Prix" complexe (toggle override, tier, computed vs manual) par :
- Un champ prix simple (input numerique, 0.99 - 5.00 EUR)
- Un bouton "Suggerer par IA" qui appelle Mistral et pre-remplit le champ
- Affichage du prix actuel dans la preview a gauche

### 5. Configurateur Catalogue (`CatalogPage.tsx`)

Meme simplification dans l'onglet Tarification :
- Input prix simple au lieu du systeme tier + prix manuel
- Bouton "Suggerer par IA"
- Suppression des references aux tiers

### 6. Hooks et mutations

- Simplification de `usePricingMutations.ts` : une seule mutation `useUpdateEventPrice` qui fait un simple `UPDATE events SET price = X WHERE id = Y`
- Suppression des hooks `useUpdatePricingConfig`, `useBatchRecompute`, `useRecomputeEventPricing`, `useRevertToComputed`
- Simplification de `usePricing.ts` : suppression des queries liees a `pricing_config` et `event_pricing`

### 7. Composants supprimes ou simplifies

| Composant | Action |
|-----------|--------|
| `PricingConfigTab.tsx` | Supprime (plus de config tiers) |
| `PricingConfigEditDialog.tsx` | Supprime |
| `PricingHistoryTab.tsx` | Supprime |
| `PricingHistoryRow.tsx` | Supprime |
| `PricingEditDialog.tsx` | Simplifie (champ prix + bouton IA) |
| `PricingEventsTab.tsx` | Simplifie (prix editable inline) |
| `PricingEventsRow.tsx` | Simplifie (affichage prix, pas de tier) |
| `PricingStats.tsx` | Simplifie (total, prix moyen, sans prix) |
| `PricingFilters.tsx` | Simplifie (recherche + filtre "avec/sans prix") |
| `TierBadge.tsx` | Conserve pour retrocompatibilite mais plus utilise dans pricing |

### 8. Edge Function `admin-pricing-recompute`

N'est plus appelee depuis l'interface. Reste deployee pour retrocompatibilite mais n'est plus referencee.

## Resume du flux simplifie

```text
Catalogue/Evenement → Onglet Prix
  ┌────────────────────────────────────────┐
  │  Prix de vente                         │
  │  ┌──────────┐  [Suggerer par IA]      │
  │  │  2.99 €  │                          │
  │  └──────────┘                          │
  │  Min: 0.99 € — Max: 5.00 €            │
  └────────────────────────────────────────┘
```

