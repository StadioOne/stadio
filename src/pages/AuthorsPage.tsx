import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AuthorFilters } from '@/components/authors/AuthorFilters';
import { AuthorStats } from '@/components/authors/AuthorStats';
import { AuthorCard } from '@/components/authors/AuthorCard';
import { AuthorRow } from '@/components/authors/AuthorRow';
import { AuthorEmptyState } from '@/components/authors/AuthorEmptyState';
import { AuthorDetailPanel } from '@/components/authors/AuthorDetailPanel';
import { useAuthors, useAuthorsStats, type AuthorWithStats } from '@/hooks/useAuthors';
import { useAuthorMutations } from '@/hooks/useAuthorMutations';

const ITEMS_PER_PAGE = 24;

interface FiltersState {
  isActive: boolean | 'all';
  search: string;
  limit: number;
  offset: number;
}

export default function AuthorsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [filters, setFilters] = useState<FiltersState>({
    isActive: 'all',
    search: '',
    limit: ITEMS_PER_PAGE,
    offset: 0,
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorWithStats | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading, error, refetch } = useAuthors(filters);
  const { data: stats, isLoading: statsLoading } = useAuthorsStats();
  const { toggleActive, deleteAuthor } = useAuthorMutations();

  const authors = data?.data || [];
  const totalCount = data?.count || 0;
  const hasFilters = filters.search !== '' || filters.isActive !== 'all';

  const handleSearchChange = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, offset: 0 }));
  }, []);

  const handleActiveChange = useCallback((isActive: boolean | 'all') => {
    setFilters((prev) => ({ ...prev, isActive, offset: 0 }));
  }, []);

  const handleEdit = useCallback((author: AuthorWithStats) => {
    setSelectedAuthor(author);
    setIsCreating(false);
    setIsPanelOpen(true);
  }, []);

  const handleCreateNew = useCallback(() => {
    setSelectedAuthor(null);
    setIsCreating(true);
    setIsPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedAuthor(null);
    setIsCreating(false);
  }, []);

  const handleToggleActive = useCallback((id: string, isActive: boolean) => {
    toggleActive.mutate({ id, isActive });
  }, [toggleActive]);

  const handleDelete = useCallback((id: string) => {
    deleteAuthor.mutate(id);
  }, [deleteAuthor]);

  const handleViewContents = useCallback((authorId: string) => {
    navigate(`/originals?authorId=${authorId}`);
  }, [navigate]);

  const handleClearFilters = useCallback(() => {
    setFilters({
      isActive: 'all',
      search: '',
      limit: ITEMS_PER_PAGE,
      offset: 0,
    });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({
      ...prev,
      offset: (page - 1) * ITEMS_PER_PAGE,
    }));
  }, []);

  const currentPage = Math.floor(filters.offset / ITEMS_PER_PAGE) + 1;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            {t('authors.title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('authors.subtitle')}</p>
        </div>
      </div>

      {/* Stats */}
      <AuthorStats stats={stats} isLoading={statsLoading} />

      {/* Filters */}
      <AuthorFilters
        onSearchChange={handleSearchChange}
        onActiveChange={handleActiveChange}
        activeFilter={filters.isActive}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center">
                        <Skeleton className="h-20 w-20 rounded-full mb-4" />
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-24 mb-3" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('authors.name')}</TableHead>
                        <TableHead>{t('authors.biography')}</TableHead>
                        <TableHead>{t('authors.socialNetworks')}</TableHead>
                        <TableHead>{t('authors.stats.contents')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(6)].map((_, i) => (
                        <TableRow key={i}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          </td>
                          <td className="p-4"><Skeleton className="h-4 w-48" /></td>
                          <td className="p-4"><Skeleton className="h-8 w-16" /></td>
                          <td className="p-4"><Skeleton className="h-6 w-12" /></td>
                          <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                          <td className="p-4"><Skeleton className="h-8 w-8" /></td>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-destructive mb-4">{t('common.error')}</p>
                <Button onClick={() => refetch()} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t('common.retry')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : authors.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card>
              <CardContent className="p-0">
                <AuthorEmptyState
                  hasFilters={hasFilters}
                  onCreateNew={handleCreateNew}
                  onClearFilters={handleClearFilters}
                />
              </CardContent>
            </Card>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {authors.map((author, index) => (
              <AuthorCard
                key={author.id}
                author={author}
                onEdit={handleEdit}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
                onViewContents={handleViewContents}
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
          >
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('authors.name')}</TableHead>
                      <TableHead>{t('authors.biography')}</TableHead>
                      <TableHead>{t('authors.socialNetworks')}</TableHead>
                      <TableHead>{t('authors.stats.contents')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authors.map((author, index) => (
                      <AuthorRow
                        key={author.id}
                        author={author}
                        onEdit={handleEdit}
                        onToggleActive={handleToggleActive}
                        onDelete={handleDelete}
                        onViewContents={handleViewContents}
                        index={index}
                      />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {t('common.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('common.pageOf', { current: currentPage, total: totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            {t('common.next')}
          </Button>
        </div>
      )}

      {/* Detail Panel */}
      <AuthorDetailPanel
        author={selectedAuthor}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        isCreating={isCreating}
      />
    </div>
  );
}
