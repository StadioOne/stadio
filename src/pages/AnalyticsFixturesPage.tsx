import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalyticsFixtures } from '@/hooks/useAnalytics';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { AnalyticsPagination } from '@/components/analytics/AnalyticsPagination';
import { ExportButton } from '@/components/analytics/ExportButton';
import { TierBadge } from '@/components/admin/TierBadge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Calendar, Eye, ShoppingCart, DollarSign } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PricingTier } from '@/lib/api-types';

const ITEMS_PER_PAGE = 20;

function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function AnalyticsFixturesPage() {
  const { t } = useTranslation();
  const { canSeeRevenue } = useAuth();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [country, setCountry] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const dateRange = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return {
      dateFrom: format(subDays(new Date(), days), 'yyyy-MM-dd'),
      dateTo: format(new Date(), 'yyyy-MM-dd'),
    };
  }, [period]);

  const { data: response, isLoading } = useAnalyticsFixtures({
    ...dateRange,
    country: country !== 'all' ? country : undefined,
    limit: ITEMS_PER_PAGE,
    offset: (currentPage - 1) * ITEMS_PER_PAGE,
  });

  const fixtures = response?.fixtures || [];
  const totalPages = Math.ceil((response?.pagination?.total || 0) / ITEMS_PER_PAGE);

  // Extract unique countries from top countries
  const availableCountries = useMemo(() => {
    const countrySet = new Set<string>();
    fixtures.forEach((f) => {
      f.topCountries?.forEach((c) => countrySet.add(c.country));
    });
    return Array.from(countrySet).map((code) => ({
      code,
      name: code,
    }));
  }, [fixtures]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('fr-FR').format(value);

  // Prepare export data
  const exportData = fixtures.map((f) => ({
    title: f.title,
    sport: f.sport,
    league: f.league || '',
    eventDate: f.eventDate || '',
    views: f.views,
    purchases: f.purchases,
    revenue: f.revenue,
    pricingTier: f.pricingTier || '',
  }));

  const exportColumns = [
    { key: 'title' as const, label: 'Titre' },
    { key: 'sport' as const, label: 'Sport' },
    { key: 'league' as const, label: 'Ligue' },
    { key: 'eventDate' as const, label: 'Date' },
    { key: 'views' as const, label: 'Vues' },
    { key: 'purchases' as const, label: 'Achats' },
    { key: 'revenue' as const, label: 'CA', hidden: !canSeeRevenue },
    { key: 'pricingTier' as const, label: 'Tier' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/analytics">{t('nav.analytics')}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t('nav.events')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.events')} - Analytics</h1>
          <p className="text-muted-foreground">{t('events.subtitle')}</p>
        </div>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          filename="analytics_fixtures"
          disabled={isLoading}
        />
      </div>

      {/* Filters */}
      <AnalyticsFilters
        period={period}
        onPeriodChange={(p) => {
          setPeriod(p);
          setCurrentPage(1);
        }}
        country={country}
        onCountryChange={(c) => {
          setCountry(c);
          setCurrentPage(1);
        }}
        countries={availableCountries}
      />

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[250px]">Événement</TableHead>
              <TableHead>Sport</TableHead>
              <TableHead>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Date
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Eye className="h-4 w-4" />
                  Vues
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <ShoppingCart className="h-4 w-4" />
                  Achats
                </div>
              </TableHead>
              {canSeeRevenue && (
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="h-4 w-4" />
                    CA
                  </div>
                </TableHead>
              )}
              <TableHead>Tier</TableHead>
              <TableHead>Top Pays</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  {canSeeRevenue && <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>}
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : fixtures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canSeeRevenue ? 8 : 7} className="text-center py-8 text-muted-foreground">
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            ) : (
              fixtures.map((fixture) => (
                <TableRow key={fixture.fixtureId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{fixture.title}</p>
                      {fixture.league && (
                        <p className="text-xs text-muted-foreground">{fixture.league}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{fixture.sport}</TableCell>
                  <TableCell>
                    {fixture.eventDate
                      ? format(new Date(fixture.eventDate), 'dd MMM yyyy', { locale: fr })
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatNumber(fixture.views)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatNumber(fixture.purchases)}
                  </TableCell>
                  {canSeeRevenue && (
                    <TableCell className="text-right font-medium">
                      {formatCurrency(fixture.revenue)}
                    </TableCell>
                  )}
                  <TableCell>
                    {fixture.pricingTier && <TierBadge tier={fixture.pricingTier as PricingTier} />}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {fixture.topCountries?.slice(0, 3).map((c) => (
                        <span key={c.country} title={c.country}>
                          {getCountryFlag(c.country)}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <AnalyticsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
