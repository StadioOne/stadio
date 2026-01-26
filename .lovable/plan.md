
# Suppression de la création de compte sur la page de connexion

## Contexte

La page de connexion actuelle permet aux utilisateurs de basculer entre le mode "Connexion" et "Créer un compte". Pour un panel d'administration, la création de compte ne doit pas être accessible directement - les nouveaux administrateurs doivent faire une demande par email.

## Éléments à supprimer

1. **État `isSignUp`** - Plus nécessaire car on reste toujours en mode connexion
2. **État `fullName`** - Uniquement utilisé pour l'inscription
3. **Import et utilisation de `signUp`** - Plus nécessaire
4. **Logique conditionnelle `isSignUp`** dans `handleSubmit`
5. **Champ "Nom complet"** - Conditionnel à `isSignUp`
6. **Texte du bouton conditionnel** - Simplifier pour afficher uniquement "Se connecter"
7. **Section de bascule inscription/connexion** - Le lien "Créer un compte"
8. **Description conditionnelle** dans le header

## Ajout proposé

Remplacer le lien "Créer un compte" par un texte informatif indiquant de contacter l'administrateur pour demander un accès.

## Fichier à modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/pages/LoginPage.tsx` | Modifier | Supprimer toute la logique d'inscription |
| `src/lib/i18n.ts` | Modifier | Ajouter une traduction pour le message de contact |

## Code simplifié attendu

```typescript
export default function LoginPage() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? emblemBlanc : emblemNoir;
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      toast({
        variant: "destructive",
        title: t("auth.invalidCredentials"),
        description: error.message,
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img 
            src={logoSrc} 
            alt="Stadio" 
            className="mx-auto mb-4 h-12 w-12 object-contain"
          />
          <CardTitle className="text-2xl">Stadio Admin</CardTitle>
          <CardDescription>
            {t("auth.login")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@stadio.tv"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.signingIn")}
                </>
              ) : (
                t("auth.signIn")
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("auth.requestAccess")}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Nouvelle traduction à ajouter

```typescript
// Dans src/lib/i18n.ts
auth: {
  // ... existant ...
  requestAccess: "Pour demander un accès, contactez un administrateur.",
  // EN
  requestAccess: "To request access, contact an administrator.",
}
```

## Résultat attendu

- La page affiche uniquement le formulaire de connexion (email + mot de passe)
- Aucun lien pour créer un compte
- Un message informatif indique de contacter un administrateur pour obtenir un accès
- Le code est simplifié et plus léger (suppression des états et logiques inutiles)
