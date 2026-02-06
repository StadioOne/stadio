

# Plan : Refonte de la page Utilisateurs (Admin + App Grand Public)

## Objectif

Transformer la page `/users` en une page a **deux onglets principaux** :
1. **Administrateurs** : gestion des admins de cette application (existant, ameliore)
2. **Utilisateurs App** : consultation et gestion des utilisateurs de l'application Stadio grand public, en se connectant a leur base de donnees externe

## Architecture technique

La connexion a la base Stadio App se fait via une **Edge Function proxy** (`admin-app-users`). Cette Edge Function utilise le service role key de la Stadio App (stocke en secret) pour requeter les utilisateurs `auth.users` du projet externe. On ne cree **jamais** un second client Supabase cote frontend -- tout passe par l'Edge Function authentifiee.

```text
Frontend (UsersPage)
    |
    ├── Onglet "Administrateurs" → Client Supabase local (existant)
    |
    └── Onglet "Utilisateurs App" → Edge Function admin-app-users
                                        |
                                        └── Supabase Client (Stadio App, service_role)
                                                |
                                                └── auth.admin.listUsers()
                                                    + profiles table (si existante)
```

## Secrets a ajouter

Deux nouveaux secrets a configurer :

| Secret | Valeur |
|--------|--------|
| `STADIO_APP_SUPABASE_URL` | `https://sslsaqommonvkazvdity.supabase.co` |
| `STADIO_APP_SERVICE_ROLE_KEY` | (a fournir par l'utilisateur) |

Le `SUPABASE_PUBLISHABLE_KEY` de l'app (anon key) n'est **pas suffisant** pour lister les utilisateurs -- il faut le **service_role_key** du projet Stadio App.

## Modifications

### 1. Edge Function : `admin-app-users` (nouveau)

Nouvelle Edge Function qui sert de proxy securise vers la Stadio App :

**Endpoints** (via query param `action`) :
- `list` : liste les utilisateurs avec pagination (auth.admin.listUsers)
- `get` : details d'un utilisateur (auth.admin.getUserById)
- `ban` : bannir un utilisateur (auth.admin.updateUserById avec `ban_duration`)
- `unban` : debannir un utilisateur
- `delete` : supprimer un utilisateur (auth.admin.deleteUser)

Toutes les actions sont protegees par `authenticateAdmin` avec role minimum `admin`.

### 2. Page UsersPage.tsx (refonte)

Restructuration avec **Tabs** (shadcn) en haut :

```text
┌─────────────────────────────────────────────────────────┐
│  Utilisateurs                          [+ Admin]        │
├─────────────────────────────────────────────────────────┤
│  [Administrateurs]  [Utilisateurs App]                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  (contenu de l'onglet selectionne)                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Onglet Administrateurs** : le contenu actuel (stats KPI, filtres, table, panel de detail) reorganise dans un sous-composant `AdminUsersTab`.

**Onglet Utilisateurs App** : nouveau composant `AppUsersTab` avec :
- Stats KPI : Total utilisateurs, Actifs, Bannis, Nouveaux (30j)
- Barre de recherche (email, nom)
- Tableau : Avatar, Email, Nom, Date d'inscription, Derniere connexion, Statut (actif/banni), Actions
- Panel de detail (Dialog plein ecran comme les evenements) avec :
  - Infos utilisateur (email, metadata, dates)
  - Actions : Bannir / Debannir / Supprimer

### 3. Hook : `useAppUsers.ts` (nouveau)

Hook React Query pour appeler l'Edge Function `admin-app-users` :
- `useAppUsers(filters)` : liste paginee
- `useAppUserStats()` : compteurs
- `useAppUserMutations()` : ban, unban, delete

### 4. Composants nouveaux

| Composant | Description |
|-----------|-------------|
| `src/components/users/AdminUsersTab.tsx` | Encapsule le contenu actuel de la page (stats, filtres, table admin) |
| `src/components/users/AppUsersTab.tsx` | Nouvel onglet pour les utilisateurs de l'app grand public |
| `src/components/users/AppUserTable.tsx` | Tableau des utilisateurs app |
| `src/components/users/AppUserRow.tsx` | Ligne du tableau utilisateur app |
| `src/components/users/AppUserDetailPanel.tsx` | Dialog de detail utilisateur app |
| `src/components/users/AppUserStats.tsx` | Cartes KPI pour les utilisateurs app |
| `src/components/users/AppUserFilters.tsx` | Filtres pour les utilisateurs app |
| `src/components/users/AppUserStatusBadge.tsx` | Badge statut (actif, banni, non confirme) |

### 5. Composants existants reorganises

Les composants actuels (`UserStats`, `UserFilters`, `UserTable`, `UserRow`, `UserDetailPanel`, `AddUserDialog`) restent inchanges mais sont encapsules dans `AdminUsersTab.tsx`.

## Requete RLS pour la Stadio App

Voici la requete SQL a executer dans le projet Stadio App pour permettre a l'admin de lister les profils utilisateurs (si une table `profiles` existe avec RLS) :

```sql
-- Option 1 : Si vous voulez que le service_role puisse tout lire (par defaut c'est deja le cas)
-- Le service_role_key bypass automatiquement les RLS, donc aucune modification n'est necessaire.

-- Option 2 : Si vous souhaitez creer une policy specifique pour un acces API-key
-- (pas necessaire si on utilise service_role_key, car il bypass RLS)

-- Verification : s'assurer que RLS est active sur profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre la lecture via service role (deja implicite, mais pour documenter) :
-- Le service_role bypass RLS par defaut dans Supabase, donc aucune policy supplementaire n'est requise.

-- Si vous avez des tables supplementaires (purchases, subscriptions, etc.) que l'admin
-- devrait pouvoir consulter, le service_role_key les lira automatiquement.
```

**En resume** : avec le `service_role_key`, aucune modification RLS n'est necessaire sur le projet Stadio App. Le service role bypass automatiquement toutes les policies RLS.

## Ce qui ne change PAS

- Le systeme d'authentification admin (AuthContext)
- Les hooks existants (`useUsers`, `useUserMutations`, `useOwnerCount`)
- Les composants existants de gestion admin (simplement deplaces dans un sous-composant)
- La sidebar (le lien `/users` reste le meme)
- Les RLS du projet admin actuel

