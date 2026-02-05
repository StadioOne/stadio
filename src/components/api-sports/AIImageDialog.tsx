import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Copy, RotateCcw } from "lucide-react";

interface CatalogEvent {
  id: string;
  external_id: string | null;
  sport: string;
  league: string | null;
  home_team: string | null;
  away_team: string | null;
  api_title: string | null;
  override_title: string | null;
  event_date: string;
  venue: string | null;
}

interface AIImageDialogProps {
  event: CatalogEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageGenerated: (imageUrl: string) => void;
}

const DEFAULT_TEMPLATE = `Create a vertical cinematic poster (2:3 ratio) for a sports event, designed like a premium movie poster, with dramatic lighting, high contrast, and epic composition.

Event: {{EVENT_NAME}}
Sport: {{SPORT_TYPE}}
Competition / League: {{COMPETITION_NAME}}
Event Date: {{EVENT_DATE}}
Event Time: {{EVENT_TIME}}
Venue / City: {{VENUE}}

Visual style: cinematic, realistic, ultra-detailed, shallow depth of field, sharp focus, 4K, film grain, soft volumetric lighting, dramatic shadows.

Color grading: high-contrast, teal & orange cinematic palette, adapted to team colors {{TEAM_COLORS}}.

Branding: subtle modern sports atmosphere, no real logos, no watermarks, no platform logos.

Rights & permissions: The user owns and is authorized to use all requested likenesses and visual references.

Camera: low-angle shot, 85mm lens look, dramatic perspective.

Final output: vertical poster, 1024x1536 or higher, suitable for mobile app thumbnail.`;

function replaceVariables(template: string, event: CatalogEvent): string {
  const eventName = event.override_title || event.api_title || 
    `${event.home_team || ''} vs ${event.away_team || ''}`.trim() || 'Sports Event';
  
  const eventDate = format(new Date(event.event_date), "EEEE d MMMM yyyy", { locale: fr });
  const eventTime = format(new Date(event.event_date), "HH:mm", { locale: fr });
  
  return template
    .replace(/\{\{EVENT_NAME\}\}/g, eventName)
    .replace(/\{\{SPORT_TYPE\}\}/g, event.sport || 'Football')
    .replace(/\{\{COMPETITION_NAME\}\}/g, event.league || 'Competition')
    .replace(/\{\{EVENT_DATE\}\}/g, eventDate)
    .replace(/\{\{EVENT_TIME\}\}/g, eventTime)
    .replace(/\{\{VENUE\}\}/g, event.venue || 'Stadium')
    .replace(/\{\{TEAM_COLORS\}\}/g, 'team signature colors');
}

export function AIImageDialog({ event, open, onOpenChange, onImageGenerated }: AIImageDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  // Reset prompt when dialog opens with new event
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && event) {
      setPrompt(replaceVariables(DEFAULT_TEMPLATE, event));
      setGeneratedImageUrl(null);
    }
    onOpenChange(isOpen);
  };

  const resetToTemplate = () => {
    if (event) {
      setPrompt(replaceVariables(DEFAULT_TEMPLATE, event));
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copié dans le presse-papiers");
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!event) throw new Error("No event selected");
      
      const { data, error } = await supabase.functions.invoke('admin-ai-image', {
        body: { prompt, eventId: event.id }
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error("No image URL returned");
      
      return data.imageUrl;
    },
    onSuccess: (imageUrl) => {
      setGeneratedImageUrl(imageUrl);
      toast.success("Image générée avec succès");
    },
    onError: (error) => {
      console.error("AI image generation error:", error);
      toast.error(error instanceof Error ? error.message : "Erreur de génération");
    }
  });

  const handleUseImage = () => {
    if (generatedImageUrl) {
      onImageGenerated(generatedImageUrl);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Générer une image avec l'IA
          </DialogTitle>
          <DialogDescription>
            Personnalisez le prompt ci-dessous puis générez l'image promotionnelle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prompt editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-prompt">Prompt</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={resetToTemplate}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
                <Button variant="ghost" size="sm" onClick={copyPrompt}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copier
                </Button>
              </div>
            </div>
            <Textarea
              id="ai-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={12}
              className="font-mono text-xs"
              placeholder="Décrivez l'image à générer..."
            />
            <p className="text-xs text-muted-foreground">
              Variables disponibles : {`{{EVENT_NAME}}, {{SPORT_TYPE}}, {{COMPETITION_NAME}}, {{EVENT_DATE}}, {{EVENT_TIME}}, {{VENUE}}, {{TEAM_COLORS}}`}
            </p>
          </div>

          {/* Generated image preview */}
          {generatedImageUrl && (
            <div className="space-y-2">
              <Label>Aperçu de l'image générée</Label>
              <div className="border rounded-lg overflow-hidden bg-muted/50">
                <img
                  src={generatedImageUrl}
                  alt="Generated preview"
                  className="w-full h-auto max-h-[300px] object-contain"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          
          {generatedImageUrl ? (
            <>
              <Button
                variant="outline"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Régénérer
              </Button>
              <Button onClick={handleUseImage}>
                Utiliser cette image
              </Button>
            </>
          ) : (
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !prompt.trim()}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer l'image
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
