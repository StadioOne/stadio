
# Plan : Module Broadcasters - Gestion des droits de diffusion

## Vue d'ensemble

Création d'un module complet de gestion des droits de diffusion (broadcasters) permettant de contrôler qui peut diffuser quel contenu, dans quels territoires, avec quelles contraintes (exclusivite, live/replay, fenetre de replay).

---

## 1. Schema de base de donnees

### 1.1 Nouvelles tables

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        SCHEMA BROADCASTER                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  broadcasters                  broadcaster_users                    │
│  ┌─────────────────────┐       ┌──────────────────────────┐        │
│  │ id (uuid PK)        │       │ id (uuid PK)             │        │
│  │ name                │◄──────│ broadcaster_id (FK)      │        │
│  │ legal_name          │       │ user_id (FK profiles)    │        │
│  │ logo_url            │       │ role (enum)              │        │
│  │ contact_email       │       │ created_at               │        │
│  │ status (enum)       │       └──────────────────────────┘        │
│  │ notes               │                                           │
│  │ created_at          │       territories                         │
│  │ updated_at          │       ┌──────────────────────────┐        │
│  └─────────────────────┘       │ code (PK) - FR, BE, CH   │        │
│           │                    │ name                     │        │
│           │                    │ region                   │        │
│           ▼                    └──────────────────────────┘        │
│  rights_packages                                                    │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │ id (uuid PK)                                             │       │
│  │ broadcaster_id (FK)                                      │       │
│  │ name - "Ligue 1 France 2024-2025"                       │       │
│  │ scope_type (sport/competition/season)                    │       │
│  │ sport_id, league_id, season (nullable)                   │       │
│  │ start_at, end_at                                         │       │
│  │ is_exclusive_default                                     │       │
│  │ territories_default (text[])                             │       │
│  │ notes                                                    │       │
│  │ status (draft/active/expired)                            │       │
│  │ created_at, updated_at                                   │       │
│  └─────────────────────────────────────────────────────────┘       │
│           │                                                         │
│           ▼                                                         │
│  rights_events (droits concrets par evenement)                      │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │ id (uuid PK)                                             │       │
│  │ event_id (FK events)                                     │       │
│  │ broadcaster_id (FK)                                      │       │
│  │ package_id (FK nullable)                                 │       │
│  │ rights_live (bool)                                       │       │
│  │ rights_replay (bool)                                     │       │
│  │ rights_highlights (bool)                                 │       │
│  │ replay_window_hours (int)                                │       │
│  │ territories_allowed (text[])                             │       │
│  │ territories_blocked (text[])                             │       │
│  │ exclusivity (exclusive/shared/non-exclusive)             │       │
│  │ platform (ott/linear/both)                               │       │
│  │ status (draft/active/expired/revoked)                    │       │
│  │ expires_at (timestamp)                                   │       │
│  │ created_at, updated_at, created_by, updated_by           │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                     │
│  rights_audit_log (utilise audit_log existant avec entity=rights)   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Types ENUM a creer

```sql
-- Statut broadcaster
CREATE TYPE broadcaster_status AS ENUM ('active', 'suspended', 'pending');

-- Role utilisateur broadcaster
CREATE TYPE broadcaster_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- Type d'exclusivite
CREATE TYPE rights_exclusivity AS ENUM ('exclusive', 'shared', 'non_exclusive');

-- Plateforme de diffusion
CREATE TYPE rights_platform AS ENUM ('ott', 'linear', 'both');

-- Statut des droits
CREATE TYPE rights_status AS ENUM ('draft', 'active', 'expired', 'revoked');

-- Scope du package
CREATE TYPE package_scope AS ENUM ('sport', 'competition', 'season');
```

### 1.3 Tables detaillees

**broadcasters**
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | Identifiant unique |
| name | text NOT NULL | Nom commercial (Canal+, DAZN...) |
| legal_name | text | Raison sociale |
| logo_url | text | URL du logo |
| contact_email | text | Email de contact principal |
| status | broadcaster_status | active/suspended/pending |
| notes | text | Notes internes |
| created_at | timestamptz | Date creation |
| updated_at | timestamptz | Date modification |

