import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Medal, Award, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TierBadge } from '@/components/admin/TierBadge';
import { usePricingConfig } from '@/hooks/usePricing';
import { useAuth } from '@/contexts/AuthContext';
import { PricingConfigEditDialog } from './PricingConfigEditDialog';
import type { Database } from '@/integrations/supabase/types';

type PricingConfig = Database['public']['Tables']['pricing_config']['Row'];
type PricingTier = Database['public']['Enums']['pricing_tier'];

const tierIcons: Record<PricingTier, React.ElementType> = {
  gold: Crown,
  silver: Medal,
  bronze: Award,
};

const tierOrder: PricingTier[] = ['gold', 'silver', 'bronze'];

export function PricingConfigTab() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const { data: config, isLoading } = usePricingConfig();
  const [editingTier, setEditingTier] = useState<PricingConfig | null>(null);

  const canEdit = hasRole('owner');

  // Sort config by tier order
  const sortedConfig = config?.slice().sort((a, b) => {
    return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('pricing.tierConfig', 'Configuration des tiers')}</CardTitle>
          <CardDescription>
            {t('pricing.tierConfigDesc', 'Définissez les fourchettes de prix pour chaque tier tarifaire.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">{t('pricing.tier')}</TableHead>
                <TableHead className="text-right">{t('pricing.minPrice', 'Prix min')}</TableHead>
                <TableHead className="text-right">{t('pricing.basePrice', 'Prix base')}</TableHead>
                <TableHead className="text-right">{t('pricing.maxPrice', 'Prix max')}</TableHead>
                {canEdit && <TableHead className="w-[100px]">{t('common.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedConfig?.map((tierConfig) => {
                const Icon = tierIcons[tierConfig.tier];
                return (
                  <TableRow key={tierConfig.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TierBadge tier={tierConfig.tier} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPrice(tierConfig.min_price)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatPrice(tierConfig.base_price)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPrice(tierConfig.max_price)}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTier(tierConfig)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {!canEdit && (
            <p className="text-sm text-muted-foreground mt-4">
              {t('pricing.ownerOnly', 'Seuls les propriétaires peuvent modifier cette configuration.')}
            </p>
          )}
        </CardContent>
      </Card>

      <PricingConfigEditDialog
        config={editingTier}
        open={!!editingTier}
        onOpenChange={(open) => !open && setEditingTier(null)}
      />
    </>
  );
}
