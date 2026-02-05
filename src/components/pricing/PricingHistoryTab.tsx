import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PricingHistoryRow } from './PricingHistoryRow';
import { usePricingHistory } from '@/hooks/usePricing';

export function PricingHistoryTab() {
  const { t } = useTranslation();
  const { data: history, isLoading } = usePricingHistory(100);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('pricing.history')}</CardTitle>
        <CardDescription>
          {t('pricing.historyDesc', 'Historique des modifications de tarification')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!history || history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('pricing.noHistory', 'Aucun historique de modification')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('events.title', 'Événement')}</TableHead>
                <TableHead className="text-center">{t('pricing.before', 'Avant')}</TableHead>
                <TableHead className="text-center">{t('pricing.after', 'Après')}</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead>{t('audit.actor', 'Par')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <PricingHistoryRow key={entry.id} entry={entry} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