**broadcaster_users**
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | Identifiant unique |
| broadcaster_id | uuid FK | Reference broadcaster |
| user_id | uuid FK | Reference profiles.user_id |
| role | broadcaster_role | owner/admin/editor/viewer |
| created_at | timestamptz | Date ajout |

**territories**
| Colonne | Type | Description |
|---------|------|-------------|
| code | text PK | Code ISO (FR, BE, CH, US...) |
| name | text | Nom complet (France, Belgique...) |
| region | text | Region (Europe, Amerique du Nord...) |

**rights_packages**
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | Identifiant unique |
| broadcaster_id | uuid FK | Reference broadcaster |
| name | text NOT NULL | Nom du package |
| scope_type | package_scope | sport/competition/season |
| sport_id | uuid FK nullable | Reference sports |
| league_id | uuid FK nullable | Reference leagues |
| season | int nullable | Annee de saison |
| start_at | timestamptz | Debut de validite |
| end_at | timestamptz | Fin de validite |
| is_exclusive_default | boolean | Exclusivite par defaut |
| territories_default | text[] | Territoires par defaut |
| notes | text | Notes |
| status | rights_status | draft/active/expired |
| created_at, updated_at | timestamptz | Timestamps |

**rights_events**
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid PK | Identifiant unique |
| event_id | uuid FK | Reference events |
| broadcaster_id | uuid FK | Reference broadcaster |
| package_id | uuid FK nullable | Reference package source |
| rights_live | boolean | Droit de diffusion live |
| rights_replay | boolean | Droit de replay |
| rights_highlights | boolean | Droit aux highlights |
| replay_window_hours | int | Fenetre replay (ex: 168 = 7 jours) |
| territories_allowed | text[] | Pays autorises |
| territories_blocked | text[] | Pays bloques |
| exclusivity | rights_exclusivity | exclusive/shared/non_exclusive |
| platform | rights_platform | ott/linear/both |
| status | rights_status | draft/active/expired/revoked |
| expires_at | timestamptz | Date expiration auto |
| created_at, updated_at | timestamptz | Timestamps |
| created_by, updated_by | uuid FK | Auteur modifications |

### 1.4 Politiques RLS

```sql
-- broadcasters: super-admin uniquement
CREATE POLICY "Admins can view broadcasters"
ON broadcasters FOR SELECT
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage broadcasters"
ON broadcasters FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'));

-- rights_events: admin + broadcaster_users associes
CREATE POLICY "Admins can manage rights"
ON rights_events FOR ALL
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'));

-- broadcaster_users peuvent voir leurs propres droits
CREATE POLICY "Broadcaster users can view own rights"
ON rights_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM broadcaster_users
    WHERE broadcaster_users.broadcaster_id = rights_events.broadcaster_id
    AND broadcaster_users.user_id = auth.uid()
  )
);
```

---

## 2. Structure des fichiers

