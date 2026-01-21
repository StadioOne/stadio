import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, ChevronLeft, ChevronRight } from 'lucide-react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OriginalFilters } from '@/components/originals/OriginalFilters';
import { OriginalStats } from '@/components/originals/OriginalStats';
import { OriginalCard } from '@/components/originals/OriginalCard';
import { OriginalRow } from '@/components/originals/OriginalRow';
import { OriginalEmptyState } from '@/components/originals/OriginalEmptyState';
import { OriginalDetailPanel } from '@/components/originals/OriginalDetailPanel';
import { useOriginals, useOriginalsStats, useAuthors, type OriginalsFilters as FiltersType, type OriginalWithAuthor } from '@/hooks/useOriginals';
import { useOriginalMutations } from '@/hooks/useOriginalMutations';
import type { Database } from '@/integrations/supabase/types';

type OriginalType = Database['public']['Enums']['original_type'];

const ITEMS_PER_PAGE = 12;

export default function OriginalsPage() {
  const { t } = useTranslation();
  
  // State
  const [filters, setFilters] = useState<FiltersType>({ limit: ITEMS_PER_PAGE, offset: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedOriginal, setSelectedOriginal] = useState<OriginalWithAuthor | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createType, setCreateType] = useState<OriginalType>('article');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Data fetching
  const { data, isLoading, error } = useOriginals(filters);
  const { data: stats, isLoading: statsLoading } = useOriginalsStats();
  const { data: authors = [] } = useAuthors();

  // Mutations
  const { publishOriginal, unpublishOriginal, duplicateOriginal, deleteOriginal } = useOriginalMutations();

  // Handlers
  const handleEdit = useCallback((original: OriginalWithAuthor) => {
    setSelectedOriginal(original);
    setIsCreating(false);
    setIsPanelOpen(true);
  }, []);

  const handleCreateNew = useCallback((type: OriginalType) => {
    setSelectedOriginal(null);
    setCreateType(type);
    setIsCreating(true);
    setIsPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedOriginal(null);
    setIsCreating(false);
  }, []);

  const handlePublish = useCallback((id: string) => {
    publishOriginal.mutate(id);
  }, [publishOriginal]);

  const handleUnpublish = useCallback((id: string) => {
    unpublishOriginal.mutate(id);
  }, [unpublishOriginal]);

  const handleDuplicate = useCallback((id: string) => {
    duplicateOriginal.mutate(id);
  }, [duplicateOriginal]);

  const handleDelete = useCallback((id: string) => {
    deleteOriginal.mutate(id);
  }, [deleteOriginal]);

  const handleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  // Pagination
  const totalPages = Math.ceil((data?.count || 0) / ITEMS_PER_PAGE);
  const currentPage = Math.floor((filters.offset || 0) / ITEMS_PER_PAGE) + 1;

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({
      ...prev,
      offset: (page - 1) * ITEMS_PER_PAGE,
    }));
  };

  const hasActiveFilters = !!(filters.search || filters.type || filters.status || filters.authorId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Film className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('nav.originals')}</h1>
            <p className="text-sm text-muted-foreground">{t('originals.pageDescription')}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <OriginalStats stats={stats} isLoading={statsLoading} />

      {/* Filters */}
      <OriginalFilters
        filters={filters}
        onFiltersChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        authors={authors}
        onCreateNew={handleCreateNew}
      />

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            )}
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <p className="text-destructive">{t('common.error')}</p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              {t('common.retry')}
            </Button>
          </motion.div>
        ) : !data?.data.length ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <OriginalEmptyState 
              onCreateNew={handleCreateNew} 
              filterActive={hasActiveFilters}
            />
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {data.data.map((original, index) => (
              <OriginalCard
                key={original.id}
                original={original}
                onEdit={handleEdit}
                onPublish={handlePublish}
                onUnpublish={handleUnpublish}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                index={index}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border rounded-lg"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>{t('originals.title')}</TableHead>
                  <TableHead>{t('originals.type')}</TableHead>
                  <TableHead>{t('originals.author')}</TableHead>
                  <TableHead>{t('originals.duration')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((original, index) => (
                  <OriginalRow
                    key={original.id}
                    original={original}
                    onEdit={handleEdit}
                    onPublish={handlePublish}
                    onUnpublish={handleUnpublish}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    isSelected={selectedIds.has(original.id)}
                    onSelect={handleSelect}
                    index={index}
                  />
                ))}
              </TableBody>
            </Table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {data && data.count > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('common.showing', {
              from: (filters.offset || 0) + 1,
              to: Math.min((filters.offset || 0) + ITEMS_PER_PAGE, data.count),
              total: data.count,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <Button
                  key={i + 1}
                  variant={currentPage === i + 1 ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handlePageChange(i + 1)}
                  className="w-8"
                >
                  {i + 1}
                </Button>
              )).slice(
                Math.max(0, currentPage - 3),
                Math.min(totalPages, currentPage + 2)
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      <OriginalDetailPanel
        original={selectedOriginal}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        authors={authors}
        isCreating={isCreating}
        createType={createType}
      />
    </div>
  );
}
