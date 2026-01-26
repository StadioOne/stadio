
# Plan : Implémentation complète de la page Utilisateurs

## Contexte

La page "Utilisateurs" (`/users`) permet de gérer les administrateurs de la plateforme Stadio Admin et leurs rôles (owner, admin, editor, support). Actuellement, la page est un placeholder vide. Le système de rôles est déjà en place dans la base de données avec les tables `profiles` et `user_roles`.

## Architecture existante

### Base de données
- **Table `profiles`** : Informations utilisateur (user_id, email, full_name, avatar_url, preferred_language)
- **Table `user_roles`** : Attribution des rôles admin (user_id, role)
- **Enum `admin_role`** : owner, admin, editor, support
- **Fonctions RPC** : `is_admin()`, `has_role()`, `get_user_role()`

### Politiques RLS actuelles
- `user_roles` : Seuls les `owner` peuvent gérer les rôles (INSERT/UPDATE/DELETE)
- `profiles` : Les admins peuvent voir tous les profils

### Données existantes
Un seul utilisateur admin actuellement :
- Email: wearestadio@gmail.com
- Nom: MARQUES
- Rôle: owner

## Fonctionnalités a implementer

### 1. Vue principale avec liste des utilisateurs
- Affichage en tableau avec colonnes : Avatar, Nom, Email, Role, Date d'ajout, Actions
- Badge de role colore (owner=violet, admin=bleu, editor=vert, support=gris)
- Pagination si necessaire

### 2. Statistiques
- Total des administrateurs
- Repartition par role (owners, admins, editors, support)

### 3. Filtres
- Recherche par nom/email
- Filtre par role

### 4. Panel de detail/modification
- Voir les informations de l'utilisateur
- Modifier le role (seulement si l'utilisateur connecte est owner)
- Pas de suppression de role pour le dernier owner

### 5. Ajout d'un nouvel admin
- Recherche d'un utilisateur existant par email (depuis auth.users via profiles)
- Attribution d'un role

### 6. Restrictions de securite
- Seuls les owners peuvent modifier/ajouter/supprimer des roles
- Un owner ne peut pas retirer son propre role owner s'il est le dernier
- Les autres roles (admin, editor, support) ont un acces en lecture seule

## Fichiers a creer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/hooks/useUsers.ts` | Creer | Hook React Query pour les utilisateurs avec roles |
| `src/hooks/useUserMutations.ts` | Creer | Hook pour les mutations (ajout/modification de role) |
| `src/pages/UsersPage.tsx` | Modifier | Page principale refondee |
| `src/components/users/UserFilters.tsx` | Creer | Filtres (recherche, role) |
| `src/components/users/UserStats.tsx` | Creer | Statistiques des utilisateurs |
| `src/components/users/UserTable.tsx` | Creer | Tableau des utilisateurs |
| `src/components/users/UserRow.tsx` | Creer | Ligne du tableau |
| `src/components/users/UserDetailPanel.tsx` | Creer | Panel lateral de modification |
| `src/components/users/UserEmptyState.tsx` | Creer | Etat vide |
| `src/components/users/RoleBadge.tsx` | Creer | Badge de role (reutilisation du composant audit) |
| `src/components/users/AddUserDialog.tsx` | Creer | Dialog pour ajouter un admin |
| `src/lib/i18n.ts` | Modifier | Ajouter traductions users |

## Details techniques

### Types

```typescript
interface UserWithRole {
  id: string;              // profile.id
  userId: string;          // auth user id
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: AdminRole | null;  // null si pas encore de role
  roleId: string | null;   // user_roles.id
  createdAt: string;       // date d'ajout du role
}

type AdminRole = 'owner' | 'admin' | 'editor' | 'support';

interface UsersFilters {
  search?: string;
  role?: AdminRole | 'all';
}

interface UsersStats {
  total: number;
  owners: number;
  admins: number;
  editors: number;
  support: number;
}
```

### Hook useUsers

```typescript
// Requete jointe profiles + user_roles
const { data, isLoading } = useQuery({
  queryKey: ['admin-users', filters],
  queryFn: async () => {
    let query = supabase
      .from('user_roles')
      .select(`
        id,
        user_id,
        role,
        created_at,
        profiles!inner(email, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false });
    
    if (filters.role && filters.role !== 'all') {
      query = query.eq('role', filters.role);
    }
    
    // Recherche sur email ou nom
    if (filters.search) {
      query = query.or(`profiles.email.ilike.%${filters.search}%,profiles.full_name.ilike.%${filters.search}%`);
    }
    
    return query;
  }
});
```

### Hook useUserMutations

```typescript
// Modifier le role d'un utilisateur
const updateRole = useMutation({
  mutationFn: async ({ roleId, newRole }: { roleId: string; newRole: AdminRole }) => {
    return supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('id', roleId);
  }
});

// Supprimer le role (retirer l'acces admin)
const removeRole = useMutation({
  mutationFn: async (roleId: string) => {
    return supabase
      .from('user_roles')
      .delete()
      .eq('id', roleId);
  }
});

// Ajouter un nouveau role
const addRole = useMutation({
  mutationFn: async ({ userId, role }: { userId: string; role: AdminRole }) => {
    return supabase
      .from('user_roles')
      .insert({ user_id: userId, role });
  }
});
```

### Hierarchie des roles

```text
owner (4)     - Acces complet, gestion des roles
   |
admin (3)     - Acces complet sauf gestion des roles
   |
editor (2)    - Gestion du contenu (events, originals, categories)
   |