```text
src/
├── pages/
│   └── BroadcastersPage.tsx           # Page principale
│
├── components/
│   └── broadcasters/
│       ├── BroadcasterStats.tsx       # KPIs (total, actifs, evenements)
│       ├── BroadcasterFilters.tsx     # Filtres (status, recherche)
│       ├── BroadcasterTable.tsx       # Tableau liste
│       ├── BroadcasterRow.tsx         # Ligne tableau
│       ├── BroadcasterCard.tsx        # Vue carte
│       ├── BroadcasterEmptyState.tsx  # Etat vide
│       ├── BroadcasterDetailPanel.tsx # Panel detail (Sheet)
│       ├── AddBroadcasterDialog.tsx   # Dialog creation
│       │
│       ├── RightsTab.tsx              # Onglet droits evenements
│       ├── RightsTable.tsx            # Tableau droits
│       ├── RightsRow.tsx              # Ligne droit
│       ├── RightsFilters.tsx          # Filtres droits
│       ├── RightEditDialog.tsx        # Edition droit unique
│       ├── RightsBulkDialog.tsx       # Attribution en masse
│       │
│       ├── PackagesTab.tsx            # Onglet contrats
│       ├── PackageCard.tsx            # Carte package
│       ├── PackageEditDialog.tsx      # Edition package
│       │
│       ├── BroadcasterUsersTab.tsx    # Onglet utilisateurs
│       ├── BroadcasterUserRow.tsx     # Ligne utilisateur
│       ├── AddBroadcasterUserDialog.tsx
│       │
│       ├── BroadcasterAuditTab.tsx    # Onglet audit
│       │
│       ├── StatusBadge.tsx            # Badge statut broadcaster
│       ├── ExclusivityBadge.tsx       # Badge exclusivite
│       ├── PlatformBadge.tsx          # Badge plateforme
│       ├── RightsTypeBadge.tsx        # Badge live/replay/highlights
│       └── TerritoriesBadge.tsx       # Badge territoires
│
├── hooks/
│   ├── useBroadcasters.ts             # Query broadcasters
│   ├── useBroadcasterMutations.ts     # Mutations CRUD
│   ├── useRightsEvents.ts             # Query droits
│   ├── useRightsMutations.ts          # Mutations droits
│   ├── useRightsPackages.ts           # Query packages
│   ├── usePackageMutations.ts         # Mutations packages
│   ├── useBroadcasterUsers.ts         # Query utilisateurs
│   └── useTerritories.ts              # Query territoires
│
└── supabase/functions/
    ├── admin-broadcasters/index.ts     # CRUD broadcasters
    ├── admin-rights-events/index.ts    # CRUD + bulk rights
    ├── admin-rights-resolve/index.ts   # Resolution droits (public)
    └── admin-rights-expire/index.ts    # Expiration automatique (cron)
```

---

## 3. Interface utilisateur

### 3.1 Page principale - Liste des broadcasters

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Diffuseurs                                    [+ Nouveau diffuseur]│
│  Gerez les droits de diffusion des evenements Stadio               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│  │    12      │ │    10      │ │    2       │ │   156      │       │
│  │ Diffuseurs │ │   Actifs   │ │ Suspendus  │ │ Evenements │       │
│  │   total    │ │            │ │            │ │  avec droits│       │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘       │
│                                                                     │
│  [Rechercher...________] [Statut: Tous ▼]                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Logo │ Nom          │ Statut  │ Evenements │ Territoires    │   │
│  ├──────┼──────────────┼─────────┼────────────┼────────────────┤   │
│  │ [C+] │ Canal+       │ ● Actif │ 45         │ FR, BE, CH     │   │
│  │ [D]  │ DAZN         │ ● Actif │ 32         │ DE, IT, ES     │   │
│  │ [B]  │ beIN Sports  │ ◐ Susp. │ 0          │ FR, MENA       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Panel detail - Fiche broadcaster (onglets)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ◄ Canal+                                          [● Actif]  [X]  │
│  contact@canalplus.fr                                              │
├─────────────────────────────────────────────────────────────────────┤
│  [Droits] [Contrats] [Utilisateurs] [Audit]                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ONGLET DROITS                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Filtres: [Sport ▼] [Competition ▼] [Date ▼] [Exclusif ▼]   │   │
│  │          [+ Attribution en masse]                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Evenement          │ Date    │ Droits    │ Territ. │ Status │   │
│  ├────────────────────┼─────────┼───────────┼─────────┼────────┤   │
│  │ PSG vs OM          │ 15 Mar  │ Live+Rep  │ FR,BE   │ ● Actif│   │
│  │ Lyon vs Monaco     │ 22 Mar  │ Live      │ FR      │ ● Actif│   │
│  │ Lille vs Lens      │ 29 Mar  │ Rep 7j    │ FR,CH   │ ◌ Draft│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Dialog attribution en masse

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Attribution en masse                                         [X]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Selection des evenements                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Competition: [Ligue 1 ▼]                                    │   │
│  │ Periode:     [15/03/2025] - [30/04/2025]                   │   │
│  │ Statut evt:  [Publie ▼]                                     │   │
│  │              → 24 evenements correspondants                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  2. Configuration des droits                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Droits:      [x] Live  [x] Replay  [ ] Highlights           │   │
│  │ Fenetre:     [168] heures (7 jours)                         │   │
│  │ Exclusivite: [Exclusif ▼]                                   │   │
│  │ Plateforme:  [OTT + Lineaire ▼]                             │   │
│  │ Territoires: [FR] [BE] [CH] [+]                             │   │
│  │ Statut:      [Actif ▼]                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ⚠ 3 conflits detectes (droits exclusifs existants)                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ PSG vs OM (15/03) - DAZN exclusif sur FR                    │   │
│  │ [Ignorer] [Passer en partage] [Remplacer]                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                              [Annuler] [Appliquer (21 evenements)] │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Hooks React

