

# Correction des données simulées - Plan d'action

## Résumé des problèmes identifiés

J'ai analysé les trois pages et voici ce que j'ai découvert :

| Page | Problème | Impact |
|------|----------|--------|
| **Utilisateurs** | Clé étrangère manquante entre `user_roles` et `profiles` | La jointure SQL échoue, aucun utilisateur ne s'affiche |
| **Journal d'audit** | La table `audit_log` est vide | Les Edge Functions n'appellent pas `logAudit()` |
| **OPS Workflow** | Les workflows sont codés en dur dans le code | Ils ne reflètent pas vos vrais workflows n8n |

## Données réelles trouvées

```text
Utilisateurs     : 1 utilisateur (wearestadio@gmail.com - MARQUES - owner)
Audit logs       : 0 entrées (table vide)
Workflow runs    : 1 exécution (import_fixtures - échec 404)
```

---

## Correction 1 : Page Utilisateurs

### Problème technique
La requête utilise `profiles!inner(...)` pour faire une jointure, mais PostgREST requiert une clé étrangère explicite pour cette syntaxe.

### Solution
Ajouter une clé étrangère de `user_roles.user_id` vers `profiles.user_id` :

```sql
ALTER TABLE public.user_roles
ADD CONSTRAINT fk_user_roles_profiles
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;
```

### Fichier concerné
| Fichier | Action |
|---------|--------|
| Migration SQL | Créer |

---

## Correction 2 : Journal d'Audit

### Problème
Le système `logAudit()` existe mais n'est appelé nulle part. Les Edge Functions ne loguent pas les actions.

### Solution
Intégrer `logAudit()` dans les Edge Functions critiques :
- `admin-events-publish` 
- `admin-events-unpublish`
- `admin-originals-publish`
- `admin-originals-unpublish`
- `admin-n8n-trigger`
- `admin-pricing-recompute`

### Exemple d'intégration

```typescript
import { logAudit, cleanDiff, getRequestMetadata } from '../_shared/audit.ts';

// Après une action réussie :
await logAudit({
  actorUserId: authResult.userId,
  actorEmail: authResult.email,
  actorRole: authResult.role,
  action: 'publish',
  entity: 'events',
  entityId: eventId,
  before: cleanDiff(previousState),
  after: cleanDiff(newState),
  ...getRequestMetadata(req),
});
```

### Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `supabase/functions/admin-events-publish/index.ts` | Ajouter audit |
| `supabase/functions/admin-events-unpublish/index.ts` | Ajouter audit |
| `supabase/functions/admin-originals-publish/index.ts` | Ajouter audit |
| `supabase/functions/admin-originals-unpublish/index.ts` | Ajouter audit |
| `supabase/functions/admin-n8n-trigger/index.ts` | Ajouter audit |
| `supabase/functions/admin-pricing-recompute/index.ts` | Ajouter audit |

---

## Correction 3 : Page OPS Workflow

### Problème
Les workflows sont définis statiquement dans `WorkflowGrid.tsx` :

```typescript
export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  { id: 'import_fixtures', ... },
  { id: 'recompute_pricing', ... },
  { id: 'rebuild_editorial_lists', ... },
  { id: 'refresh_notoriety', ... },
  { id: 'send_notifications', ... },
];
```

Ces IDs ne correspondent pas aux workflows réels de votre serveur n8n.

### Options de solution

**Option A - Synchronisation manuelle** (Simple)
Modifier les définitions pour qu'elles correspondent à vos vrais workflows n8n (noms, descriptions).

**Option B - Synchronisation dynamique** (Avancée)
Créer une table `workflows` dans la base de données et une Edge Function pour récupérer la liste des workflows disponibles depuis n8n via leur API.

### Recommandation
Je recommande **l'Option A** dans un premier temps : mettre à jour les définitions pour refléter vos vrais workflows n8n.

### Question pour vous
Quels sont les noms exacts des workflows configurés sur votre serveur n8n ? Je peux ensuite mettre à jour les définitions en conséquence.

---

## Résumé des modifications

| Priorité | Composant | Modification |
|----------|-----------|--------------|
| 1 | Base de données | Ajouter FK `user_roles` → `profiles` |
| 2 | Edge Functions | Intégrer `logAudit()` dans 6 fonctions |
| 3 | WorkflowGrid | Synchroniser avec vos vrais workflows n8n |

## Résultat attendu

- **Utilisateurs** : Votre profil (wearestadio@gmail.com) s'affichera correctement
- **Journal d'audit** : Les futures actions seront loguées et visibles
- **Workflows** : Affichage des vrais workflows de votre serveur n8n

