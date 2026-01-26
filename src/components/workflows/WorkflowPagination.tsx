import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { WorkflowsFilters } from '@/hooks/useWorkflows';

interface WorkflowPaginationProps {
  total: number;
  filters: WorkflowsFilters;
  onFiltersChange: (filters: WorkflowsFilters) => void;
}

export function WorkflowPagination({
  total,
  filters,
  onFiltersChange,
}: WorkflowPaginationProps) {
  const { t } = useTranslation();

  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onFiltersChange({
        ...filters,
        offset: Math.max(0, offset - limit),
      });
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onFiltersChange({
        ...filters,
        offset: offset + limit,
      });
    }
  };

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between py-4">
      <p className="text-sm text-muted-foreground">
        {t('common.pageOf', { current: currentPage, total: totalPages })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('common.previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!canGoNext}
        >
          {t('common.next')}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
