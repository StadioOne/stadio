import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useRightsPackageMutations } from '@/hooks/useRightsPackageMutations';
import { useTerritoriesByRegion, type Territory } from '@/hooks/useTerritories';
import { useSportsForSelect, useLeaguesForSelect } from '@/hooks/useEventsForRights';
import type { RightsPackage, PackageScope, RightsStatus } from '@/hooks/useRightsPackages';

const formSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  scope_type: z.enum(['sport', 'competition', 'season']),
  sport_id: z.string().nullable(),
  league_id: z.string().nullable(),
  season: z.number().nullable(),
  start_at: z.date({ required_error: 'La date de début est requise' }),
  end_at: z.date({ required_error: 'La date de fin est requise' }),
  is_exclusive_default: z.boolean(),
  territories_default: z.array(z.string()).min(1, 'Au moins un territoire requis'),
  status: z.enum(['draft', 'active', 'expired', 'revoked']),
  notes: z.string().nullable(),
}).refine((data) => data.end_at > data.start_at, {
  message: 'La date de fin doit être après la date de début',
  path: ['end_at'],
});

type FormValues = z.infer<typeof formSchema>;

interface PackageEditDialogProps {
  pkg: RightsPackage | null;
  broadcasterId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const scopeOptions: { value: PackageScope; label: string }[] = [
  { value: 'sport', label: 'Sport (tous les événements)' },
  { value: 'competition', label: 'Compétition (une ligue)' },
  { value: 'season', label: 'Saison (une ligue + saison)' },
];

const statusOptions: { value: RightsStatus; label: string }[] = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'active', label: 'Actif' },
  { value: 'expired', label: 'Expiré' },
  { value: 'revoked', label: 'Révoqué' },
];

const currentYear = new Date().getFullYear();
const seasonOptions = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i);

export function PackageEditDialog({
  pkg,
  broadcasterId,
  open,
  onOpenChange,
}: PackageEditDialogProps) {
  const { createPackage, updatePackage } = useRightsPackageMutations();
  const { data: territoriesByRegion } = useTerritoriesByRegion();
  const { data: sports } = useSportsForSelect();
  const { data: leagues } = useLeaguesForSelect();

  const isEdit = !!pkg;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      scope_type: 'competition',
      sport_id: null,
      league_id: null,
      season: null,
      start_at: new Date(),
      end_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      is_exclusive_default: false,
      territories_default: [],
      status: 'draft',
      notes: null,
    },
  });

  const watchedScopeType = form.watch('scope_type');
  const watchedSportId = form.watch('sport_id');

  // Filter leagues by selected sport
  const filteredLeagues = watchedSportId 
    ? leagues?.filter((l) => l.sport_id === watchedSportId)
    : leagues;

  // Reset form when package changes
  useEffect(() => {
    if (pkg) {
      form.reset({
        name: pkg.name,
        scope_type: pkg.scope_type,
        sport_id: pkg.sport_id,
        league_id: pkg.league_id,
        season: pkg.season,
        start_at: new Date(pkg.start_at),
        end_at: new Date(pkg.end_at),
        is_exclusive_default: pkg.is_exclusive_default,
        territories_default: pkg.territories_default || [],
        status: pkg.status,
        notes: pkg.notes,
      });
    } else {
      form.reset({
        name: '',
        scope_type: 'competition',
        sport_id: null,
        league_id: null,
        season: null,
        start_at: new Date(),
        end_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        is_exclusive_default: false,
        territories_default: [],
        status: 'draft',
        notes: null,
      });
    }
  }, [pkg, form]);

  const onSubmit = async (values: FormValues) => {
    const data = {
      broadcaster_id: broadcasterId,
      name: values.name,
      scope_type: values.scope_type,
      sport_id: values.scope_type === 'sport' ? values.sport_id : null,
      league_id: values.scope_type !== 'sport' ? values.league_id : null,
      season: values.scope_type === 'season' ? values.season : null,
      start_at: values.start_at.toISOString(),
      end_at: values.end_at.toISOString(),
      is_exclusive_default: values.is_exclusive_default,
      territories_default: values.territories_default,
      status: values.status,
      notes: values.notes,
    };

    if (isEdit && pkg) {
      await updatePackage.mutateAsync({ id: pkg.id, ...data });
    } else {
      await createPackage.mutateAsync(data);
    }

    onOpenChange(false);
  };

  const toggleTerritory = (code: string) => {
    const current = form.getValues('territories_default');
    if (current.includes(code)) {
      form.setValue('territories_default', current.filter((c) => c !== code), { shouldValidate: true });
    } else {
      form.setValue('territories_default', [...current, code], { shouldValidate: true });
    }
  };

  const toggleRegion = (territories: Territory[]) => {
    const current = form.getValues('territories_default');
    const regionCodes = territories.map((t) => t.code);
    const allSelected = regionCodes.every((code) => current.includes(code));
    
    if (allSelected) {
      form.setValue('territories_default', current.filter((c) => !regionCodes.includes(c)), { shouldValidate: true });
    } else {
      const newCodes = [...new Set([...current, ...regionCodes])];
      form.setValue('territories_default', newCodes, { shouldValidate: true });
    }
  };

  const isPending = createPackage.isPending || updatePackage.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le contrat' : 'Nouveau contrat'}</DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Modifiez les paramètres du contrat de droits'
              : 'Créez un nouveau contrat pour attribuer des droits en masse'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du contrat</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Ligue 1 2024-2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scope type */}
            <FormField
              control={form.control}
              name="scope_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Périmètre</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {scopeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Définit quels événements seront couverts par ce contrat
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sport selection (for sport scope) */}
            {watchedScopeType === 'sport' && (
              <FormField
                control={form.control}
                name="sport_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sport</FormLabel>
                    <Select 
                      value={field.value || ''} 
                      onValueChange={(v) => field.onChange(v || null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un sport" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sports?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name_fr || s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Competition/Season selection */}
            {(watchedScopeType === 'competition' || watchedScopeType === 'season') && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sport_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sport (filtre)</FormLabel>
                      <Select 
                        value={field.value || '__all__'} 
                        onValueChange={(v) => {
                          field.onChange(v === '__all__' ? null : v);
                          form.setValue('league_id', null);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tous les sports" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__all__">Tous les sports</SelectItem>
                          {sports?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name_fr || s.name}
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
                  name="league_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compétition</FormLabel>
                      <Select 
                        value={field.value || ''} 
                        onValueChange={(v) => field.onChange(v || null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredLeagues?.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name_fr || l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Season selection */}
            {watchedScopeType === 'season' && (
              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saison</FormLabel>
                    <Select 
                      value={field.value?.toString() || ''} 
                      onValueChange={(v) => field.onChange(v ? parseInt(v) : null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une saison" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {seasonOptions.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}-{year + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de début</FormLabel>
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
                              <span>Choisir une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de fin</FormLabel>
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
                              <span>Choisir une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Exclusivity & Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_exclusive_default"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-normal">
                        Exclusif par défaut
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Les droits créés seront exclusifs
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

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
            </div>

            {/* Default Territories */}
            <FormField
              control={form.control}
              name="territories_default"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Territoires par défaut</FormLabel>
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
                          onClick={() => toggleTerritory(code)}
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
                              onCheckedChange={() => toggleRegion(territories)}
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
                                onClick={() => toggleTerritory(territory.code)}
                              >
                                {territory.code}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                  </ScrollArea>
                  <FormDescription>
                    Ces territoires seront appliqués par défaut aux droits créés via ce contrat
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes internes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notes optionnelles sur ce contrat..."
                      className="resize-none"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
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
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
