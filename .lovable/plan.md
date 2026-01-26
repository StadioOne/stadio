
# Plan : Implémentation complète de la page Journal d'Audit

## Contexte

La page "Journal d'audit" (`/audit`) doit afficher l'historique complet des actions critiques effectuées par les administrateurs dans l'application Stadio Admin. Le système d'audit est déjà en place côté backend (table `audit_log` + Edge Function `admin-audit-log`), mais la page frontend est actuellement un placeholder vide.

## Architecture existante

### Backend (déjà implémenté)
- **Table `audit_log`** : Stocke toutes les actions avec acteur, entité, action, diff avant/après, IP, user agent
- **Edge Function `admin-audit-log`** : API GET avec filtres (entity, action, actorUserId, dateFrom, dateTo) et pagination
- **Fonction `logAudit()`** : Utilisée par les autres Edge Functions pour enregistrer les actions

### Données disponibles dans audit_log
| Colonne | Description |
|---------|-------------|
| `actor_email` | Email de l'administrateur |
| `actor_role` | Rôle (owner, admin, editor, support) |
| `action` | Type d'action (publish, unpublish, update, create, delete, etc.) |
| `entity` | Type d'entité (events, originals, categories, etc.) |
| `entity_id` | UUID de l'entité concernée |
| `old_values` | État avant modification (JSON) |
| `new_values` | État après modification (JSON) |
| `metadata` | Métadonnées additionnelles (JSON) |
| `ip_address` | Adresse IP |
| `created_at` | Horodatage |

## Fonctionnalités à implémenter

### 1. Vue principale avec tableau des logs
- Affichage chronologique des entrées (les plus récentes en premier)
- Colonnes : Date, Acteur, Action, Entité, Détails
- Pagination (50 entrées par page)
- Skeleton loading pendant le chargement

### 2. Filtres avancés
- **Par période** : Sélecteur de dates (7j, 30j, 90j, personnalisé)
- **Par acteur** : Dropdown des utilisateurs ayant des entrées
- **Par action** : publish, unpublish, update, create, delete, etc.
- **Par entité** : events, originals, categories, authors, etc.
- **Recherche texte** : Recherche dans les métadonnées

### 3. Panel de détail
- Clic sur une entrée ouvre un panel latéral
- Affiche le diff complet avant/après
- Affiche les métadonnées JSON formatées
- Affiche IP et User Agent

### 4. Badges visuels
- Badge de rôle coloré (owner=violet, admin=bleu, editor=vert, support=gris)
- Badge d'action coloré (publish=vert, unpublish=orange, delete=rouge, update=bleu)
- Badge d'entité avec icône correspondante

### 5. Export CSV (optionnel)
- Bouton d'export des logs filtrés au format CSV

## Fichiers à créer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/pages/AuditLogPage.tsx` | Modifier | Page principale avec tableau et filtres |
| `src/components/audit/AuditFilters.tsx` | Créer | Composant de filtres (période, acteur, action, entité) |
| `src/components/audit/AuditTable.tsx` | Créer | Tableau des entrées d'audit |
| `src/components/audit/AuditRow.tsx` | Créer | Ligne du tableau avec badges |
| `src/components/audit/AuditDetailPanel.tsx` | Créer | Panel latéral de détail avec diff |
| `src/components/audit/ActionBadge.tsx` | Créer | Badge coloré pour les actions |
| `src/components/audit/EntityBadge.tsx` | Créer | Badge avec icône pour les entités |
| `src/components/audit/RoleBadge.tsx` | Créer | Badge coloré pour les rôles |
| `src/components/audit/DiffViewer.tsx` | Créer | Affichage du diff JSON avant/après |
| `src/hooks/useAuditLogs.ts` | Créer | Hook React Query pour les logs d'audit |
| `src/lib/api.ts` | Modifier | Corriger le client API pour audit |
| `src/lib/i18n.ts` | Modifier | Ajouter traductions audit |

## Détails techniques

### Hook useAuditLogs

```typescript
interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string | null;
  diff: {
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  };
  metadata: Record<string, unknown> | null;
  createdAt: string;
  ipAddress: string | null;
}

interface AuditFilters {
  entity?: string;
  action?: string;
  actorUserId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}
```

