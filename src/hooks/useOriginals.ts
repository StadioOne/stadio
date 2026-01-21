import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Original, Author } from '@/lib/api-types';
import type { Database } from '@/integrations/supabase/types';

type OriginalType = Database['public']['Enums']['original_type'];
type ContentStatus = Database['public']['Enums']['content_status'];

export interface OriginalsFilters {
  status?: ContentStatus | 'all';
  type?: OriginalType | 'all';
  authorId?: string;
  categoryId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface OriginalWithAuthor extends Original {
  author: Author | null;
}

export interface OriginalsStats {
  total: number;
  articles: number;
  podcasts: number;
  emissions: number;
  published: number;
  draft: number;
}

export function useOriginals(filters: OriginalsFilters = {}) {
  const {
    status = 'all',
    type = 'all',
    authorId,
    categoryId,
    search,
    limit = 50,
    offset = 0,
  } = filters;

  return useQuery({
    queryKey: ['originals', filters],
    queryFn: async (): Promise<{ data: OriginalWithAuthor[]; count: number }> => {
      let query = supabase
        .from('originals')
        .select(`
          *,
          author:authors(*)
        `, { count: 'exact' });

      // Apply filters
      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (type !== 'all') {
        query = query.eq('type', type);
      }

      if (authorId) {
        query = query.eq('author_id', authorId);
      }

      if (categoryId) {
        query = query.contains('category_ids', [categoryId]);
      }

      if (search) {
        query = query.or(`title_fr.ilike.%${search}%,title_en.ilike.%${search}%,excerpt_fr.ilike.%${search}%`);
      }

      // Pagination and ordering
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        data: (data || []) as OriginalWithAuthor[],
        count: count || 0,
      };
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useOriginalsStats() {
  return useQuery({
    queryKey: ['originals-stats'],
    queryFn: async (): Promise<OriginalsStats> => {
      const { data, error } = await supabase
        .from('originals')
        .select('id, type, status');

      if (error) {
        throw error;
      }

      const stats: OriginalsStats = {
        total: data?.length || 0,
        articles: 0,
        podcasts: 0,
        emissions: 0,
        published: 0,
        draft: 0,
      };

      data?.forEach((original) => {
        if (original.type === 'article') stats.articles++;
        if (original.type === 'podcast') stats.podcasts++;
        if (original.type === 'emission') stats.emissions++;
        if (original.status === 'published') stats.published++;
        if (original.status === 'draft') stats.draft++;
      });

      return stats;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useOriginal(id: string | null) {
  return useQuery({
    queryKey: ['original', id],
    queryFn: async (): Promise<OriginalWithAuthor | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('originals')
        .select(`
          *,
          author:authors(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data as OriginalWithAuthor;
    },
    enabled: !!id,
  });
}

export function useAuthors() {
  return useQuery({
    queryKey: ['authors'],
    queryFn: async (): Promise<Author[]> => {
      const { data, error } = await supabase
        .from('authors')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
