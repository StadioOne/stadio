import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign } from 'lucide-react';
import { PricingStats } from '@/components/pricing/PricingStats';
import { PricingEventsTab } from '@/components/pricing/PricingEventsTab';
import { usePricingStats } from '@/hooks/usePricing';

export default function PricingPage() {
  const { t } = useTranslation();
  const { data: stats, isLoading: statsLoading } = usePricingStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          {t('pricing.title')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('pricing.subtitle')}</p>
      </div>

      {/* Stats */}
      <PricingStats
        total={stats?.total}
        withPrice={stats?.withPrice}
        withoutPrice={stats?.withoutPrice}
        averagePrice={stats?.averagePrice}
        isLoading={statsLoading}
      />

      {/* Events pricing table */}
      <PricingEventsTab />
    </div>
  );
}
