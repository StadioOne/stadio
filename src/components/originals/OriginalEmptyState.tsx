import { FileText, Headphones, Video, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import type { Database } from '@/integrations/supabase/types';

type OriginalType = Database['public']['Enums']['original_type'];

interface OriginalEmptyStateProps {
  onCreateNew: (type: OriginalType) => void;
  filterActive?: boolean;
}

export function OriginalEmptyState({ onCreateNew, filterActive = false }: OriginalEmptyStateProps) {
  const { t } = useTranslation();

  if (filterActive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {t('originals.noResults')}
        </h3>
        <p className="text-muted-foreground max-w-sm">
          {t('originals.noResultsDescription')}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="flex gap-4 mb-6">
        <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <FileText className="h-7 w-7 text-blue-500" />
        </div>
        <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Headphones className="h-7 w-7 text-purple-500" />
        </div>
        <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center">
          <Video className="h-7 w-7 text-orange-500" />
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-2">
        {t('originals.emptyTitle')}
      </h3>
      <p className="text-muted-foreground max-w-md mb-6">
        {t('originals.emptyDescription')}
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <Button
          variant="outline"
          onClick={() => onCreateNew('article')}
          className="gap-2"
        >
          <FileText className="h-4 w-4 text-blue-500" />
          {t('originals.createArticle')}
        </Button>
        <Button
          variant="outline"
          onClick={() => onCreateNew('podcast')}
          className="gap-2"
        >
          <Headphones className="h-4 w-4 text-purple-500" />
          {t('originals.createPodcast')}
        </Button>
        <Button
          variant="outline"
          onClick={() => onCreateNew('emission')}
          className="gap-2"
        >
          <Video className="h-4 w-4 text-orange-500" />
          {t('originals.createEmission')}
        </Button>
      </div>
    </motion.div>
  );
}
