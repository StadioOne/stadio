import { useTranslation } from 'react-i18next';
import { Calendar, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EventsEmptyStateProps {
  hasFilters?: boolean;
  onClearFilters?: () => void;
  onImport?: () => void;
}

export function EventsEmptyState({
  hasFilters,
  onClearFilters,
  onImport,
}: EventsEmptyStateProps) {
  const { t } = useTranslation();

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Aucun résultat</h3>
        <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
          Aucun événement ne correspond à vos critères de recherche.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Réinitialiser les filtres
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Calendar className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Aucun événement</h3>
      <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
        Commencez par importer des événements depuis votre source de données externe.
      </p>
      {onImport && (
        <Button onClick={onImport} className="gap-2">
          <Plus className="h-4 w-4" />
          Importer des événements
        </Button>
      )}
    </div>
  );
}
