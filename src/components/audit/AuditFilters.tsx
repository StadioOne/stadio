import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { AuditLogsFilters } from '@/hooks/useAuditLogs';

interface AuditFiltersProps {
  filters: AuditLogsFilters;
  onFiltersChange: (filters: AuditLogsFilters) => void;
  filterOptions: {
    actors: string[];
    actions: string[];
    entities: string[];
  };
}

const PERIOD_OPTIONS = [
  { value: '7', label: '7 jours' },
  { value: '30', label: '30 jours' },
  { value: '90', label: '90 jours' },
  { value: 'custom', label: 'Personnalisé' },
];

export function AuditFilters({ filters, onFiltersChange, filterOptions }: AuditFiltersProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : undefined;

  const handlePeriodChange = (value: string) => {
    if (value === 'custom') {
      return; // Let the calendar handle this
    }
    
    const days = parseInt(value);
    const dateFrom = format(subDays(new Date(), days), 'yyyy-MM-dd');
    const dateTo = format(new Date(), 'yyyy-MM-dd');
    
    onFiltersChange({ ...filters, dateFrom, dateTo, offset: 0 });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    if (date) {
      onFiltersChange({ 
        ...filters, 
        dateFrom: format(date, 'yyyy-MM-dd'),
        offset: 0 
      });
    }
  };

  const handleDateToChange = (date: Date | undefined) => {
    if (date) {
      onFiltersChange({ 
        ...filters, 
        dateTo: format(date, 'yyyy-MM-dd'),
        offset: 0 
      });
    }
  };

  const handleEntityChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      entity: value === 'all' ? undefined : value,
      offset: 0 
    });
  };

  const handleActionChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      action: value === 'all' ? undefined : value,
      offset: 0 
    });
  };

  const handleActorChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      actorUserId: value === 'all' ? undefined : value,
      offset: 0 
    });
  };

  const clearFilters = () => {
    const dateFrom = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    const dateTo = format(new Date(), 'yyyy-MM-dd');
    onFiltersChange({ dateFrom, dateTo, limit: 50, offset: 0 });
  };

  const hasActiveFilters = filters.entity || filters.action || filters.actorUserId;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.slice(0, 3).map(option => (
          <Button
            key={option.value}
            variant="outline"
            size="sm"
            onClick={() => handlePeriodChange(option.value)}
            className={cn(
              'transition-colors',
              // Highlight if this period is approximately selected
              option.value === '7' && !filters.dateFrom?.includes(format(subDays(new Date(), 30), 'yyyy-MM-dd')) && 
                filters.dateFrom?.includes(format(subDays(new Date(), 7), 'yyyy-MM-dd').slice(0, 7))
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : ''
            )}
          >
            {option.label}
          </Button>
        ))}
        
        {/* Custom date range */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {filters.dateFrom 
                  ? format(new Date(filters.dateFrom), 'dd MMM', { locale })
                  : t('audit.from')
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                onSelect={handleDateFromChange}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          <span className="text-muted-foreground">→</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {filters.dateTo 
                  ? format(new Date(filters.dateTo), 'dd MMM', { locale })
                  : t('audit.to')
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                onSelect={handleDateToChange}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-3">
        <Select 
          value={filters.entity || 'all'} 
          onValueChange={handleEntityChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('audit.allEntities')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('audit.allEntities')}</SelectItem>
            {filterOptions.entities.map(entity => (
              <SelectItem key={entity} value={entity}>{entity}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={filters.action || 'all'} 
          onValueChange={handleActionChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('audit.allActions')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('audit.allActions')}</SelectItem>
            {filterOptions.actions.map(action => (
              <SelectItem key={action} value={action}>{action}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={filters.actorUserId || 'all'} 
          onValueChange={handleActorChange}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder={t('audit.allActors')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('audit.allActors')}</SelectItem>
            {filterOptions.actors.map(actor => (
              <SelectItem key={actor} value={actor}>{actor}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            {t('audit.clearFilters')}
          </Button>
        )}
      </div>
    </div>
  );
}