### Correction du client API

L'API actuelle dans `src/lib/api.ts` ne gère pas correctement la réponse paginée. Il faut la corriger pour extraire `logs` et `pagination` de la réponse.

### Palette de couleurs pour les badges

**Actions:**
- `publish` : bg-green-100 text-green-800
- `unpublish` : bg-orange-100 text-orange-800
- `create` : bg-blue-100 text-blue-800
- `update` : bg-sky-100 text-sky-800
- `delete` : bg-red-100 text-red-800
- autres : bg-gray-100 text-gray-800

**Entités:**
- `events` : Calendar icon
- `originals` : Film icon
- `categories` : Folder icon
- `authors` : User icon
- `pricing` : DollarSign icon
- `analytics` : BarChart icon

**Rôles:**
- `owner` : bg-purple-100 text-purple-800
- `admin` : bg-blue-100 text-blue-800
- `editor` : bg-green-100 text-green-800
- `support` : bg-gray-100 text-gray-800

## Ordre d'implémentation

### Étape 1 : Hook et API client (10 min)
1. Créer `src/hooks/useAuditLogs.ts`
2. Corriger `src/lib/api.ts` pour la réponse audit

### Étape 2 : Composants de base (15 min)
1. Créer les badges (Action, Entity, Role)
2. Créer le DiffViewer

### Étape 3 : Tableau et filtres (20 min)
1. Créer AuditFilters
2. Créer AuditTable + AuditRow

### Étape 4 : Panel de détail (10 min)
1. Créer AuditDetailPanel

### Étape 5 : Page principale (10 min)
1. Refondre AuditLogPage
2. Ajouter traductions i18n

### Étape 6 : Tests
- Vérifier le chargement des logs
- Tester les filtres
- Tester l'ouverture du panel de détail

## Maquette de l'interface

```text
+------------------------------------------------------------------+
|  Journal d'audit                              [7j] [30j] [90j]   |
|  Historique des actions administratives                          |
+------------------------------------------------------------------+
|  [Tous les acteurs ▼] [Toutes les actions ▼] [Toutes les entités ▼] |
+------------------------------------------------------------------+
|                                                                   |
|  Date           Acteur              Action    Entité    Détails   |
|  ─────────────────────────────────────────────────────────────── |
|  26 jan 17:30   admin@stadio.io    [publish] [events]  PSG vs OM |
|                 [admin]                                           |
|  ─────────────────────────────────────────────────────────────── |
|  26 jan 16:45   editor@stadio.io   [update]  [originals] Article |
|                 [editor]                                          |
|  ─────────────────────────────────────────────────────────────── |
|                                                                   |
|  [< Précédent]  Page 1 sur 5  [Suivant >]                        |
+------------------------------------------------------------------+
```

## Panel de détail (Sheet)

```text
+--------------------------------------+
|  Détail de l'action         [×]     |
+--------------------------------------+
|  Action: publish                     |
|  Entité: events                      |
|  ID: 550e8400-e29b-41d4-a716-...    |
+--------------------------------------+
|  Acteur                              |
|  ┌─────────────────────────────────┐|
|  │ admin@stadio.io                 │|
|  │ Rôle: admin                     │|
|  │ IP: 192.168.1.1                 │|
|  └─────────────────────────────────┘|
+--------------------------------------+
|  Modifications                       |
|  ┌─────────────────────────────────┐|
|  │ status: "draft" → "published"  │|
|  │ published_at: null → "2026..."  │|
|  └─────────────────────────────────┘|
+--------------------------------------+
|  Métadonnées                         |
|  ┌─────────────────────────────────┐|
|  │ { "request_id": "abc123" }     │|
|  └─────────────────────────────────┘|
+--------------------------------------+
```

## Notes de sécurité

- Les logs d'audit sont accessibles en lecture seule (pas d'INSERT/UPDATE/DELETE depuis le frontend)
- Les rôles `editor` ne voient que les logs des entités `events`, `originals`, `categories`
- Les adresses IP et user agents sont masqués pour les rôles non-admin (optionnel)
