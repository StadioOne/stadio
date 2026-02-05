import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RotateCcw } from 'lucide-react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TierBadge } from '@/components/admin/TierBadge';
import { useUpdateEventPricing, useRevertToComputed } from '@/hooks/usePricingMutations';
import type { EventWithPricing } from '@/hooks/usePricing';
import type { Database } from '@/integrations/supabase/types';

type PricingTier = Database['public']['Enums']['pricing_tier'];

const formSchema = z.object({
  is_manual_override: z.boolean(),
  manual_tier: z.enum(['gold', 'silver', 'bronze']).nullable(),
  manual_price: z.number().min(0).nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface PricingEditDialogProps {
  event: EventWithPricing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PricingEditDialog({
  event,
  open,
  onOpenChange,
}: PricingEditDialogProps) {
  const { t } = useTranslation();
  const updatePricing = useUpdateEventPricing();
  const revertToComputed = useRevertToComputed();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_manual_override: false,
      manual_tier: null,
      manual_price: null,
    },
  });

  const isManualOverride = form.watch('is_manual_override');

  useEffect(() => {
    if (event?.pricing) {
      form.reset({
        is_manual_override: event.pricing.is_manual_override || false,
        manual_tier: event.pricing.manual_tier || event.pricing.computed_tier || 'bronze',
        manual_price: event.pricing.manual_price ?? event.pricing.computed_price ?? 9.99,
      });
    } else if (event) {
      form.reset({
        is_manual_override: false,
        manual_tier: 'bronze',
        manual_price: 9.99,
      });
    }
  }, [event, form]);

  const onSubmit = async (values: FormValues) => {
    if (!event) return;

    await updatePricing.mutateAsync({
      eventId: event.id,
      data: {
        is_manual_override: values.is_manual_override,
        manual_tier: values.is_manual_override ? values.manual_tier : null,
        manual_price: values.is_manual_override ? values.manual_price : null,
      },
    });

    onOpenChange(false);
  };

  const handleRevert = async () => {
    if (!event) return;
    await revertToComputed.mutateAsync(event.id);
    onOpenChange(false);
  };

  if (!event) return null;

  const title = event.override_title || event.api_title || `${event.home_team} vs ${event.away_team}`;
  const eventDate = format(new Date(event.event_date), 'dd MMMM yyyy HH:mm', { locale: fr });
  const pricing = event.pricing;

  const formatPrice = (price: number | null | undefined) => {
    if (price == null) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('pricing.editEventPricing', 'Modifier la tarification')}</DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block font-medium text-foreground">{title}</span>
            <span className="block">{eventDate}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Current computed values */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">{t('pricing.computedValues', 'Valeurs calculées')}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('pricing.tier')}</span>
            <TierBadge tier={pricing?.computed_tier || 'bronze'} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('pricing.computedPrice')}</span>
            <span className="font-mono font-semibold">{formatPrice(pricing?.computed_price)}</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="is_manual_override"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t('pricing.manualOverride', 'Surcharge manuelle')}
                    </FormLabel>
                    <FormDescription>
                      {t('pricing.manualOverrideDesc', 'Définir un prix et tier manuels')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isManualOverride && (
              <>
                <FormField
                  control={form.control}
                  name="manual_tier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pricing.manualTier', 'Tier manuel')}</FormLabel>
                      <Select
                        value={field.value || 'bronze'}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gold">
                            <div className="flex items-center gap-2">
                              <TierBadge tier="gold" showIcon={false} />
                            </div>
                          </SelectItem>
                          <SelectItem value="silver">
                            <div className="flex items-center gap-2">
                              <TierBadge tier="silver" showIcon={false} />
                            </div>
                          </SelectItem>
                          <SelectItem value="bronze">
                            <div className="flex items-center gap-2">
                              <TierBadge tier="bronze" showIcon={false} />
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="manual_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pricing.manualPrice')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            €
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter className="gap-2">
              {pricing?.is_manual_override && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRevert}
                  disabled={revertToComputed.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t('pricing.revertToComputed')}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updatePricing.isPending}>
                {updatePricing.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
