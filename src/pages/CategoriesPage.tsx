import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { CategoryStats } from '@/components/categories/CategoryStats';
import { CategoryEmptyState } from '@/components/categories/CategoryEmptyState';
import { CategoryFilters } from '@/components/categories/CategoryFilters';
import { 
  useCategories, 
  useCategoriesStats, 
  useCategoryMutations,
  type CategoryFilters as CategoryFiltersType,
  type CategoryWithEventCount,
  type CategoryInput,
} from '@/hooks/useCategories';

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<CategoryFiltersType>({});
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithEventCount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories, isLoading } = useCategories(filters);
  const { data: stats, isLoading: statsLoading } = useCategoriesStats();
  const { 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    publishCategory, 
    unpublishCategory 
  } = useCategoryMutations();

  const handleCreateClick = () => {
    setSelectedCategory(null);
    setFormOpen(true);
  };

  const handleEditClick = (category: CategoryWithEventCount) => {
    setSelectedCategory(category);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: CategoryInput) => {
    if (selectedCategory) {
      updateCategory.mutate(
        { id: selectedCategory.id, ...data },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      createCategory.mutate(data, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteCategory.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('nav.categories')}</h1>
        <Button onClick={handleCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          {t('categories.create')}
        </Button>
      </div>

      {/* Stats */}
      <CategoryStats stats={stats} isLoading={statsLoading} />

      {/* Filters */}
      <CategoryFilters filters={filters} onFiltersChange={setFilters} />

      {/* Categories List */}
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="grid gap-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={handleEditClick}
              onDelete={(id) => setDeleteId(id)}
              onPublish={(id) => publishCategory.mutate(id)}
              onUnpublish={(id) => unpublishCategory.mutate(id)}
            />
          ))}
        </div>
      ) : (
        <CategoryEmptyState onCreateClick={handleCreateClick} />
      )}

      {/* Create/Edit Form */}
      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        category={selectedCategory}
        onSubmit={handleFormSubmit}
        isLoading={createCategory.isPending || updateCategory.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('categories.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('categories.deleteConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
