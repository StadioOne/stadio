import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PricingStats } from '@/components/pricing/PricingStats';
import { PricingConfigTab } from '@/components/pricing/PricingConfigTab';
import { PricingEventsTab } from '@/components/pricing/PricingEventsTab';
import { PricingHistoryTab } from '@/components/pricing/PricingHistoryTab';
import { usePricingStats } from '@/hooks/usePricing';
import { useBatchRecompute } from '@/hooks/usePricingMutations';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type TabValue = 'config' | 'events' | 'history';

export default function PricingPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>('events');

  const { data: stats, isLoading: statsLoading } = usePricingStats();
  const batchRecompute = useBatchRecompute();

  const canEditConfig = hasRole('owner');
  const canBatchRecompute = hasRole('admin');

  const handleBatchRecompute = () => {
    batchRecompute.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            {t('pricing.title')}
          </h1>
          <p className="text-muted-foreground text-sm">{t('pricing.subtitle')}</p>
        </div>
        {canBatchRecompute && (
          <Button
            onClick={handleBatchRecompute}
            disabled={batchRecompute.isPending}
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-2', batchRecompute.isPending && 'animate-spin')}
            />
            {t('pricing.batchRecompute', 'Recalculer tous les prix')}
          </Button>
        )}
      </div>

      {/* Stats */}
      <PricingStats
        total={stats?.total}
        gold={stats?.gold}
        silver={stats?.silver}
        bronze={stats?.bronze}
        manual={stats?.manual}
        isLoading={statsLoading}
      />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
      >
        <TabsList>
          {canEditConfig && (
            <TabsTrigger value="config">
              {t('pricing.configuration', 'Configuration')}
            </TabsTrigger>
          )}
          <TabsTrigger value="events">
            {t('nav.events', 'Événements')}
          </TabsTrigger>
          <TabsTrigger value="history">
            {t('pricing.history')}
          </TabsTrigger>
        </TabsList>

        {canEditConfig && (
          <TabsContent value="config" className="mt-6">
            <PricingConfigTab />
          </TabsContent>
        )}
        <TabsContent value="events" className="mt-6">
          <PricingEventsTab />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <PricingHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
