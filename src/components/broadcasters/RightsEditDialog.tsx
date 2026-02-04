import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useRightsMutations } from '@/hooks/useRightsMutations';
import { useTerritoriesByRegion, type Territory } from '@/hooks/useTerritories';
import { useRightsConflicts } from '@/hooks/useRightsConflicts';
import type { RightWithEvent, RightsExclusivity, RightsPlatform, RightsStatus } from '@/hooks/useRightsEvents';

const formSchema = z.object({
  rights_live: z.boolean(),
  rights_replay: z.boolean(),
  rights_highlights: z.boolean(),
  replay_window_hours: z.number().min(0).max(720).nullable(),
  exclusivity: z.enum(['exclusive', 'shared', 'non_exclusive']),
  platform: z.enum(['ott', 'linear', 'both']),
  status: z.enum(['draft', 'active', 'expired', 'revoked']),
  territories_allowed: z.array(z.string()).min(1, 'Au moins un territoire requis'),
  territories_blocked: z.array(z.string()),
  expires_at: z.date().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface RightsEditDialogProps {
  right: RightWithEvent | null;
  broadcasterId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const exclusivityOptions: { value: RightsExclusivity; label: string }[] = [
  { value: 'exclusive', label: 'Exclusif' },
  { value: 'shared', label: 'Partagé' },
  { value: 'non_exclusive', label: 'Non-exclusif' },
];

const platformOptions: { value: RightsPlatform; label: string }[] = [
  { value: 'ott', label: 'OTT' },
  { value: 'linear', label: 'Linéaire' },
  { value: 'both', label: 'OTT + Linéaire' },
];

const statusOptions: { value: RightsStatus; label: string }[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'active', label: 'Actif' },
  { value: 'expired', label: 'Expiré' },
  { value: 'revoked', label: 'Révoqué' },
];

export function RightsEditDialog({
  right,
  broadcasterId,
  open,
  onOpenChange,
}: RightsEditDialogProps) {
  const { updateRight } = useRightsMutations();
  const { data: territoriesByRegion } = useTerritoriesByRegion();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rights_live: true,
      rights_replay: false,
      rights_highlights: false,
      replay_window_hours: null,
      exclusivity: 'non_exclusive',
      platform: 'both',
      status: 'draft',
      territories_allowed: [],
      territories_blocked: [],
      expires_at: null,
    },
  });

  // Watch for conflict detection
  const watchedExclusivity = form.watch('exclusivity');
  const watchedTerritories = form.watch('territories_allowed');

  // Check for conflicts when editing exclusive rights
  const { data: conflicts } = useRightsConflicts({
    eventIds: right ? [right.event_id] : [],
    territories: watchedTerritories,
    exclusivity: watchedExclusivity,
    excludeBroadcasterId: broadcasterId,
    excludeRightId: right?.id,
  });

  // Reset form when right changes
  useEffect(() => {
    if (right) {
      form.reset({
        rights_live: right.rights_live,
        rights_replay: right.rights_replay,
        rights_highlights: right.rights_highlights,
        replay_window_hours: right.replay_window_hours,
        exclusivity: right.exclusivity,
        platform: right.platform,
        status: right.status,
        territories_allowed: right.territories_allowed || [],
        territories_blocked: right.territories_blocked || [],
        expires_at: right.expires_at ? new Date(right.expires_at) : null,
      });
    }
  }, [right, form]);

  const onSubmit = async (values: FormValues) => {
    if (!right) return;

    await updateRight.mutateAsync({
      id: right.id,
      rights_live: values.rights_live,
      rights_replay: values.rights_replay,
      rights_highlights: values.rights_highlights,
      replay_window_hours: values.replay_window_hours,
      exclusivity: values.exclusivity,
      platform: values.platform,
      status: values.status,
      territories_allowed: values.territories_allowed,
      territories_blocked: values.territories_blocked,
      expires_at: values.expires_at?.toISOString() || null,
    });

    onOpenChange(false);
  };

  const eventTitle = right
    ? right.event.override_title || right.event.api_title ||
      `${right.event.home_team || ''} vs ${right.event.away_team || ''}`
    : '';

  const toggleTerritory = (code: string, field: 'territories_allowed' | 'territories_blocked') => {
    const current = form.getValues(field);
    if (current.includes(code)) {
      form.setValue(field, current.filter((c) => c !== code), { shouldValidate: true });
    } else {
      form.setValue(field, [...current, code], { shouldValidate: true });
    }
  };

  const toggleRegion = (territories: Territory[], field: 'territories_allowed' | 'territories_blocked') => {
    const current = form.getValues(field);
    const regionCodes = territories.map((t) => t.code);
    const allSelected = regionCodes.every((code) => current.includes(code));
    
    if (allSelected) {
      form.setValue(field, current.filter((c) => !regionCodes.includes(c)), { shouldValidate: true });
    } else {
      const newCodes = [...new Set([...current, ...regionCodes])];
      form.setValue(field, newCodes, { shouldValidate: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le droit</DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="font-medium">{eventTitle}</span>
            {right && (
              <span className="block text-xs text-muted-foreground">
                {format(new Date(right.event.event_date), 'PPP à HH:mm', { locale: fr })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Conflicts warning */}
            {conflicts && conflicts.length > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium text-sm">
                    {conflicts.length} conflit(s) d'exclusivité détecté(s)
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {conflicts.slice(0, 3).map((c) => (
                    <li key={c.rightId}>
                      • {c.broadcasterName} - {c.territories.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rights types */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Types de droits</h4>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="rights_live"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Live
                      </FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rights_replay"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Replay
                      </FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rights_highlights"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Highlights
                      </FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Replay window */}
            {form.watch('rights_replay') && (
              <FormField
                control={form.control}
                name="replay_window_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fenêtre de replay (heures)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={720}
                        placeholder="48"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormDescription>
                      Durée pendant laquelle le replay est accessible après l'événement
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Exclusivity & Platform */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="exclusivity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exclusivité</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {exclusivityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plateforme</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {platformOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status & Expiration */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expires_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: fr })
                            ) : (
                              <span>Aucune expiration</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                        {field.value && (
                          <div className="p-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => field.onChange(null)}
                            >
                              Supprimer la date
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Territories Allowed */}
            <FormField
              control={form.control}
              name="territories_allowed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Territoires autorisés</FormLabel>
                  <div className="flex flex-wrap gap-1 min-h-[2.5rem] p-2 border rounded-md bg-background">
                    {field.value.length === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        Sélectionnez des territoires...
                      </span>
                    ) : (
                      field.value.map((code) => (
                        <Badge
                          key={code}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => toggleTerritory(code, 'territories_allowed')}
                        >
                          {code} ×
                        </Badge>
                      ))
                    )}
                  </div>
                  <ScrollArea className="h-40 border rounded-md p-2">
                    {territoriesByRegion &&
                      Object.entries(territoriesByRegion).map(([region, territories]) => (
                        <div key={region} className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Checkbox
                              checked={territories.every((t) =>
                                field.value.includes(t.code)
                              )}
                              onCheckedChange={() =>
                                toggleRegion(territories, 'territories_allowed')
                              }
                            />
                            <span className="text-xs font-semibold text-muted-foreground">
                              {region}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 ml-5">
                            {territories.map((territory) => (
                              <Badge
                                key={territory.code}
                                variant={
                                  field.value.includes(territory.code)
                                    ? 'default'
                                    : 'outline'
                                }
                                className="cursor-pointer text-xs"
                                onClick={() =>
                                  toggleTerritory(territory.code, 'territories_allowed')
                                }
                              >
                                {territory.code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Territories Blocked */}
            <FormField
              control={form.control}
              name="territories_blocked"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Territoires bloqués (optionnel)</FormLabel>
                  <div className="flex flex-wrap gap-1 min-h-[2rem] p-2 border rounded-md bg-background">
                    {field.value.length === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        Aucun territoire bloqué
                      </span>
                    ) : (
                      field.value.map((code) => (
                        <Badge
                          key={code}
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() => toggleTerritory(code, 'territories_blocked')}
                        >
                          {code} ×
                        </Badge>
                      ))
                    )}
                  </div>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    {territoriesByRegion &&
                      Object.entries(territoriesByRegion).map(([region, territories]) => (
                        <div key={region} className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Checkbox
                              checked={territories.every((t) =>
                                field.value.includes(t.code)
                              )}
                              onCheckedChange={() =>
                                toggleRegion(territories, 'territories_blocked')
                              }
                            />
                            <span className="text-xs font-semibold text-muted-foreground">
                              {region}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 ml-5">
                            {territories.map((territory) => (
                              <Badge
                                key={territory.code}
                                variant={
                                  field.value.includes(territory.code)
                                    ? 'destructive'
                                    : 'outline'
                                }
                                className="cursor-pointer text-xs"
                                onClick={() =>
                                  toggleTerritory(territory.code, 'territories_blocked')
                                }
                              >
                                {territory.code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                  </ScrollArea>
                  <FormDescription>
                    Les territoires bloqués sont exclus même s'ils sont dans la liste autorisée
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={updateRight.isPending}>
                {updateRight.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
