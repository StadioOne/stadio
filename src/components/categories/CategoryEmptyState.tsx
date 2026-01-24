import { useTranslation } from 'react-i18next';
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CategoryEmptyStateProps {
  onCreateClick: () => void;
}

export function CategoryEmptyState({ onCreateClick }: CategoryEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 rounded-full bg-muted mb-4">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{t('categories.empty.title')}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {t('categories.empty.description')}
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-2" />
        {t('categories.create')}
      </Button>
    </div>
  );
}
