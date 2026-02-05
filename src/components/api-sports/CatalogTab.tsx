import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ArrowRight,
  Calendar,
  DollarSign,
  Edit,
  ImageIcon,
  Loader2,
  Radio,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { AIImageDialog } from "./AIImageDialog";

type PricingTier = Database["public"]["Enums"]["pricing_tier"];

interface Sport {
  id: string;
  name: string;
  name_fr: string | null;
  slug: string;
}

interface CatalogEvent {
  id: string;
  external_id: string | null;
  sport: string;
  league: string | null;
  home_team: string | null;
  away_team: string | null;
  api_title: string | null;
  override_title: string | null;
  override_description: string | null;
  override_image_url: string | null;
  event_date: string;
  venue: string | null;
  round: string | null;
  broadcaster: string | null;
  broadcaster_logo_url: string | null;
  created_at: string;
}

interface CatalogTabProps {
  sport: Sport;
}

export function CatalogTab({ sport }: CatalogTabProps) {
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<CatalogEvent | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    override_title: "",
    override_description: "",
    override_image_url: "",
    broadcaster: "",
    broadcaster_logo_url: "",
    manual_price: "",
    manual_tier: "" as PricingTier | "",
  });

  // Fetch catalog events for this sport
  const { data: catalogEvents = [], isLoading } = useQuery({
    queryKey: ['catalog-events', sport.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('sport_id', sport.id)
        .eq('status', 'catalog')
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return data as CatalogEvent[];
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, updates }: { eventId: string; updates: Partial<CatalogEvent> }) => {
      const { error } = await supabase
        .from('events')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-events', sport.id] });
      toast.success('Événement mis à jour');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur de mise à jour');
    },
  });

  // Promote to draft mutation
  const promoteToDraftMutation = useMutation({
    mutationFn: async (eventId: string) => {
      // First update the event to draft status
      const { error: eventError } = await supabase
        .from('events')
        .update({
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);
      
      if (eventError) throw eventError;

      // Create pricing entry if manual values are set
      if (editForm.manual_price || editForm.manual_tier) {
        const { error: pricingError } = await supabase
          .from('event_pricing')
          .upsert({
            event_id: eventId,
            manual_price: editForm.manual_price ? parseFloat(editForm.manual_price) : null,
            manual_tier: editForm.manual_tier || null,
            is_manual_override: !!(editForm.manual_price || editForm.manual_tier),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'event_id' });
        
        if (pricingError) throw pricingError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-events', sport.id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedEvent(null);
      toast.success('Événement envoyé vers la page Événements');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur de promotion');
    },
  });

  const openEditSheet = (event: CatalogEvent) => {
    setSelectedEvent(event);
    setEditForm({
      override_title: event.override_title || "",
      override_description: event.override_description || "",
      override_image_url: event.override_image_url || "",
      broadcaster: event.broadcaster || "",
      broadcaster_logo_url: event.broadcaster_logo_url || "",
      manual_price: "",
      manual_tier: "",
    });
  };

  const handleSaveAndPromote = async () => {
    if (!selectedEvent) return;

    try {
      // 1. Mise à jour silencieuse (sans toast) - appel direct à Supabase
      const { error: updateError } = await supabase
        .from('events')
        .update({
          override_title: editForm.override_title || null,
          override_description: editForm.override_description || null,
          override_image_url: editForm.override_image_url || null,
          broadcaster: editForm.broadcaster || null,
          broadcaster_logo_url: editForm.broadcaster_logo_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedEvent.id);

      if (updateError) throw updateError;

      // 2. Promotion vers draft (avec toast de succès)
      await promoteToDraftMutation.mutateAsync(selectedEvent.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la publication');
    }
  };

  const handleSaveOnly = async () => {
    if (!selectedEvent) return;

    await updateEventMutation.mutateAsync({
      eventId: selectedEvent.id,
      updates: {
        override_title: editForm.override_title || null,
        override_description: editForm.override_description || null,
        override_image_url: editForm.override_image_url || null,
        broadcaster: editForm.broadcaster || null,
        broadcaster_logo_url: editForm.broadcaster_logo_url || null,
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Chargement du catalogue...</p>
        </CardContent>
      </Card>
    );
  }

  if (catalogEvents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun événement dans le catalogue</p>
          <p className="text-sm mt-2">
            Importez des matchs depuis l'onglet "Matchs" pour les configurer ici
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {catalogEvents.length} événement(s) en attente de configuration
          </h3>
        </div>

        <ScrollArea className="h-[500px]">
          <div className="space-y-3 pr-4">
            {catalogEvents.map((event) => (
              <Card key={event.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Event info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {event.override_title || event.api_title || `${event.home_team} vs ${event.away_team}`}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.event_date), "dd MMM yyyy HH:mm", { locale: fr })}
                        {event.league && (
                          <>
                            <span>•</span>
                            <Trophy className="h-3 w-3" />
                            {event.league}
                          </>
                        )}
                      </div>
                      
                      {/* Configuration status */}
                      <div className="flex items-center gap-2 mt-2">
                        {event.broadcaster && (
                          <Badge variant="secondary" className="text-xs">
                            <Radio className="h-3 w-3 mr-1" />
                            {event.broadcaster}
                          </Badge>
                        )}
                        {event.override_description && (
                          <Badge variant="secondary" className="text-xs">
                            Description ✓
                          </Badge>
                        )}
                        {event.override_image_url && (
                          <Badge variant="secondary" className="text-xs">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            Image ✓
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditSheet(event)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Configurer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Edit Sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Configurer l'événement</SheetTitle>
            <SheetDescription>
              {selectedEvent?.api_title || `${selectedEvent?.home_team} vs ${selectedEvent?.away_team}`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Title override */}
            <div className="space-y-2">
              <Label htmlFor="override_title">Titre personnalisé</Label>
              <Input
                id="override_title"
                placeholder={selectedEvent?.api_title || "Titre de l'événement"}
                value={editForm.override_title}
                onChange={(e) => setEditForm(prev => ({ ...prev, override_title: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="override_description">Description</Label>
              <Textarea
                id="override_description"
                placeholder="Description de l'événement..."
                value={editForm.override_description}
                onChange={(e) => setEditForm(prev => ({ ...prev, override_description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="override_image_url">URL de l'image</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAiDialogOpen(true)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Générer avec IA
                </Button>
              </div>
              <Input
                id="override_image_url"
                placeholder="https://..."
                value={editForm.override_image_url}
                onChange={(e) => setEditForm(prev => ({ ...prev, override_image_url: e.target.value }))}
              />
              {editForm.override_image_url && (
                <img 
                  src={editForm.override_image_url} 
                  alt="Preview" 
                  className="mt-2 h-24 w-auto object-contain rounded border"
                />
              )}
            </div>

            {/* Broadcaster */}
            <div className="space-y-2">
              <Label htmlFor="broadcaster">Diffuseur (Broadcaster)</Label>
              <Input
                id="broadcaster"
                placeholder="Canal+, beIN Sports, DAZN..."
                value={editForm.broadcaster}
                onChange={(e) => setEditForm(prev => ({ ...prev, broadcaster: e.target.value }))}
              />
            </div>

            {/* Broadcaster logo */}
            <div className="space-y-2">
              <Label htmlFor="broadcaster_logo_url">Logo du diffuseur (URL)</Label>
              <Input
                id="broadcaster_logo_url"
                placeholder="https://..."
                value={editForm.broadcaster_logo_url}
                onChange={(e) => setEditForm(prev => ({ ...prev, broadcaster_logo_url: e.target.value }))}
              />
            </div>

            {/* Pricing section */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Tarification (optionnel)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manual_price">Prix manuel (€)</Label>
                    <Input
                      id="manual_price"
                      type="number"
                      step="0.01"
                      placeholder="9.99"
                      value={editForm.manual_price}
                      onChange={(e) => setEditForm(prev => ({ ...prev, manual_price: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual_tier">Tier</Label>
                    <Select
                      value={editForm.manual_tier}
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, manual_tier: value as PricingTier }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bronze">Bronze</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour utiliser le calcul automatique
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleSaveOnly}
                disabled={updateEventMutation.isPending}
              >
                {updateEventMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveAndPromote}
                disabled={updateEventMutation.isPending || promoteToDraftMutation.isPending}
              >
                {promoteToDraftMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Envoyer vers Événements
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* AI Image Dialog */}
      <AIImageDialog
        event={selectedEvent}
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onImageGenerated={(imageUrl) => {
          setEditForm(prev => ({ ...prev, override_image_url: imageUrl }));
        }}
      />
    </>
  );
}