### 4.1 useBroadcasters

```typescript
// src/hooks/useBroadcasters.ts
export interface BroadcastersFilters {
  status?: 'active' | 'suspended' | 'pending' | 'all';
  search?: string;
}

export interface BroadcasterWithStats {
  id: string;
  name: string;
  legal_name: string | null;
  logo_url: string | null;
  contact_email: string | null;
  status: 'active' | 'suspended' | 'pending';
  notes: string | null;
  created_at: string;
  // Stats calculees
  activeRightsCount: number;
  territories: string[];
}

export function useBroadcasters(filters: BroadcastersFilters = {}) {
  return useQuery({
    queryKey: ['broadcasters', filters],
    queryFn: async () => {
      let query = supabase
        .from('broadcasters')
        .select(`
          *,
          rights_events!inner(
            id,
            territories_allowed,
            status
          )
        `)
        .order('name');
      
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      // ... transformation avec stats
    }
  });
}

export function useBroadcastersStats() {
  // Retourne total, actifs, suspendus, evenements avec droits
}
```

### 4.2 useRightsEvents

```typescript
// src/hooks/useRightsEvents.ts
export interface RightsFilters {
  broadcasterId: string;
  sportId?: string;
  leagueId?: string;
  dateFrom?: string;
  dateTo?: string;
  exclusivity?: 'exclusive' | 'shared' | 'non_exclusive' | 'all';
  status?: 'draft' | 'active' | 'expired' | 'revoked' | 'all';
}

export interface RightWithEvent {
  id: string;
  event_id: string;
  event: {
    api_title: string;
    event_date: string;
    sport: string;
    league: string;
  };
  rights_live: boolean;
  rights_replay: boolean;
  rights_highlights: boolean;
  replay_window_hours: number | null;
  territories_allowed: string[];
  exclusivity: string;
  platform: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useRightsEvents(filters: RightsFilters) {
  return useQuery({
    queryKey: ['rights-events', filters],
    queryFn: async () => {
      // Fetch rights avec jointure events
    },
    enabled: !!filters.broadcasterId
  });
}
```

---

## 5. Edge Functions

### 5.1 admin-rights-events

```typescript
// supabase/functions/admin-rights-events/index.ts

// GET - Liste des droits avec filtres
// POST - Creation simple ou bulk
// PATCH - Mise a jour
// DELETE - Revocation (soft delete via status=revoked)

// Action speciale: bulk_upsert
// - Recoit liste d'event_ids + config droits
// - Detecte conflits exclusivite
// - Retourne { created, updated, conflicts }
```

### 5.2 admin-rights-resolve (public)

```typescript
// supabase/functions/admin-rights-resolve/index.ts
// Endpoint public pour l'app utilisateur

// GET /admin-rights-resolve?event_id=xxx&country=FR
// Retourne:
// {
//   authorized: true,
//   broadcaster: { id, name, logo_url },
//   rights: { live: true, replay: true, replay_until: "2025-03-22T20:00:00Z" },
//   platform: "ott"
// }
```

