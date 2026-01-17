import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, DollarSign, Eye, ShoppingCart, Heart } from 'lucide-react';
import { KPICard } from '@/components/analytics/KPICard';
import { CountryTable } from '@/components/analytics/CountryTable';
import { PeriodSelector, getPeriodDates, type PeriodOption } from '@/components/analytics/PeriodSelector';
import { useAnalyticsOverview, useAnalyticsGeo } from '@/hooks/useAnalytics';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodOption>('30d');
  const { dateFrom, dateTo } = getPeriodDates(period);

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(dateFrom, dateTo);
  const { data: geo, isLoading: geoLoading } = useAnalyticsGeo(dateFrom, dateTo);

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('fr-FR').format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('nav.analytics')}</h1>
        <PeriodSelector selected={period} onSelect={setPeriod} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <KPICard
              title="Chiffre d'affaires"
              value={formatCurrency(overview?.totalRevenue ?? null)}
              icon={DollarSign}
            />
            <KPICard
              title="Ventes PPV"
              value={formatNumber(overview?.totalPurchases ?? 0)}
              icon={ShoppingCart}
            />
            <KPICard
              title="Vues totales"
              value={formatNumber(overview?.totalViews ?? 0)}
              icon={Eye}
            />
            <KPICard
              title="Likes"
              value={formatNumber(overview?.totalLikes ?? 0)}
              icon={Heart}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Countries */}
        {geoLoading ? (
          <Skeleton className="h-80" />
        ) : (
          <CountryTable
            countries={geo?.byCountry.slice(0, 10) ?? []}
            showRevenue={overview?.totalRevenue !== null}
            title="Top 10 pays"
          />
        )}

        {/* Concentration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Concentration géographique
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geoLoading ? (
              <Skeleton className="h-32" />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Top 3 pays</span>
                  <span className="font-medium">{geo?.concentration.top3Percentage ?? 0}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Top 5 pays</span>
                  <span className="font-medium">{geo?.concentration.top5Percentage ?? 0}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Top 10 pays</span>
                  <span className="font-medium">{geo?.concentration.top10Percentage ?? 0}%</span>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {geo?.totalCountries ?? 0} pays au total
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Fixtures */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top événements</CardTitle>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead className="text-right">Vues</TableHead>
                  <TableHead className="text-right">Achats</TableHead>
                  {overview?.totalRevenue !== null && (
                    <TableHead className="text-right">CA</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(overview?.topFixtures ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Aucune donnée disponible
                    </TableCell>
                  </TableRow>
                ) : (
                  overview?.topFixtures.map((fixture) => (
                    <TableRow key={fixture.fixtureId}>
                      <TableCell className="font-medium">{fixture.title}</TableCell>
                      <TableCell>{fixture.sport}</TableCell>
                      <TableCell className="text-right">{formatNumber(fixture.views)}</TableCell>
                      <TableCell className="text-right">{formatNumber(fixture.purchases)}</TableCell>
                      {overview?.totalRevenue !== null && (
                        <TableCell className="text-right">{formatCurrency(fixture.revenue)}</TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top Contents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top contenus Originals</CardTitle>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Vues</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(overview?.topContents ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Aucune donnée disponible
                    </TableCell>
                  </TableRow>
                ) : (
                  overview?.topContents.map((content) => (
                    <TableRow key={content.contentId}>
                      <TableCell className="font-medium">{content.title}</TableCell>
                      <TableCell className="capitalize">{content.type}</TableCell>
                      <TableCell className="text-right">{formatNumber(content.views)}</TableCell>
                      <TableCell className="text-right">{formatNumber(content.likes)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
