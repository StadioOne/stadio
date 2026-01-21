import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalyticsOriginals } from '@/hooks/useAnalytics';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { AnalyticsPagination } from '@/components/analytics/AnalyticsPagination';
import { ExportButton } from '@/components/analytics/ExportButton';
import { Badge } from '@/components/ui/badge';
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
import { Eye, Heart, FileText, Podcast, Tv } from 'lucide-react';
import { format, subDays } from 'date-fns';

const ITEMS_PER_PAGE = 20;

function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  article: { icon: FileText, label: 'Article', variant: 'default' },
  podcast: { icon: Podcast, label: 'Podcast', variant: 'secondary' },
  emission: { icon: Tv, label: 'Émission', variant: 'outline' },
};

export default function AnalyticsOriginalsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [contentType, setContentType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const dateRange = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return {
      dateFrom: format(subDays(new Date(), days), 'yyyy-MM-dd'),
      dateTo: format(new Date(), 'yyyy-MM-dd'),
    };
  }, [period]);

  const { data: response, isLoading } = useAnalyticsOriginals({
    ...dateRange,
    type: contentType !== 'all' ? contentType : undefined,
    limit: ITEMS_PER_PAGE,
    offset: (currentPage - 1) * ITEMS_PER_PAGE,
  });

  const originals = response?.originals || [];
  const totalPages = Math.ceil((response?.pagination?.total || 0) / ITEMS_PER_PAGE);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('fr-FR').format(value);

  // Prepare export data
  const exportData = originals.map((o) => ({
    title: o.title,
    type: o.type,
    views: o.views,
    likes: o.likes,
  }));

  const exportColumns = [
    { key: 'title' as const, label: 'Titre' },
    { key: 'type' as const, label: 'Type' },
    { key: 'views' as const, label: 'Vues' },
    { key: 'likes' as const, label: 'Likes' },
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
            <BreadcrumbPage>Originals</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stadio Originals - Analytics</h1>
          <p className="text-muted-foreground">{t('originals.subtitle')}</p>
        </div>
        <ExportButton
          data={exportData}
          columns={exportColumns}
          filename="analytics_originals"
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
        contentType={contentType}
        onContentTypeChange={(type) => {
          setContentType(type);
          setCurrentPage(1);
        }}
        showContentTypeFilter
      />

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[300px]">Contenu</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Eye className="h-4 w-4" />
                  Vues
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Heart className="h-4 w-4" />
                  Likes
                </div>
              </TableHead>
              <TableHead>Top Pays</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : originals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            ) : (
              originals.map((original) => {
                const typeConfig = TYPE_CONFIG[original.type] || TYPE_CONFIG.article;
                const TypeIcon = typeConfig.icon;

                return (
                  <TableRow key={original.contentId}>
                    <TableCell>
                      <p className="font-medium">{original.title}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeConfig.variant} className="gap-1">
                        <TypeIcon className="h-3 w-3" />
                        {typeConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(original.views)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(original.likes)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {original.topCountries?.slice(0, 3).map((c) => (
                          <span key={c.country} title={c.country}>
                            {getCountryFlag(c.country)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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