### 5.3 admin-rights-expire (cron)

```typescript
// supabase/functions/admin-rights-expire/index.ts
// Appele par n8n ou scheduled function

// - Met status=expired si expires_at < now()
// - Met status=expired si replay_window depasse
// - Log dans audit_log
```

---

## 6. Navigation et routing

### 6.1 Ajout dans la sidebar

```typescript
// src/components/admin/AdminSidebar.tsx
// Ajouter dans mainNavItems ou creer section "Droits"
{ key: "broadcasters", path: "/broadcasters", icon: Radio }
```

### 6.2 Nouvelle route

```typescript
// src/App.tsx
<Route path="/broadcasters" element={<BroadcastersPage />} />
```

---

## 7. Regles metier

### 7.1 Validation exclusivite

```typescript
// Avant upsert d'un droit exclusif
async function checkExclusivityConflict(
  eventId: string,
  broadcasterId: string,
  territories: string[],
  rightsType: 'live' | 'replay'
): Promise<{ hasConflict: boolean; conflictingBroadcaster?: string }> {
  const { data: existing } = await supabase
    .from('rights_events')
    .select('broadcaster_id, broadcasters(name)')
    .eq('event_id', eventId)
    .eq('exclusivity', 'exclusive')
    .eq(`rights_${rightsType}`, true)
    .eq('status', 'active')
    .neq('broadcaster_id', broadcasterId)
    .overlaps('territories_allowed', territories);
  
  if (existing?.length > 0) {
    return { 
      hasConflict: true, 
      conflictingBroadcaster: existing[0].broadcasters?.name 
    };
  }
  return { hasConflict: false };
}
```

### 7.2 Calcul expiration automatique

```typescript
// A l'upsert du droit
function computeExpiresAt(
  eventDate: Date,
  rightsReplay: boolean,
  replayWindowHours: number | null
): Date | null {
  if (!rightsReplay || !replayWindowHours) return null;
  return new Date(eventDate.getTime() + replayWindowHours * 60 * 60 * 1000);
}
```

---

## 8. Securite et audit

### 8.1 Integration audit existant

Utiliser la fonction `logAudit()` existante avec:
- `entity: 'rights_events'` ou `'broadcasters'` ou `'rights_packages'`
- `action: 'create' | 'update' | 'revoke' | 'bulk_assign'`

### 8.2 Permissions par role

| Role | Broadcasters | Rights | Packages | Users |
|------|-------------|--------|----------|-------|
| owner | CRUD | CRUD | CRUD | CRUD |
| admin | CRUD | CRUD | CRUD | CRUD |
| editor | Lecture | Lecture | Lecture | - |
| support | Lecture | Lecture | Lecture | - |

---

## 9. Resume des livrables

| Phase | Livrables |
|-------|-----------|
| **Database** | 5 tables, 6 enums, RLS, indexes |
| **Hooks** | 8 hooks (queries + mutations) |
| **Components** | ~25 composants |
| **Edge Functions** | 3 fonctions |
| **Page** | 1 page principale |
| **Navigation** | 1 entree sidebar |
| **Traductions** | Cles i18n FR/EN |

---

## 10. Ordre d'implementation

1. **Migration DB** : Tables, enums, RLS, index
2. **Hooks basiques** : useBroadcasters, useBroadcasterMutations
3. **Page liste** : Stats, filtres, tableau, panel detail minimal
4. **Gestion droits** : useRightsEvents, RightsTab, RightsTable
5. **Attribution masse** : RightsBulkDialog, detection conflits
6. **Packages** : useRightsPackages, PackagesTab
7. **Utilisateurs** : broadcaster_users, BroadcasterUsersTab
8. **Audit** : Integration audit_log existant
9. **API resolve** : Endpoint public
10. **Cron expiration** : Edge function + n8n
