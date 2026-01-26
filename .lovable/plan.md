

# Remplacement du logo sur la page de connexion

## Contexte

Actuellement, la page de connexion (`LoginPage.tsx`) affiche un placeholder avec la lettre "S" dans un carré bleu. Tu souhaites utiliser le vrai logo Stadio qui s'adapte au thème clair/sombre, comme c'est déjà le cas dans la sidebar.

## Solution

Je vais reproduire le même système que dans `AdminSidebar.tsx` :
- **Mode sombre** : utiliser `emblem-blanc.png` (logo blanc sur fond sombre)
- **Mode clair** : utiliser `emblem-noir.png` (logo noir sur fond clair)

## Modification à effectuer

| Fichier | Action |
|---------|--------|
| `src/pages/LoginPage.tsx` | Modifier |

## Changements dans LoginPage.tsx

### 1. Ajouter les imports nécessaires

```typescript
import { useTheme } from "@/contexts/ThemeContext";
import emblemBlanc from "@/assets/emblem-blanc.png";
import emblemNoir from "@/assets/emblem-noir.png";
```

### 2. Utiliser le hook useTheme

```typescript
const { resolvedTheme } = useTheme();
const logoSrc = resolvedTheme === "dark" ? emblemBlanc : emblemNoir;
```

### 3. Remplacer le placeholder par le logo

**Avant** (lignes 58-60) :
```tsx
<div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
  <span className="text-primary-foreground font-bold text-xl">S</span>
</div>
```

**Après** :
```tsx
<img 
  src={logoSrc} 
  alt="Stadio" 
  className="mx-auto mb-4 h-12 w-12 object-contain"
/>
```

## Résultat attendu

- Le logo Stadio s'affichera automatiquement en blanc sur les écrans sombres
- Le logo Stadio s'affichera automatiquement en noir sur les écrans clairs
- La taille sera de 48x48 pixels (h-12 w-12), identique au placeholder actuel

