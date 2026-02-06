
# Correction : Déploiement des Edge Functions de publication

## Probleme
Les Edge Functions `admin-events-publish` et `admin-events-unpublish` ne sont pas deployees sur le serveur. Quand tu essaies de publier un evenement, l'application recoit une erreur 404 ("fonction introuvable").

## Solution
Deployer les deux fonctions backend necessaires :
- `admin-events-publish` -- pour publier un evenement
- `admin-events-unpublish` -- pour depublier un evenement

Aucune modification de code n'est necessaire. Les fichiers existent deja dans le projet, il suffit de les deployer.

## Details techniques
Les fichiers suivants sont deja presents et corrects :
- `supabase/functions/admin-events-publish/index.ts`
- `supabase/functions/admin-events-unpublish/index.ts`
- Configuration dans `supabase/config.toml` (verify_jwt = false)

L'action consiste uniquement a declencher le deploiement de ces deux fonctions.
