import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { BroadcasterSelector } from "@/components/catalog/BroadcasterSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeft,
  Calendar,
  CheckCircle2,
  DollarSign,
  Edit,
  FileText,
  ImageIcon,
  Link2,
  Loader2,
  MapPin,
  Package,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Trophy,
  Search,
  Filter,
  Tv,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { TierBadge } from "@/components/admin/TierBadge";

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
  home_team_id: string | null;
  away_team_id: string | null;
  api_title: string | null;
  override_title: string | null;
  override_description: string | null;
  override_image_url: string | null;
  thumbnail_url: string | null;
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
    thumbnail_url: "",
    broadcaster: "",
    broadcaster_logo_url: "",
    manual_price: "",
    manual_tier: "" as PricingTier | "",
  });
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [thumbnailPrompt, setThumbnailPrompt] = useState("");
  const [showManualImageUrl, setShowManualImageUrl] = useState(false);
  const [showManualThumbnailUrl, setShowManualThumbnailUrl] = useState(false);
  const [teamLogos, setTeamLogos] = useState<{ home: string | null; away: string | null }>({ home: null, away: null });

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
      await supabase
        .from('event_pricing')
        .delete()
        .eq('event_id', eventId);
      
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
      const { error: eventError } = await supabase
        .from('events')
        .update({
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);
      
      if (eventError) throw eventError;

      const hasManualValues = !!(editForm.manual_price || editForm.manual_tier);
      const manualPriceValue = editForm.manual_price ? parseFloat(editForm.manual_price) : null;
      
      const { error: pricingError } = await supabase
        .from('event_pricing')
        .upsert({
          event_id: eventId,
          manual_price: manualPriceValue,
          manual_tier: editForm.manual_tier || null,
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
    const eventName = event.override_title || event.api_title || 
      `${event.home_team || ''} vs ${event.away_team || ''}`.trim() || 'Sports Event';
    const eventDate = format(new Date(event.event_date), "EEEE d MMMM yyyy", { locale: fr });
    const eventTime = format(new Date(event.event_date), "HH:mm", { locale: fr });
    
    return `Create a vertical cinematic poster (2:3 ratio) for a sports event, designed like a premium movie poster, with dramatic lighting, high contrast, and epic composition.

Event: ${eventName}
Sport: ${event.sport || 'Football'}
Competition / League: ${event.league || 'Competition'}
Event Date: ${eventDate}
Event Time: ${eventTime}
Venue / City: ${event.venue || 'Stadium'}

Visual style: cinematic, realistic, ultra-detailed, shallow depth of field, sharp focus, 4K, film grain, soft volumetric lighting, dramatic shadows.

Color grading: high-contrast, teal & orange cinematic palette, adapted to team colors.

Branding: subtle modern sports atmosphere, no real logos, no watermarks, no platform logos.

Rights & permissions: The user owns and is authorized to use all requested likenesses and visual references.

Camera: low-angle shot, 85mm lens look, dramatic perspective.

Final output: vertical poster, 1024x1536 or higher, suitable for mobile app thumbnail.`;
  };

  // Generate default thumbnail prompt
  const generateDefaultThumbnailPrompt = (event: CatalogEvent) => {
    const homeTeam = event.home_team || 'Home Team';
    const awayTeam = event.away_team || 'Away Team';
    const league = event.league || 'Competition';
    const eventDate = format(new Date(event.event_date), "EEEE d MMMM yyyy", { locale: fr });

    return `Create a clean, modern matchday card image (16:9 landscape ratio) for a sports event.

Layout:
- Split background with two team identity colors (diagonal or vertical split)
- Left side: visual representation of ${homeTeam} with their team emblem/crest style
- Right side: visual representation of ${awayTeam} with their team emblem/crest style
- Both sides feature large, prominent team emblems/crests
- Bottom overlay: event badge with competition name

Teams: ${homeTeam} vs ${awayTeam}
Competition: ${league}
Date: ${eventDate}

Style: bold colors, clean geometric shapes, professional sports broadcast aesthetic, similar to NFL Sunday Ticket / YouTube TV matchday cards.
No real logos, no watermarks. Use stylized crests inspired by each team's identity.
IMPORTANT: Generate a HORIZONTAL/LANDSCAPE image with aspect ratio 16:9 (wider than tall).`;
  };

  // Fetch team logos when event is opened
  const fetchTeamLogos = async (event: CatalogEvent) => {
    const logos: { home: string | null; away: string | null } = { home: null, away: null };
    if (event.home_team_id || event.away_team_id) {
      const ids = [event.home_team_id, event.away_team_id].filter(Boolean) as string[];
      const { data } = await supabase.from('teams').select('id, logo_url').in('id', ids);
      if (data) {
        for (const team of data) {
          if (team.id === event.home_team_id) logos.home = team.logo_url;
          if (team.id === event.away_team_id) logos.away = team.logo_url;
        }
      }
    }
    setTeamLogos(logos);
  };

  const openConfigurator = (event: CatalogEvent) => {
    setSelectedEvent(event);
    setEditForm({
      override_title: event.override_title || "",
      override_description: event.override_description || "",
      override_image_url: event.override_image_url || "",
      thumbnail_url: event.thumbnail_url || "",
      broadcaster: event.broadcaster || "",
      broadcaster_logo_url: event.broadcaster_logo_url || "",
      manual_price: "",
      manual_tier: "",
    });
    setImagePrompt(generateDefaultImagePrompt(event));
    setThumbnailPrompt(generateDefaultThumbnailPrompt(event));
    setShowManualImageUrl(!!event.override_image_url);
    setShowManualThumbnailUrl(!!event.thumbnail_url);
    fetchTeamLogos(event);
  };

  const handleSaveAndPromote = async () => {
    if (!selectedEvent) return;
    try {
      const { error: updateError } = await supabase
        .from('events')
        .update({
          override_title: editForm.override_title || null,
          override_description: editForm.override_description || null,
          override_image_url: editForm.override_image_url || null,
          thumbnail_url: editForm.thumbnail_url || null,
          broadcaster: editForm.broadcaster || null,
          broadcaster_logo_url: editForm.broadcaster_logo_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedEvent.id);
      if (updateError) throw updateError;
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
        thumbnail_url: editForm.thumbnail_url || null,
        broadcaster: editForm.broadcaster || null,
        broadcaster_logo_url: editForm.broadcaster_logo_url || null,
      },
    });
  };

  const handleGenerateThumbnail = async () => {
    if (!selectedEvent || !thumbnailPrompt.trim()) {
      toast.error('Veuillez saisir un prompt pour la vignette');
      return;
    }
    setIsGeneratingThumbnail(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { toast.error('Non authentifié'); return; }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({ prompt: thumbnailPrompt, eventId: selectedEvent.id }),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Erreur lors de la génération');
      setEditForm(prev => ({ ...prev, thumbnail_url: result.data.imageUrl }));
      toast.success('Vignette générée avec succès');
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la génération');
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!selectedEvent) return;
    setIsGeneratingDescription(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) { toast.error('Non authentifié'); return; }
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
      if (!response.ok || !result.success) throw new Error(result.error || 'Erreur lors de la génération');
      setEditForm(prev => ({ ...prev, override_description: result.data.description }));
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
      if (!session.data.session) { toast.error('Non authentifié'); return; }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({ prompt: imagePrompt, eventId: selectedEvent.id }),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Erreur lors de la génération');
      setEditForm(prev => ({ ...prev, override_image_url: result.data.imageUrl }));
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

  const getEventTitle = (event: CatalogEvent) =>
    event.override_title || event.api_title || `${event.home_team || '?'} vs ${event.away_team || '?'}`;

  const imageUrl = editForm.override_image_url;

  // Completion badges helper
  const hasDescription = !!editForm.override_description;
  const hasImage = !!editForm.override_image_url;
  const hasThumbnail = !!editForm.thumbnail_url;
  const hasBroadcaster = !!editForm.broadcaster;

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
                      onClick={() => openConfigurator(event)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">
                              {getEventTitle(event)}
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
                                <Badge variant="secondary" className="text-xs">Description ✓</Badge>
                              )}
                              {event.override_image_url && (
                                <Badge variant="secondary" className="text-xs">
                                  <ImageIcon className="h-3 w-3 mr-1" />Image ✓
                                </Badge>
                              )}
                              {event.thumbnail_url && (
                                <Badge variant="secondary" className="text-xs">
                                  <ImageIcon className="h-3 w-3 mr-1" />Vignette ✓
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openConfigurator(event); }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Configurer
                            </Button>
                            <Button 
                              variant="ghost" size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setEventToDelete(event); }}
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

      {/* ===== FULLSCREEN CONFIGURATOR DIALOG ===== */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">
            Configurer l'événement
          </DialogTitle>

          {/* Top bar */}
          <div className="flex items-center justify-between border-b px-6 py-3 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour au catalogue
            </Button>
            <h2 className="text-sm font-semibold hidden sm:block">Configurer l'événement</h2>
            <Button
              variant="ghost" size="sm"
              className="text-muted-foreground hover:text-destructive gap-2"
              onClick={() => setEventToDelete(selectedEvent)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Supprimer</span>
            </Button>
          </div>

          {selectedEvent && (
            <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
              {/* ===== LEFT COLUMN — PREVIEW ===== */}
              <div className="lg:w-[40%] border-b lg:border-b-0 lg:border-r bg-muted/30 flex flex-col overflow-y-auto">
                <div className="p-6 flex flex-col gap-5">
                  {/* Poster image */}
                  <div className="aspect-[2/3] w-full max-w-xs mx-auto rounded-lg overflow-hidden bg-muted border">
                    {imageUrl ? (
                      <img
                        src={`${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`}
                        alt="Event poster"
                        className="w-full h-full object-cover"
                        key={imageUrl}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <ImageIcon className="h-12 w-12 opacity-30" />
                        <span className="text-sm">Aucune image</span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail preview */}
                  {editForm.thumbnail_url && (
                    <div className="w-full max-w-xs mx-auto">
                      <p className="text-xs text-muted-foreground mb-1.5">Vignette Matchday</p>
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted border">
                        <img
                          src={`${editForm.thumbnail_url}${editForm.thumbnail_url.includes('?') ? '&' : '?'}t=${Date.now()}`}
                          alt="Matchday thumbnail"
                          className="w-full h-full object-cover"
                          key={editForm.thumbnail_url}
                        />
                      </div>
                    </div>
                  )}

                  {/* Event info */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold leading-tight">
                      {getEventTitle(selectedEvent)}
                    </h3>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{selectedEvent.sport}</Badge>
                      {selectedEvent.league && (
                        <Badge variant="outline">{selectedEvent.league}</Badge>
                      )}
                      {selectedEvent.round && (
                        <Badge variant="outline" className="text-xs">{selectedEvent.round}</Badge>
                      )}
                    </div>

                    <div className="text-sm space-y-1.5 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{format(new Date(selectedEvent.event_date), "EEEE d MMMM yyyy · HH:mm", { locale: fr })}</span>
                      </div>
                      {selectedEvent.venue && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{selectedEvent.venue}</span>
                        </div>
                      )}
                    </div>

                    {/* Status badge */}
                    <Badge variant="outline" className="text-xs">
                      <Package className="h-3 w-3 mr-1" />
                      En attente de configuration
                    </Badge>

                    {/* Completion badges */}
                    <div className="flex flex-col gap-1.5 pt-2">
                      <CompletionBadge done={hasDescription} label="Description" />
                      <CompletionBadge done={hasImage} label="Image" />
                      <CompletionBadge done={hasThumbnail} label="Vignette" />
                      <CompletionBadge done={hasBroadcaster} label="Diffuseur" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== RIGHT COLUMN — EDITOR ===== */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-6 pt-4 shrink-0">
                    <TabsList className="w-full justify-start">
                      <TabsTrigger value="content" className="gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Contenu
                      </TabsTrigger>
                      <TabsTrigger value="image" className="gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Image
                      </TabsTrigger>
                      <TabsTrigger value="broadcast" className="gap-1.5">
                        <Tv className="h-3.5 w-3.5" />
                        Diffusion
                      </TabsTrigger>
                      <TabsTrigger value="pricing" className="gap-1.5">
                        <DollarSign className="h-3.5 w-3.5" />
                        Tarification
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <ScrollArea className="flex-1 px-6 py-4">
                    {/* === TAB: CONTENU === */}
                    <TabsContent value="content" className="mt-0 space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="cfg_title">Titre personnalisé</Label>
                        <Input
                          id="cfg_title"
                          placeholder={selectedEvent.api_title || "Titre de l'événement"}
                          value={editForm.override_title}
                          onChange={(e) => setEditForm(prev => ({ ...prev, override_title: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Laissez vide pour utiliser le titre API : « {selectedEvent.api_title || `${selectedEvent.home_team} vs ${selectedEvent.away_team}`} »
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="cfg_description">Description</Label>
                          <Button
                            type="button" variant="outline" size="sm"
                            onClick={handleGenerateDescription}
                            disabled={isGeneratingDescription}
                            className="gap-1.5"
                          >
                            {isGeneratingDescription ? (
                              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Génération...</>
                            ) : (
                              <><Sparkles className="h-3.5 w-3.5" />Générer avec IA</>
                            )}
                          </Button>
                        </div>
                        <Textarea
                          id="cfg_description"
                          placeholder="Description de l'événement pour les utilisateurs..."
                          value={editForm.override_description}
                          onChange={(e) => setEditForm(prev => ({ ...prev, override_description: e.target.value }))}
                          rows={6}
                        />
                      </div>
                    </TabsContent>

                    {/* === TAB: IMAGE === */}
                    <TabsContent value="image" className="mt-0 space-y-8">
                      {/* --- Section 1: Poster principal --- */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Image principale (Poster cinématique)
                        </h3>

                        <div className="flex items-center gap-2">
                          <Button
                            variant={!showManualImageUrl ? "secondary" : "ghost"}
                            size="sm" onClick={() => setShowManualImageUrl(false)}
                            className="gap-1.5"
                          >
                            <Sparkles className="h-3.5 w-3.5" />IA
                          </Button>
                          <Button
                            variant={showManualImageUrl ? "secondary" : "ghost"}
                            size="sm" onClick={() => setShowManualImageUrl(true)}
                            className="gap-1.5"
                          >
                            <Link2 className="h-3.5 w-3.5" />URL manuelle
                          </Button>
                        </div>

                        {!showManualImageUrl ? (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="cfg_prompt">Prompt pour l'IA (modifiable)</Label>
                              <Textarea
                                id="cfg_prompt"
                                placeholder="Décrivez l'image souhaitée..."
                                value={imagePrompt}
                                onChange={(e) => setImagePrompt(e.target.value)}
                                rows={10}
                                className="text-xs font-mono"
                              />
                            </div>
                            <Button
                              type="button" variant="outline"
                              onClick={handleGenerateImage}
                              disabled={isGeneratingImage || !imagePrompt.trim()}
                              className="w-full gap-2"
                            >
                              {isGeneratingImage ? (
                                <><Loader2 className="h-4 w-4 animate-spin" />Génération en cours...</>
                              ) : (
                                <><Sparkles className="h-4 w-4" />Générer le poster</>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor="cfg_image_url">URL de l'image</Label>
                            <Input
                              id="cfg_image_url"
                              placeholder="https://..."
                              value={editForm.override_image_url}
                              onChange={(e) => setEditForm(prev => ({ ...prev, override_image_url: e.target.value }))}
                            />
                          </div>
                        )}

                        {editForm.override_image_url && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Aperçu poster (2:3)</Label>
                            <div className="relative max-w-[200px]">
                              <img
                                src={`${editForm.override_image_url}${editForm.override_image_url.includes('?') ? '&' : '?'}t=${Date.now()}`}
                                alt="Preview"
                                className="w-full aspect-[2/3] object-cover rounded-lg border"
                                key={editForm.override_image_url}
                              />
                              {!showManualImageUrl && (
                                <Button
                                  type="button" variant="secondary" size="sm"
                                  onClick={handleGenerateImage}
                                  disabled={isGeneratingImage}
                                  className="absolute top-2 right-2 h-7 gap-1"
                                >
                                  <RefreshCw className={`h-3 w-3 ${isGeneratingImage ? 'animate-spin' : ''}`} />
                                  Régénérer
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Separator */}
                      <div className="border-t" />

                      {/* --- Section 2: Vignette Matchday --- */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Vignette Matchday
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Image simplifiée avec les identités des deux équipes, au format paysage (16:9).
                        </p>

                        {/* Team logos preview */}
                        {(selectedEvent?.home_team || selectedEvent?.away_team) && (
                          <div className="flex items-center justify-center gap-6 p-4 rounded-lg bg-muted/50 border">
                            <div className="flex flex-col items-center gap-2">
                              {teamLogos.home ? (
                                <img src={teamLogos.home} alt="" className="h-12 w-12 object-contain" />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-muted border flex items-center justify-center text-xs text-muted-foreground">Logo</div>
                              )}
                              <span className="text-xs font-medium truncate max-w-[100px]">{selectedEvent?.home_team || '?'}</span>
                            </div>
                            <span className="text-lg font-bold text-muted-foreground">VS</span>
                            <div className="flex flex-col items-center gap-2">
                              {teamLogos.away ? (
                                <img src={teamLogos.away} alt="" className="h-12 w-12 object-contain" />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-muted border flex items-center justify-center text-xs text-muted-foreground">Logo</div>
                              )}
                              <span className="text-xs font-medium truncate max-w-[100px]">{selectedEvent?.away_team || '?'}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Button
                            variant={!showManualThumbnailUrl ? "secondary" : "ghost"}
                            size="sm" onClick={() => setShowManualThumbnailUrl(false)}
                            className="gap-1.5"
                          >
                            <Sparkles className="h-3.5 w-3.5" />IA
                          </Button>
                          <Button
                            variant={showManualThumbnailUrl ? "secondary" : "ghost"}
                            size="sm" onClick={() => setShowManualThumbnailUrl(true)}
                            className="gap-1.5"
                          >
                            <Link2 className="h-3.5 w-3.5" />URL manuelle
                          </Button>
                        </div>

                        {!showManualThumbnailUrl ? (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="cfg_thumbnail_prompt">Prompt pour la vignette (modifiable)</Label>
                              <Textarea
                                id="cfg_thumbnail_prompt"
                                placeholder="Décrivez la vignette souhaitée..."
                                value={thumbnailPrompt}
                                onChange={(e) => setThumbnailPrompt(e.target.value)}
                                rows={8}
                                className="text-xs font-mono"
                              />
                            </div>
                            <Button
                              type="button" variant="outline"
                              onClick={handleGenerateThumbnail}
                              disabled={isGeneratingThumbnail || !thumbnailPrompt.trim()}
                              className="w-full gap-2"
                            >
                              {isGeneratingThumbnail ? (
                                <><Loader2 className="h-4 w-4 animate-spin" />Génération en cours...</>
                              ) : (
                                <><Sparkles className="h-4 w-4" />Générer la vignette</>
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor="cfg_thumbnail_url">URL de la vignette</Label>
                            <Input
                              id="cfg_thumbnail_url"
                              placeholder="https://..."
                              value={editForm.thumbnail_url}
                              onChange={(e) => setEditForm(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                            />
                          </div>
                        )}

                        {editForm.thumbnail_url && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Aperçu vignette (16:9)</Label>
                            <div className="relative max-w-sm">
                              <img
                                src={`${editForm.thumbnail_url}${editForm.thumbnail_url.includes('?') ? '&' : '?'}t=${Date.now()}`}
                                alt="Thumbnail preview"
                                className="w-full aspect-video object-cover rounded-lg border"
                                key={editForm.thumbnail_url}
                              />
                              {!showManualThumbnailUrl && (
                                <Button
                                  type="button" variant="secondary" size="sm"
                                  onClick={handleGenerateThumbnail}
                                  disabled={isGeneratingThumbnail}
                                  className="absolute top-2 right-2 h-7 gap-1"
                                >
                                  <RefreshCw className={`h-3 w-3 ${isGeneratingThumbnail ? 'animate-spin' : ''}`} />
                                  Régénérer
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* === TAB: DIFFUSION === */}
                    <TabsContent value="broadcast" className="mt-0 space-y-6">
                      <div className="space-y-2">
                        <Label>Diffuseur</Label>
                        <p className="text-sm text-muted-foreground">
                          Sélectionnez le diffuseur pour cet événement. Les suggestions sont basées sur les contrats actifs.
                        </p>
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
                          sportId={selectedEvent.sport_id}
                          leagueId={selectedEvent.league_id}
                          eventDate={selectedEvent.event_date}
                        />
                      </div>

                      {editForm.broadcaster && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                          {editForm.broadcaster_logo_url && (
                            <img src={editForm.broadcaster_logo_url} alt="" className="h-8 w-8 rounded object-contain" />
                          )}
                          <div>
                            <div className="font-medium text-sm">{editForm.broadcaster}</div>
                            <div className="text-xs text-muted-foreground">Diffuseur sélectionné</div>
                          </div>
                          <Button
                            variant="ghost" size="sm" className="ml-auto text-muted-foreground"
                            onClick={() => setEditForm(prev => ({ ...prev, broadcaster: '', broadcaster_logo_url: '' }))}
                          >
                            Retirer
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    {/* === TAB: TARIFICATION === */}
                    <TabsContent value="pricing" className="mt-0 space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Tarification manuelle (optionnel)
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Définissez un prix et/ou un tier manuellement. Laissez vide pour que le système calcule automatiquement les tarifs.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cfg_price">Prix manuel (€)</Label>
                          <Input
                            id="cfg_price"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Ex: 9.99"
                            value={editForm.manual_price}
                            onChange={(e) => setEditForm(prev => ({ ...prev, manual_price: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cfg_tier">Tier</Label>
                          <Select
                            value={editForm.manual_tier}
                            onValueChange={(value) => setEditForm(prev => ({ ...prev, manual_tier: value as PricingTier }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Calcul automatique" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bronze">
                                <span className="flex items-center gap-2">Bronze</span>
                              </SelectItem>
                              <SelectItem value="silver">
                                <span className="flex items-center gap-2">Silver</span>
                              </SelectItem>
                              <SelectItem value="gold">
                                <span className="flex items-center gap-2">Gold</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Tier preview */}
                      {editForm.manual_tier && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                          <TierBadge tier={editForm.manual_tier as PricingTier} />
                          {editForm.manual_price && (
                            <span className="text-lg font-semibold">{parseFloat(editForm.manual_price).toFixed(2)} €</span>
                          )}
                          <Button
                            variant="ghost" size="sm" className="ml-auto text-muted-foreground"
                            onClick={() => setEditForm(prev => ({ ...prev, manual_tier: "", manual_price: "" }))}
                          >
                            Réinitialiser
                          </Button>
                        </div>
                      )}

                      <Card className="bg-muted/30 border-dashed">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            <strong>💡 Calcul automatique :</strong> Si aucun prix ou tier n'est renseigné, le système appliquera automatiquement
                            les règles de tarification définies dans la page <strong>Tarification → Configuration</strong>.
                            Les valeurs manuelles activent le flag <code className="text-xs bg-muted px-1 rounded">is_manual_override</code> lors
                            de la promotion vers Événements.
                          </p>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </ScrollArea>

                  {/* Sticky footer */}
                  <div className="border-t px-6 py-3 flex items-center justify-between shrink-0 bg-background">
                    <Button
                      variant="ghost" size="sm"
                      className="text-muted-foreground hover:text-destructive gap-2"
                      onClick={() => setEventToDelete(selectedEvent)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={handleSaveOnly}
                        disabled={updateEventMutation.isPending}
                      >
                        {updateEventMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Enregistrer
                      </Button>
                      <Button
                        onClick={handleSaveAndPromote}
                        disabled={updateEventMutation.isPending || promoteToDraftMutation.isPending}
                        className="gap-2"
                      >
                        {promoteToDraftMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Envoyer vers Événements
                      </Button>
                    </div>
                  </div>
                </Tabs>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

/* Small helper component for completion indicators */
function CompletionBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <CheckCircle2 className={`h-4 w-4 ${done ? 'text-green-500' : 'text-muted-foreground/30'}`} />
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}
