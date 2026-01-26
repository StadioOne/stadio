import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditPaginationProps {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  onPageChange: (offset: number) => void;
}

export function AuditPagination({ pagination, onPageChange }: AuditPaginationProps) {
  const { t } = useTranslation();
  
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  
  const canGoPrevious = pagination.offset > 0;
  const canGoNext = pagination.hasMore;

  const handlePrevious = () => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit);
    onPageChange(newOffset);
  };

  const handleNext = () => {
    const newOffset = pagination.offset + pagination.limit;
    onPageChange(newOffset);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between py-4">
      <div className="text-sm text-muted-foreground">
        {t('audit.showingEntries', { 
          from: pagination.offset + 1, 
          to: Math.min(pagination.offset + pagination.limit, pagination.total),
          total: pagination.total 
        })}
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('audit.previous')}
        </Button>
        
        <span className="text-sm text-muted-foreground px-2">
          {t('audit.pageOf', { current: currentPage, total: totalPages })}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!canGoNext}
          className="gap-1"
        >
          {t('audit.next')}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