support (1)   - Lecture seule
```

## Maquette de l'interface

```text
+------------------------------------------------------------------+
|  Utilisateurs & Roles                      [+ Nouvel admin]      |
|  Gestion des administrateurs                                     |
+------------------------------------------------------------------+
|  [Total: 4]  [Owners: 1]  [Admins: 2]  [Editors: 1]  [Support: 0]|
+------------------------------------------------------------------+
|  [Rechercher...]                    [Tous les roles v]           |
+------------------------------------------------------------------+
|                                                                   |
|  Avatar  Nom              Email                Role      Actions  |
|  ─────────────────────────────────────────────────────────────── |
|  [M]     MARQUES          wearestadio@...     [owner]    [...]   |
|  [J]     Jean Dupont      jean@stadio.io      [admin]    [...]   |
|  [P]     Pierre Martin    pierre@stadio.io    [editor]   [...]   |
+------------------------------------------------------------------+
```

### Panel de detail (Sheet)

```text
+--------------------------------------+
|  Modifier le role           [x]     |
+--------------------------------------+
|  Utilisateur                         |
|  ┌─────────────────────────────────┐|
|  │ [Avatar]                        │|
|  │ MARQUES                         │|
|  │ wearestadio@gmail.com           │|
|  │ Membre depuis: 17 jan 2026      │|
|  └─────────────────────────────────┘|
+--------------------------------------+
|  Role actuel                         |
|  ┌─────────────────────────────────┐|
|  │ [owner]                         │|
|  │ Acces complet + gestion roles   │|
|  └─────────────────────────────────┘|
+--------------------------------------+
|  Modifier le role                    |
|  ┌─────────────────────────────────┐|
|  │ ( ) Owner - Acces complet       │|
|  │ ( ) Admin - Gestion complete    │|
|  │ ( ) Editor - Gestion contenu    │|
|  │ ( ) Support - Lecture seule     │|
|  └─────────────────────────────────┘|
+--------------------------------------+
|  [Retirer l'acces]  [Annuler] [Sauvegarder] |
+--------------------------------------+
```

### Dialog ajout admin

```text
+--------------------------------------+
|  Ajouter un administrateur   [x]    |
+--------------------------------------+
|  Email de l'utilisateur              |
|  [______________________________]    |
|                                      |
|  Role a attribuer                    |
|  [Admin v]                           |
|                                      |
|  Note: L'utilisateur doit deja      |
|  avoir un compte sur la plateforme. |
|                                      |
|  [Annuler]        [Ajouter]         |
+--------------------------------------+
```

## Traductions a ajouter (i18n)

```typescript
users: {
  title: "Utilisateurs & Roles",
  subtitle: "Gestion des administrateurs",
  description: "Gerez les acces et permissions des administrateurs",
  newAdmin: "Nouvel admin",
  
  // Stats
  stats: {
    total: "Total",
    owners: "Proprietaires",
    admins: "Administrateurs",
    editors: "Editeurs",
    support: "Support",
  },
  
  // Filtres
  searchPlaceholder: "Rechercher par nom ou email...",
  allRoles: "Tous les roles",
  
  // Roles
  role: "Role",
  roles: {
    owner: "Proprietaire",
    admin: "Administrateur",
    editor: "Editeur",
    support: "Support",
  },
  roleDescriptions: {
    owner: "Acces complet + gestion des roles",
    admin: "Gestion complete sauf roles",
    editor: "Gestion du contenu editorial",
    support: "Lecture seule",
  },
  
  // Actions
  editRole: "Modifier le role",
  removeAccess: "Retirer l'acces",
  addAdmin: "Ajouter un administrateur",
  memberSince: "Membre depuis",
  currentRole: "Role actuel",
  newRole: "Nouveau role",
  
  // Messages
  updateSuccess: "Role mis a jour",
  addSuccess: "Administrateur ajoute",
  removeSuccess: "Acces retire",
  cannotRemoveLastOwner: "Impossible de retirer le dernier proprietaire",
  userNotFound: "Utilisateur non trouve",
  userAlreadyAdmin: "Cet utilisateur est deja administrateur",
  
  // Etats vides
  emptyTitle: "Aucun administrateur",
  emptyDescription: "Ajoutez votre premier administrateur pour commencer.",
  noResults: "Aucun resultat",
  noResultsDescription: "Aucun utilisateur ne correspond a vos criteres.",
  
  // Permissions
  ownerOnly: "Action reservee aux proprietaires",
  readOnly: "Vous avez un acces en lecture seule",
}
```

## Notes de securite

1. **Acces en ecriture** : Seuls les `owner` peuvent modifier les roles (RLS deja en place)
2. **Protection dernier owner** : Verifier qu'il reste au moins un owner avant suppression
3. **Pas d'auto-retrogradation** : Un owner ne peut pas retirer son propre role owner
4. **Validation cote serveur** : Les RLS policies assurent la securite meme si le frontend est contourne

## Ordre d'implementation

### Etape 1 : Hooks (15 min)
1. Creer `src/hooks/useUsers.ts` avec `useUsers` et `useUsersStats`
2. Creer `src/hooks/useUserMutations.ts`

### Etape 2 : Composants de base (20 min)
1. Creer `UserStats.tsx`
2. Creer `UserFilters.tsx`
3. Reutiliser/adapter `RoleBadge.tsx` depuis audit

### Etape 3 : Tableau et lignes (15 min)
1. Creer `UserTable.tsx`
2. Creer `UserRow.tsx`
3. Creer `UserEmptyState.tsx`

### Etape 4 : Panels et dialogs (20 min)
1. Creer `UserDetailPanel.tsx`
2. Creer `AddUserDialog.tsx`

### Etape 5 : Page principale (10 min)
1. Refondre `UsersPage.tsx`
2. Ajouter traductions i18n

### Etape 6 : Tests
- Verifier l'affichage des utilisateurs
- Tester la modification de role (en tant qu'owner)
- Tester l'ajout d'un nouvel admin
- Verifier les restrictions (non-owner ne peut pas modifier)
