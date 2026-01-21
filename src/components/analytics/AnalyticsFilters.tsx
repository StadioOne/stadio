import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PeriodSelector } from './PeriodSelector';

interface AnalyticsFiltersProps {
  period: '7d' | '30d' | '90d';
  onPeriodChange: (period: '7d' | '30d' | '90d') => void;
  country?: string;
  onCountryChange?: (country: string) => void;
  countries?: { code: string; name: string }[];
  contentType?: string;
  onContentTypeChange?: (type: string) => void;
  showContentTypeFilter?: boolean;
}

const CONTENT_TYPES = [
  { value: 'all', label: 'Tous les types' },
  { value: 'article', label: 'Articles' },
  { value: 'podcast', label: 'Podcasts' },
  { value: 'emission', label: 'Émissions' },
];

function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function AnalyticsFilters({
  period,
  onPeriodChange,
  country,
  onCountryChange,
  countries = [],
  contentType,
  onContentTypeChange,
  showContentTypeFilter = false,
}: AnalyticsFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <PeriodSelector selected={period} onSelect={onPeriodChange} />

      {onCountryChange && countries.length > 0 && (
        <Select value={country || 'all'} onValueChange={onCountryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('analytics.country')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">🌍 Tous les pays</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {getCountryFlag(c.code)} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showContentTypeFilter && onContentTypeChange && (
        <Select value={contentType || 'all'} onValueChange={onContentTypeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type de contenu" />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
