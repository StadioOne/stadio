import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Json } from '@/integrations/supabase/types';

export interface Category {
  id: string;
  name_fr: string;
  name_en: string;
  description_fr: string | null;
  description_en: string | null;
  slug: string;
  display_order: number;
  is_visible: boolean;
  status: 'draft' | 'published' | 'archived';
  auto_rules: Json | null;
  pinned_event_ids: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CategoryWithEventCount extends Category {
  event_count: number;
}

export interface CategoryFilters {
  status?: 'draft' | 'published' | 'archived' | 'all';
  search?: string;
}

export const categoryQueryKeys = {
  all: ['categories'] as const,
  list: (filters?: CategoryFilters) => ['categories', 'list', filters] as const,
  detail: (id: string) => ['categories', id] as const,
  stats: ['categories', 'stats'] as const,
};

export function useCategories(filters: CategoryFilters = {}) {
  return useQuery<CategoryWithEventCount[]>({
    queryKey: categoryQueryKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`name_fr.ilike.${searchTerm},name_en.ilike.${searchTerm},slug.ilike.${searchTerm}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get event counts for each category from event_categories junction table
      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (category) => {
          const { count } = await supabase
            .from('event_categories')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id);

          return {
            ...category,
            pinned_event_ids: category.pinned_event_ids || [],
            event_count: count || 0,
          } as CategoryWithEventCount;
        })
      );

      return categoriesWithCounts;
    },
    staleTime: 1000 * 30,
  });
}

export function useCategory(id: string) {
  return useQuery<Category | null>({
    queryKey: categoryQueryKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        pinned_event_ids: data.pinned_event_ids || [],
      } as Category;
    },
    enabled: !!id,
  });
}

export function useCategoriesStats() {
  return useQuery({
    queryKey: categoryQueryKeys.stats,
    queryFn: async () => {
      const [totalRes, publishedRes, draftRes] = await Promise.all([
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('categories').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      ]);

      return {
        total: totalRes.count || 0,
        published: publishedRes.count || 0,
        draft: draftRes.count || 0,
      };
    },
    staleTime: 1000 * 60,
  });
}

export interface CategoryInput {
  name_fr: string;
  name_en: string;
  description_fr?: string;
  description_en?: string;
  slug: string;
  display_order?: number;
  is_visible?: boolean;
  status?: 'draft' | 'published' | 'archived';
  auto_rules?: Json;
  pinned_event_ids?: string[];
}

export function useCategoryMutations() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const createCategory = useMutation({
    mutationFn: async (input: CategoryInput) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name_fr: input.name_fr,
          name_en: input.name_en,
          description_fr: input.description_fr || null,
          description_en: input.description_en || null,
          slug: input.slug,
          display_order: input.display_order || 0,
          is_visible: input.is_visible ?? true,
          status: input.status || 'draft',
          auto_rules: input.auto_rules || {},
          pinned_event_ids: input.pinned_event_ids || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      toast.success(t('categories.created'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...input }: CategoryInput & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update({
          name_fr: input.name_fr,
          name_en: input.name_en,
          description_fr: input.description_fr || null,
          description_en: input.description_en || null,
          slug: input.slug,
          display_order: input.display_order,
          is_visible: input.is_visible,
          status: input.status,
          auto_rules: input.auto_rules || {},
          pinned_event_ids: input.pinned_event_ids || [],
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      toast.success(t('categories.updated'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      toast.success(t('categories.deleted'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const publishCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .update({ status: 'published' as const })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      toast.success(t('categories.published'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const unpublishCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .update({ status: 'draft' as const })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
      toast.success(t('categories.unpublished'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    createCategory,
    updateCategory,
    deleteCategory,
    publishCategory,
    unpublishCategory,
  };
}
