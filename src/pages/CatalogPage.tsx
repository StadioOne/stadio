import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BroadcasterSelector } from "@/components/catalog/BroadcasterSelector";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  DollarSign,
  Edit,
  ImageIcon,
  Link2,
  Loader2,
  Package,
  Radio,
  RefreshCw,
  Send,
  Trash2,
  Trophy,
  Search,
  Filter,
  Sparkles,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PricingTier = Database["public"]["Enums"]["pricing_tier"];

interface CatalogEvent {
  id: string;
  external_id: string | null;
  sport: string;
  sport_id: string | null;
  league: string | null;
  league_id: string | null;
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

interface Sport {
  id: string;
  name: string;
  name_fr: string | null;
  slug: string;
  icon: string | null;
}

export default function CatalogPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<CatalogEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CatalogEvent | null>(null);
  const [editForm, setEditForm] = useState({
    override_title: "",
    override_description: "",
    override_image_url: "",
    broadcaster: "",
    broadcaster_logo_url: "",
    manual_price: "",
    manual_tier: "" as PricingTier | "",
  });
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [showManualImageUrl, setShowManualImageUrl] = useState(false);

  // Fetch all sports
  const { data: sports = [] } = useQuery({
    queryKey: ['catalog-sports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sports')
        .select('id, name, name_fr, slug, icon')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as Sport[];
    },
  });

  // Fetch catalog events (status = 'catalog')
  const { data: catalogEvents = [], isLoading } = useQuery({
    queryKey: ['catalog-events', sportFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'catalog')
        .order('event_date', { ascending: true });
      
      if (sportFilter && sportFilter !== 'all') {
        query = query.eq('sport_id', sportFilter);
      }

      if (searchQuery) {
        query = query.or(`home_team.ilike.%${searchQuery}%,away_team.ilike.%${searchQuery}%,league.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
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
      queryClient.invalidateQueries({ queryKey: ['catalog-events'] });
      toast.success('Événement mis à jour');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur de mise à jour');
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      // Supprimer d'abord le pricing associé
      await supabase
        .from('event_pricing')
        .delete()
        .eq('event_id', eventId);
      
      // Puis supprimer l'événement
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-events'] });
      setEventToDelete(null);
      setSelectedEvent(null);
      toast.success('Événement supprimé');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur de suppression');
    },
  });

  // Promote to draft mutation
  const promoteToDraftMutation = useMutation({
    mutationFn: async (eventId: string) => {
      // Update event to draft status
      const { error: eventError } = await supabase
        .from('events')
        .update({
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);
      
      if (eventError) throw eventError;

      // Always create/update pricing entry
      const hasManualValues = !!(editForm.manual_price || editForm.manual_tier);
      const manualPriceValue = editForm.manual_price ? parseFloat(editForm.manual_price) : null;
      
      const { error: pricingError } = await supabase
        .from('event_pricing')
        .upsert({
          event_id: eventId,
          manual_price: manualPriceValue,
          manual_tier: editForm.manual_tier || null,
          // Set computed values equal to manual values when manual override is active
          computed_price: hasManualValues ? manualPriceValue : null,
          computed_tier: hasManualValues ? (editForm.manual_tier || null) : null,
          is_manual_override: hasManualValues,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'event_id' });
      
      if (pricingError) throw pricingError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedEvent(null);
      toast.success('Événement envoyé vers la page Événements');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur');
    },
  });

  // Generate default image prompt based on event data
  const generateDefaultImagePrompt = (event: CatalogEvent) => {
    const parts = [`Affiche promotionnelle moderne pour un match de ${event.sport}`];
    
    if (event.home_team && event.away_team) {
      parts.push(`entre ${event.home_team} et ${event.away_team}`);
    }
    
    if (event.league) {
      parts.push(`en ${event.league}`);
    }
    
    parts.push(
      'Style: dynamique, couleurs vives, ambiance de stade',
      'format horizontal 16:9, qualité professionnelle',
      'sans texte ni logo'
    );
    
    return parts.join('. ') + '.';
  };

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
    setImagePrompt(generateDefaultImagePrompt(event));
    setShowManualImageUrl(!!event.override_image_url);
  };

  const handleSaveAndPromote = async () => {
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

    await promoteToDraftMutation.mutateAsync(selectedEvent.id);
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

  const handleGenerateDescription = async () => {
    if (!selectedEvent) return;

    setIsGeneratingDescription(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-description`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            event: {
              sport: selectedEvent.sport,
              league: selectedEvent.league,
              home_team: selectedEvent.home_team,
              away_team: selectedEvent.away_team,
              event_date: selectedEvent.event_date,
              venue: selectedEvent.venue,
              round: selectedEvent.round,
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de la génération');
      }

      setEditForm(prev => ({
        ...prev,
        override_description: result.data.description,
      }));
      toast.success('Description générée avec succès');
    } catch (error) {
      console.error('Error generating description:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la génération');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!selectedEvent || !imagePrompt.trim()) {
      toast.error('Veuillez saisir un prompt pour l\'image');
      return;
    }

    setIsGeneratingImage(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error('Non authentifié');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            prompt: imagePrompt,
            eventId: selectedEvent.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de la génération');
      }

      setEditForm(prev => ({
        ...prev,
        override_image_url: result.data.imageUrl,
      }));
      toast.success('Image générée avec succès');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la génération');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Group events by sport
  const groupedEvents = catalogEvents.reduce((acc, event) => {
    const sportKey = event.sport || 'Autre';
    if (!acc[sportKey]) acc[sportKey] = [];
    acc[sportKey].push(event);
    return acc;
  }, {} as Record<string, CatalogEvent[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Package className="h-7 w-7" />
          Catalogue
        </h1>
        <p className="text-muted-foreground">
          Événements importés depuis l'API Sports en attente de configuration avant publication
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{catalogEvents.length}</div>
            <div className="text-sm text-muted-foreground">En attente</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {catalogEvents.filter(e => e.broadcaster).length}
            </div>
            <div className="text-sm text-muted-foreground">Avec broadcaster</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {catalogEvents.filter(e => e.override_description).length}
            </div>
            <div className="text-sm text-muted-foreground">Avec description</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {Object.keys(groupedEvents).length}
            </div>
            <div className="text-sm text-muted-foreground">Sports</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un événement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={sportFilter} onValueChange={setSportFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tous les sports" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sports</SelectItem>
                  {sports.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.icon} {sport.name_fr || sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Chargement du catalogue...</p>
          </CardContent>
        </Card>
      ) : catalogEvents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">Catalogue vide</h3>
            <p className="max-w-md mx-auto">
              Aucun événement dans le catalogue. Importez des matchs depuis la page 
              <strong> Paramètres → API Sports</strong> pour les voir apparaître ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-400px)] min-h-[400px]">
          <div className="space-y-6 pr-4">
            {Object.entries(groupedEvents).map(([sportName, events]) => (
              <div key={sportName}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  {sportName}
                  <Badge variant="secondary">{events.length}</Badge>
                </h3>
                <div className="grid gap-3">
                  {events.map((event) => (
                    <Card 
                      key={event.id} 
                      className="hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => openEditSheet(event)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
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
                                  {event.league}
                                </>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {event.broadcaster ? (
                                <Badge variant="default" className="text-xs">
                                  <Radio className="h-3 w-3 mr-1" />
                                  {event.broadcaster}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  <Radio className="h-3 w-3 mr-1" />
                                  Sans broadcaster
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

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditSheet(event); }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Configurer
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setEventToDelete(event); 
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Edit Sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configurer l'événement</SheetTitle>
            <SheetDescription>
              {selectedEvent?.api_title || `${selectedEvent?.home_team} vs ${selectedEvent?.away_team}`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Event info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sport:</span>
                  <span className="font-medium">{selectedEvent?.sport}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ligue:</span>
                  <span className="font-medium">{selectedEvent?.league || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {selectedEvent && format(new Date(selectedEvent.event_date), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

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
              <div className="flex items-center justify-between">
                <Label htmlFor="override_description">Description</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDescription}
                  className="gap-1.5"
                >
                  {isGeneratingDescription ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Générer avec IA
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="override_description"
                placeholder="Description de l'événement pour les utilisateurs..."
                value={editForm.override_description}
                onChange={(e) => setEditForm(prev => ({ ...prev, override_description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Image Section */}
            <Card className="bg-muted/30 border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Image de l'événement
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={!showManualImageUrl ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setShowManualImageUrl(false)}
                      className="text-xs h-7"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      IA
                    </Button>
                    <Button
                      variant={showManualImageUrl ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setShowManualImageUrl(true)}
                      className="text-xs h-7"
                    >
                      <Link2 className="h-3 w-3 mr-1" />
                      URL
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!showManualImageUrl ? (
                  <>
                    {/* AI Prompt Input */}
                    <div className="space-y-2">
                      <Label htmlFor="image_prompt" className="text-xs text-muted-foreground">
                        Prompt pour l'IA
                      </Label>
                      <Textarea
                        id="image_prompt"
                        placeholder="Décrivez l'image souhaitée..."
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                    
                    {/* Generate Button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage || !imagePrompt.trim()}
                      className="w-full gap-2"
                    >
                      {isGeneratingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Génération en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Générer l'image
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  /* Manual URL Input */
                  <div className="space-y-2">
                    <Label htmlFor="override_image_url" className="text-xs text-muted-foreground">
                      URL de l'image
                    </Label>
                    <Input
                      id="override_image_url"
                      placeholder="https://..."
                      value={editForm.override_image_url}
                      onChange={(e) => setEditForm(prev => ({ ...prev, override_image_url: e.target.value }))}
                    />
                  </div>
                )}

                {/* Image Preview */}
                {editForm.override_image_url && (
                  <div className="relative">
                    <img 
                      src={`${editForm.override_image_url}${editForm.override_image_url.includes('?') ? '&' : '?'}t=${Date.now()}`} 
                      alt="Preview" 
                      className="w-full h-32 object-cover rounded-lg border"
                      key={editForm.override_image_url}
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      {!showManualImageUrl && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleGenerateImage}
                          disabled={isGeneratingImage}
                          className="h-7 gap-1"
                        >
                          <RefreshCw className={`h-3 w-3 ${isGeneratingImage ? 'animate-spin' : ''}`} />
                          Régénérer
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {editForm.override_image_url}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Broadcaster */}
            <div className="space-y-2">
              <Label>Diffuseur</Label>
              <BroadcasterSelector
                value={editForm.broadcaster ? {
                  name: editForm.broadcaster,
                  logo_url: editForm.broadcaster_logo_url || null,
                } : null}
                onChange={(b) => setEditForm(prev => ({
                  ...prev,
                  broadcaster: b?.name || '',
                  broadcaster_logo_url: b?.logo_url || '',
                }))}
                sportId={selectedEvent?.sport_id}
                leagueId={selectedEvent?.league_id}
                eventDate={selectedEvent?.event_date}
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

            {/* Delete button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setEventToDelete(selectedEvent)}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer l'événement
            </Button>

            <Separator className="my-2" />

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
                Publier vers Événements
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!eventToDelete} 
        onOpenChange={(open) => !open && setEventToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'événement</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'événement "
              {eventToDelete?.override_title || eventToDelete?.api_title || 
               `${eventToDelete?.home_team} vs ${eventToDelete?.away_team}`}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eventToDelete && deleteEventMutation.mutate(eventToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteEventMutation.isPending}
            >
              {deleteEventMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
