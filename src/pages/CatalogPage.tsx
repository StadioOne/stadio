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
  Calendar,
  DollarSign,
  Edit,
  ImageIcon,
  Loader2,
  Package,
  Radio,
  Send,
  Trophy,
  Search,
  Filter,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PricingTier = Database["public"]["Enums"]["pricing_tier"];

interface CatalogEvent {
  id: string;
  external_id: string | null;
  sport: string;
  sport_id: string | null;
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
  const [editForm, setEditForm] = useState({
    override_title: "",
    override_description: "",
    override_image_url: "",
    broadcaster: "",
    broadcaster_logo_url: "",
    manual_price: "",
    manual_tier: "" as PricingTier | "",
  });

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
      queryClient.invalidateQueries({ queryKey: ['catalog-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedEvent(null);
      toast.success('Événement envoyé vers la page Événements');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur');
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

                          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditSheet(event); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Configurer
                          </Button>
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
              <Label htmlFor="override_description">Description</Label>
              <Textarea
                id="override_description"
                placeholder="Description de l'événement pour les utilisateurs..."
                value={editForm.override_description}
                onChange={(e) => setEditForm(prev => ({ ...prev, override_description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="override_image_url">URL de l'image</Label>
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
                Publier vers Événements
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
