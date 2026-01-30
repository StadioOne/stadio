

# Plan : Correction de l'édition des événements

## Problèmes identifiés

1. **Restrictions géographiques non éditables** : Le panneau de détail affiche les pays autorisés/bloqués en lecture seule
2. **Tarification non éditable** : Le bouton "Recalculer" est inactif, pas de champs pour modifier le prix/tier manuel
3. **Pricing du Catalogue non pris en compte** : Le pricing manuel défini dans la page Catalogue n'est pas correctement persisté comme "override manuel"

## Solution proposée

### Partie 1 : Rendre les restrictions géographiques éditables

**Fichier** : `src/components/events/EventDetailPanel.tsx`

Modifications :
- Ajouter des états locaux pour `allowedCountries` et `blockedCountries`
- Remplacer l'affichage statique par des champs de saisie (tags input avec ajout/suppression)
- Inclure ces valeurs dans la fonction `handleSave`
- Utiliser un composant de saisie multi-tags ou un simple Input avec parsing par virgule

### Partie 2 : Rendre la tarification éditable

**Fichier** : `src/components/events/EventDetailPanel.tsx`

Modifications :
- Ajouter des états locaux pour `manualPrice` et `manualTier`
- Pré-remplir avec les valeurs existantes (`event.pricing?.manual_price`, etc.)
- Ajouter des champs Input (prix) et Select (tier: bronze/silver/gold)
- Ajouter un checkbox "Surcharge manuelle" pour activer/désactiver l'override
- Connecter le bouton "Recalculer le prix" à l'API `admin-pricing-recompute`

### Partie 3 : Ajouter un hook de mutation pour le pricing

**Fichier** : `src/hooks/useEventMutations.ts`

Ajout :
- `useUpdateEventPricing` : Mutation pour mettre à jour `event_pricing` avec les valeurs manuelles
- Gestion du flag `is_manual_override`

### Partie 4 : Corriger le flux Catalogue vers Événements

**Fichier** : `src/pages/CatalogPage.tsx`

Correction de `promoteToDraftMutation` :
- S'assurer que si `manual_price` ou `manual_tier` sont renseignés, `is_manual_override` est bien `true`
- Ajouter `computed_price` et `computed_tier` avec les mêmes valeurs pour affichage cohérent

## Détails techniques

### Structure des états dans EventDetailPanel

```typescript
// Nouveaux états à ajouter
const [allowedCountries, setAllowedCountries] = useState<string[]>([]);
const [blockedCountries, setBlockedCountries] = useState<string[]>([]);
const [manualPrice, setManualPrice] = useState<string>('');
const [manualTier, setManualTier] = useState<PricingTier | ''>('');
const [isManualOverride, setIsManualOverride] = useState(false);
```

### Modification de handleSave

```typescript
const handleSave = () => {
  if (!event) return;
  onSave?.(event.id, {
    override_title: overrideTitle || null,
    override_description: overrideDescription || null,
    override_image_url: overrideImageUrl || null,
    allowed_countries: allowedCountries.length > 0 ? allowedCountries : [],
    blocked_countries: blockedCountries.length > 0 ? blockedCountries : [],
  });
  
  // Mise à jour du pricing via hook dédié
  if (isManualOverride && (manualPrice || manualTier)) {
    onUpdatePricing?.(event.id, {
      manual_price: manualPrice ? parseFloat(manualPrice) : null,
      manual_tier: manualTier || null,
      is_manual_override: true,
    });
  }
};
```

### Interface utilisateur pour les pays

Implémentation d'un système simple de tags :
- Input texte pour saisir un code pays (ex: "FR", "US")
- Bouton "+" pour ajouter
- Badge avec "x" pour supprimer
- Affichage des codes ISO en badges

### Interface utilisateur pour la tarification

```text
┌─────────────────────────────────────────────┐
│ Tarification                                │
├─────────────────────────────────────────────┤
│ ☑ Surcharge manuelle                        │
│                                             │
│ Prix manuel     Tier manuel                 │
│ ┌──────────┐   ┌────────────────┐          │
│ │ 14.99    │   │ Silver      ▼ │          │
│ └──────────┘   └────────────────┘          │
│                                             │
│ Prix calculé: 14.99 €   Tier: silver       │
│                                             │
│ [🔄 Recalculer le prix]                    │
└─────────────────────────────────────────────┘
```

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `src/components/events/EventDetailPanel.tsx` | Ajouter les champs éditables pour géo et pricing |
| `src/hooks/useEventMutations.ts` | Ajouter `useUpdateEventPricing` |
| `src/pages/CatalogPage.tsx` | Corriger la persistance du pricing manuel |
| `src/lib/api-types.ts` | Ajouter le type `EventPricingUpdate` si nécessaire |

## Étapes d'implémentation

1. Créer le hook `useUpdateEventPricing` dans `useEventMutations.ts`
2. Modifier `EventDetailPanel.tsx` :
   - Ajouter les états pour géo-restrictions et pricing
   - Créer le composant de saisie des pays (tags)
   - Créer la section pricing éditable
   - Connecter le bouton "Recalculer"
   - Mettre à jour `handleSave` et `handleOpenChange`
3. Corriger `CatalogPage.tsx` pour persister correctement le pricing manuel
4. Tester le flux complet : Catalogue → Draft → Publication

