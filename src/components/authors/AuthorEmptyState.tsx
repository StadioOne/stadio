import { useTranslation } from 'react-i18next';
import { Users, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthorEmptyStateProps {
  hasFilters: boolean;
  onCreateNew: () => void;
  onClearFilters?: () => void;
}

export function AuthorEmptyState({ 
  hasFilters, 
  onCreateNew,
  onClearFilters,
}: AuthorEmptyStateProps) {
  const { t } = useTranslation();

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('authors.noResults')}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {t('authors.noResultsDescription')}
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            {t('common.clearFilters')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Users className="h-10 w-10 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{t('authors.emptyTitle')}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {t('authors.emptyDescription')}
      </p>
      <Button onClick={onCreateNew} className="gap-2">
        <Plus className="h-4 w-4" />
        {t('authors.newAuthor')}
      </Button>
    </div>
  );
}
