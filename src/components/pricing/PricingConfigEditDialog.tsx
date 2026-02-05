import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TierBadge } from '@/components/admin/TierBadge';
import { useUpdatePricingConfig } from '@/hooks/usePricingMutations';
import type { Database } from '@/integrations/supabase/types';

type PricingConfig = Database['public']['Tables']['pricing_config']['Row'];

const formSchema = z.object({
  min_price: z.number().min(0, 'Le prix minimum doit être positif'),
  base_price: z.number().min(0, 'Le prix de base doit être positif'),
  max_price: z.number().min(0, 'Le prix maximum doit être positif'),
}).refine((data) => data.min_price <= data.base_price, {
  message: 'Le prix minimum doit être inférieur ou égal au prix de base',
  path: ['min_price'],
}).refine((data) => data.base_price <= data.max_price, {
  message: 'Le prix de base doit être inférieur ou égal au prix maximum',
  path: ['base_price'],
});

type FormValues = z.infer<typeof formSchema>;

interface PricingConfigEditDialogProps {
  config: PricingConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PricingConfigEditDialog({
  config,
  open,
  onOpenChange,
}: PricingConfigEditDialogProps) {
  const { t } = useTranslation();
  const updateConfig = useUpdatePricingConfig();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      min_price: 0,
      base_price: 0,
      max_price: 0,
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        min_price: config.min_price,
        base_price: config.base_price,
        max_price: config.max_price,
      });
    }
  }, [config, form]);

  const onSubmit = async (values: FormValues) => {
    if (!config) return;

    await updateConfig.mutateAsync({
      tierId: config.id,
      data: values,
    });

    onOpenChange(false);
  };

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('pricing.editTier', 'Modifier le tier')}
            <TierBadge tier={config.tier} />
          </DialogTitle>
          <DialogDescription>
            {t('pricing.editTierDesc', 'Modifiez les fourchettes de prix pour ce tier.')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="min_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pricing.minPrice', 'Prix minimum')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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

            <FormField
              control={form.control}
              name="base_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pricing.basePrice', 'Prix de base')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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

            <FormField
              control={form.control}
              name="max_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pricing.maxPrice', 'Prix maximum')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateConfig.isPending}>
                {updateConfig.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
