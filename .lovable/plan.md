
# Plan : Génération d'images IA avec Lovable AI (Nano Banana Pro)

## Objectif

Ajouter un générateur d'images IA dans le configurateur d'événements du catalogue. L'utilisateur pourra :
1. Rédiger/modifier un prompt décrivant l'image souhaitée
2. Générer l'image via IA (Google Gemini Image)
3. L'image sera uploadée dans le storage et l'URL mise à jour automatiquement

## Bonne nouvelle 🎉

Le projet dispose déjà de `LOVABLE_API_KEY` configuré, ce qui permet d'utiliser **Lovable AI** avec le modèle `google/gemini-3-pro-image-preview` (Nano Banana Pro) pour la génération d'images **sans clé API supplémentaire**.

## Architecture technique

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      Frontend (CatalogPage)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Image de l'événement                [✨ Générer avec IA]    │    │
│  │ ┌─────────────────────────────────────────────────────────┐ │    │
│  │ │ Prompt: "Affiche dynamique match PSG vs OM, stade,     │ │    │
│  │ │ ambiance nocturne, style moderne"                       │ │    │
│  │ └─────────────────────────────────────────────────────────┘ │    │
│  │ ┌─────────────────────────────────────────────────────────┐ │    │
│  │ │ [Preview de l'image générée]                           │ │    │
│  │ └─────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                               │                                     │
│                               ▼                                     │
│                    Appel Edge Function                              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Edge Function: admin-ai-image                           │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Reçoit le prompt personnalisé                                    │
│ 2. Appelle Lovable AI (google/gemini-3-pro-image-preview)           │
│ 3. Décode l'image base64 retournée                                  │
│ 4. Upload vers Supabase Storage (bucket event-images)               │
│ 5. Retourne l'URL publique de l'image                               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Lovable AI Gateway                              │
├─────────────────────────────────────────────────────────────────────┤
│ Modèle: google/gemini-3-pro-image-preview                           │
│ Retourne: image base64 + texte                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Fichiers à créer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `supabase/functions/admin-ai-image/index.ts` | Créer | Edge Function pour générer et stocker l'image |
| `supabase/config.toml` | Modifier | Ajouter configuration de la fonction |
| `src/pages/CatalogPage.tsx` | Modifier | Interface de génération d'image avec prompt éditable |
| Migration SQL | Créer | Bucket storage `event-images` avec politiques RLS |

## Détails d'implémentation

### 1. Bucket Storage `event-images`

```sql
-- Créer le bucket pour les images d'événements
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-images', 'event-images', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp']);

-- Politique: lecture publique
CREATE POLICY "Public read access for event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

-- Politique: admins peuvent uploader
CREATE POLICY "Admins can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-images' 
  AND EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
```

### 2. Edge Function `admin-ai-image`

**Endpoint :** POST `/functions/v1/admin-ai-image`

**Input :**
```json
{
  "prompt": "Affiche dynamique pour le match PSG vs Olympique de Marseille...",
  "eventId": "uuid-de-l-evenement"
}
```

**Logique :**
```text
1. Valider l'authentification admin
2. Construire le prompt enrichi pour la génération
3. Appeler Lovable AI Gateway:
   - URL: https://ai.gateway.lovable.dev/v1/chat/completions
   - Model: google/gemini-3-pro-image-preview
   - modalities: ["image", "text"]
4. Extraire l'image base64 de la réponse
5. Décoder et uploader vers storage/event-images/{eventId}.png
6. Retourner l'URL publique
```

**Appel Lovable AI :**
```typescript
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-3-pro-image-preview',
    messages: [{
      role: 'user',
      content: prompt
    }],
    modalities: ['image', 'text']
  })
});

// Réponse attendue:
// data.choices[0].message.images[0].image_url.url = "data:image/png;base64,..."
```

### 3. Interface utilisateur (CatalogPage.tsx)

**Remplacement de la section Image URL :**

```text
┌────────────────────────────────────────────────────────────────┐
│ Image de l'événement                                           │
├────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Prompt pour l'IA (modifiable)                              │ │
│ │ ┌────────────────────────────────────────────────────────┐ │ │
│ │ │ Affiche dynamique pour le match de football PSG vs    │ │ │
│ │ │ Olympique de Marseille, stade illuminé, ambiance      │ │ │
│ │ │ nocturne, style moderne et professionnel              │ │ │
│ │ └────────────────────────────────────────────────────────┘ │ │
│ │                                                            │ │
│ │ ┌─────────────────────┐  ┌────────────────────────────┐   │ │
│ │ │ ✨ Générer l'image  │  │ 🔗 Ou utiliser une URL     │   │ │
│ │ └─────────────────────┘  └────────────────────────────┘   │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │                                                            │ │
│ │              [Preview de l'image]                         │ │
│ │                   1024 x 1024                              │ │
│ │                                                            │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ URL: https://xxx.supabase.co/storage/v1/object/public/...     │
└────────────────────────────────────────────────────────────────┘
```

**Fonctionnalités :**
- Prompt pré-rempli automatiquement basé sur les données de l'événement
- Textarea éditable pour personnaliser le prompt
- Bouton "Générer l'image" avec état de chargement
- Toggle pour basculer vers saisie manuelle d'URL si préféré
- Preview de l'image générée
- URL affichée et copiable

### 4. Génération automatique du prompt initial

Lors de l'ouverture du configurateur, un prompt par défaut est généré :

```typescript
const generateDefaultPrompt = (event: CatalogEvent) => {
  const parts = [
    `Affiche promotionnelle moderne pour un match de ${event.sport}`,
  ];
  
  if (event.home_team && event.away_team) {
    parts.push(`entre ${event.home_team} et ${event.away_team}`);
  }
  
  if (event.league) {
    parts.push(`en ${event.league}`);
  }
  
  parts.push(
    'Style: dynamique, couleurs vives, ambiance de stade,',
    'format horizontal 16:9, qualité professionnelle,',
    'sans texte ni logo'
  );
  
  return parts.join('. ');
};
```

## États UI

| État | Interface |
|------|-----------|
| Idle | Prompt pré-rempli, bouton "Générer" actif |
| Loading | Bouton désactivé + spinner + "Génération en cours..." |
| Succès | Image affichée, URL mise à jour, toast de confirmation |
| Erreur | Toast d'erreur, bouton réactivé pour retry |

## Sécurité

- Edge Function protégée par authentification admin
- `LOVABLE_API_KEY` jamais exposée côté client
- Bucket storage avec RLS : lecture publique, écriture admin uniquement
- Images nommées par `eventId` pour éviter les conflits

## UX Flow

1. L'admin ouvre le sheet de configuration d'un événement
2. Un prompt par défaut est généré automatiquement basé sur les infos du match
3. L'admin peut modifier le prompt selon ses besoins
4. Il clique sur "Générer l'image"
5. Spinner pendant 5-10 secondes (génération + upload)
6. L'image apparaît en preview avec son URL
7. L'admin peut régénérer avec un prompt modifié si nécessaire
8. Enregistrer met à jour `override_image_url` avec l'URL du storage
