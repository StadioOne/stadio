import { useState, useMemo } from 'react';
import { format, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Calendar, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEventsForRights, useLeaguesForSelect } from '@/hooks/useEventsForRights';
import { useRightsConflicts } from '@/hooks/useRightsConflicts';
import { useTerritories } from '@/hooks/useTerritories';
import { useRightsMutations } from '@/hooks/useRightsMutations';
import { TerritoriesBadge } from './TerritoriesBadge';
import type { Database } from '@/integrations/supabase/types';

type RightsExclusivity = Database['public']['Enums']['rights_exclusivity'];
type RightsPlatform = Database['public']['Enums']['rights_platform'];
type RightsStatus = Database['public']['Enums']['rights_status'];

interface RightsBulkDialogProps {
  broadcasterId: string;
  broadcasterName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RightsBulkDialog({
  broadcasterId,
  broadcasterName,
  open,
  onOpenChange,
}: RightsBulkDialogProps) {
  // Step 1: Event selection filters
  const [leagueId, setLeagueId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());

  // Step 2: Rights configuration
  const [rightsLive, setRightsLive] = useState(true);
  const [rightsReplay, setRightsReplay] = useState(true);
  const [rightsHighlights, setRightsHighlights] = useState(false);
  const [replayWindowHours, setReplayWindowHours] = useState(168); // 7 days
  const [exclusivity, setExclusivity] = useState<RightsExclusivity>('non_exclusive');
  const [platform, setPlatform] = useState<RightsPlatform>('both');
  const [status, setStatus] = useState<RightsStatus>('active');
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>(['FR']);

  // Data
  const { data: leagues } = useLeaguesForSelect();
  const { data: territories } = useTerritories();
  const { data: events, isLoading: eventsLoading } = useEventsForRights({
    leagueId: leagueId || undefined,
    dateFrom,
    dateTo,
    status: 'published',
  });
  const { createRight } = useRightsMutations();

  // Conflict detection
  const { data: conflicts, isLoading: conflictsLoading } = useRightsConflicts(
    selectedEventIds.size > 0 && exclusivity === 'exclusive'
      ? {
          eventIds: Array.from(selectedEventIds),
          broadcasterId,
          territories: selectedTerritories,
          exclusivity,
        }
      : null
  );

  // Computed values
  const conflictEventIds = useMemo(
    () => new Set(conflicts?.map((c) => c.eventId) || []),
    [conflicts]
  );

  const eventsWithoutConflicts = useMemo(() => {
    return Array.from(selectedEventIds).filter((id) => !conflictEventIds.has(id));
  }, [selectedEventIds, conflictEventIds]);

  const handleSelectAll = () => {
    if (!events) return;
    if (selectedEventIds.size === events.length) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(events.map((e) => e.id)));
    }
  };

  const handleToggleEvent = (eventId: string) => {
    const newSet = new Set(selectedEventIds);
    if (newSet.has(eventId)) {
      newSet.delete(eventId);
    } else {
      newSet.add(eventId);
    }
    setSelectedEventIds(newSet);
  };

  const handleToggleTerritory = (code: string) => {
    setSelectedTerritories((prev) =>
      prev.includes(code) ? prev.filter((t) => t !== code) : [...prev, code]
    );
  };

  const handleSubmit = async () => {
    const eventIds = eventsWithoutConflicts;
    
    // Create rights for each event
    for (const eventId of eventIds) {
      await createRight.mutateAsync({
        event_id: eventId,
        broadcaster_id: broadcasterId,
        rights_live: rightsLive,
        rights_replay: rightsReplay,
        rights_highlights: rightsHighlights,
        replay_window_hours: rightsReplay ? replayWindowHours : null,
        territories_allowed: selectedTerritories,
        territories_blocked: [],
        exclusivity,
        platform,
        status,
      });
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedEventIds(new Set());
    setLeagueId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Attribution en masse</DialogTitle>
          <DialogDescription>
            Attribuer des droits de diffusion pour {broadcasterName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Step 1: Event Selection */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
              Sélection des événements
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Compétition</Label>
                <Select value={leagueId} onValueChange={setLeagueId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les compétitions</SelectItem>
                    {leagues?.map((league) => (
                      <SelectItem key={league.id} value={league.id}>
                        {league.name} {league.country && `(${league.country})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date début</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date fin</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Events list */}
            <div className="border rounded-lg">
              <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={events?.length ? selectedEventIds.size === events.length : false}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedEventIds.size} / {events?.length || 0} événements sélectionnés
                  </span>
                </div>
              </div>

              <ScrollArea className="h-[200px]">
                {eventsLoading ? (
                  <div className="p-4 space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : !events?.length ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun événement trouvé pour ces critères</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {events.map((event) => {
                      const title = event.override_title || event.api_title ||
                        `${event.home_team || ''} vs ${event.away_team || ''}`;
                      const hasConflict = conflictEventIds.has(event.id);

                      return (
                        <label
                          key={event.id}
                          className={`flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer ${
                            hasConflict ? 'bg-destructive/5' : ''
                          }`}
                        >
                          <Checkbox
                            checked={selectedEventIds.has(event.id)}
                            onCheckedChange={() => handleToggleEvent(event.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{title}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.league} • {format(new Date(event.event_date), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </p>
                          </div>
                          {hasConflict && (
                            <Badge variant="destructive" className="shrink-0">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Conflit
                            </Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Step 2: Rights Configuration */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
              Configuration des droits
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Rights types */}
              <div className="space-y-3">
                <Label>Types de droits</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rights-live" className="font-normal">Live</Label>
                    <Switch id="rights-live" checked={rightsLive} onCheckedChange={setRightsLive} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rights-replay" className="font-normal">Replay</Label>
                    <Switch id="rights-replay" checked={rightsReplay} onCheckedChange={setRightsReplay} />
                  </div>
                  {rightsReplay && (
                    <div className="flex items-center gap-2 pl-4">
                      <Input
                        type="number"
                        value={replayWindowHours}
                        onChange={(e) => setReplayWindowHours(Number(e.target.value))}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">heures ({Math.round(replayWindowHours / 24)} jours)</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rights-highlights" className="font-normal">Highlights</Label>
                    <Switch id="rights-highlights" checked={rightsHighlights} onCheckedChange={setRightsHighlights} />
                  </div>
                </div>
              </div>

              {/* Exclusivity & Platform */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Exclusivité</Label>
                  <Select value={exclusivity} onValueChange={(v) => setExclusivity(v as RightsExclusivity)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclusive">Exclusif</SelectItem>
                      <SelectItem value="shared">Partagé</SelectItem>
                      <SelectItem value="non_exclusive">Non-exclusif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Plateforme</Label>
                  <Select value={platform} onValueChange={(v) => setPlatform(v as RightsPlatform)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ott">OTT uniquement</SelectItem>
                      <SelectItem value="linear">Linéaire uniquement</SelectItem>
                      <SelectItem value="both">OTT + Linéaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as RightsStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Territories */}
            <div className="space-y-2">
              <Label>Territoires ({selectedTerritories.length} sélectionnés)</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-[120px] overflow-y-auto">
                {territories?.map((territory) => (
                  <Badge
                    key={territory.code}
                    variant={selectedTerritories.includes(territory.code) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleToggleTerritory(territory.code)}
                  >
                    {territory.code}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Conflicts warning */}
          {conflicts && conflicts.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">{conflicts.length} conflit(s) détecté(s)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Ces événements ont déjà des droits exclusifs attribués sur les territoires sélectionnés et seront ignorés :
              </p>
              <ul className="text-sm space-y-1">
                {conflicts.slice(0, 5).map((conflict) => (
                  <li key={conflict.eventId} className="flex items-center gap-2">
                    <span className="truncate">{conflict.eventTitle}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="text-muted-foreground">{conflict.conflictingBroadcaster}</span>
                    <TerritoriesBadge territories={conflict.territories} max={3} />
                  </li>
                ))}
                {conflicts.length > 5 && (
                  <li className="text-muted-foreground">...et {conflicts.length - 5} autre(s)</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={eventsWithoutConflicts.length === 0 || createRight.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Attribuer ({eventsWithoutConflicts.length} événement{eventsWithoutConflicts.length > 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
