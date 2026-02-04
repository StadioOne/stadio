import { Radio, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BroadcasterEmptyStateProps {
  hasFilters?: boolean;
  onClearFilters?: () => void;
  onCreate?: () => void;
}

export function BroadcasterEmptyState({
  hasFilters = false,
  onClearFilters,
  onCreate,
}: BroadcasterEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Radio className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Aucun résultat</h3>
        <p className="text-muted-foreground mb-4">
          Aucun diffuseur ne correspond à vos critères de recherche.
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Effacer les filtres
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Radio className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Aucun diffuseur</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        Créez votre premier diffuseur pour commencer à gérer les droits de diffusion.
      </p>
      {onCreate && (
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau diffuseur
        </Button>
      )}
    </div>
  );
}
