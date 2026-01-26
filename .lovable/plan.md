
# Changement du Favicon avec le logo Stadio

## Contexte

Actuellement, le favicon utilise une URL externe hébergée sur Google Cloud Storage. Tu souhaites utiliser l'image `Emblem_noir-2.png` que tu viens d'uploader comme nouveau favicon.

## Actions à effectuer

| Étape | Action | Description |
|-------|--------|-------------|
| 1 | Copier l'image | Copier `user-uploads://Emblem_noir-2.png` vers `public/favicon.png` |
| 2 | Modifier index.html | Mettre à jour la balise `<link rel="icon">` pour pointer vers `/favicon.png` |

## Modification dans index.html

**Avant** (ligne 24) :
```html
<link rel="icon" type="image/png" href="https://storage.googleapis.com/gpt-engineer-file-uploads/lEX2WyLqrUSJqVA1yOU4xheX8dm1/uploads/1769027149398-Emblem noir.png">
```

**Après** :
```html
<link rel="icon" type="image/png" href="/favicon.png">
```

## Avantages

- **Fiabilité** : Le favicon est stocké localement dans le projet, pas de dépendance à un service externe
- **Performance** : Chargement plus rapide car servi depuis le même domaine
- **Contrôle** : L'image fait partie du code source du projet

## Résultat attendu

Le favicon Stadio (emblème noir en forme de donut avec une encoche) s'affichera dans l'onglet du navigateur pour toutes les pages de l'application.
