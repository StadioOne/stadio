import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Author = Database['public']['Tables']['authors']['Row'];

export interface AuthorsFilters {
  isActive?: boolean | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuthorWithStats extends Author {
  contentsCount: number;
}

export interface AuthorsStats {
  total: number;
  active: number;
  inactive: number;
  totalContents: number;
}

export function useAuthors(filters: AuthorsFilters = {}) {
  const { isActive = 'all', search, limit = 50, offset = 0 } = filters;

  return useQuery({
    queryKey: ['authors', filters],
    queryFn: async () => {
      // First, get all authors
      let query = supabase
        .from('authors')
        .select('*', { count: 'exact' });

      // Apply active filter
      if (isActive !== 'all') {
        query = query.eq('is_active', isActive);
      }

      // Apply search filter
      if (search && search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      // Apply pagination and ordering
      query = query
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      const { data: authors, error, count } = await query;

      if (error) throw error;

      // Get content counts for each author
      const authorIds = authors?.map(a => a.id) || [];
      
      let contentsMap: Record<string, number> = {};
      
      if (authorIds.length > 0) {
        const { data: contentsCounts, error: countsError } = await supabase
          .from('originals')
          .select('author_id')
          .in('author_id', authorIds)
          .neq('status', 'archived');

        if (!countsError && contentsCounts) {
          contentsMap = contentsCounts.reduce((acc, item) => {
            if (item.author_id) {
              acc[item.author_id] = (acc[item.author_id] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>);
        }
      }

      // Merge authors with their content counts
      const authorsWithStats: AuthorWithStats[] = (authors || []).map(author => ({
        ...author,
        contentsCount: contentsMap[author.id] || 0,
      }));

      return {
        data: authorsWithStats,
        count: count || 0,
      };
    },
    staleTime: 30000,
  });
}

export function useAuthorsStats() {
  return useQuery({
    queryKey: ['authors-stats'],
    queryFn: async () => {
      const { data: authors, error } = await supabase
        .from('authors')
        .select('id, is_active');

      if (error) throw error;

      const { data: contents, error: contentsError } = await supabase
        .from('originals')
        .select('author_id')
        .neq('status', 'archived');

      if (contentsError) throw contentsError;

      const stats: AuthorsStats = {
        total: authors?.length || 0,
        active: authors?.filter(a => a.is_active).length || 0,
        inactive: authors?.filter(a => !a.is_active).length || 0,
        totalContents: contents?.filter(c => c.author_id).length || 0,
      };

      return stats;
    },
    staleTime: 30000,
  });
}

export function useAuthor(id: string | null) {
  return useQuery({
    queryKey: ['author', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('authors')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useAuthorContents(authorId: string | null) {
  return useQuery({
    queryKey: ['author-contents', authorId],
    queryFn: async () => {
      if (!authorId) return [];

      const { data, error } = await supabase
        .from('originals')
        .select('id, title_fr, type, status, created_at')
        .eq('author_id', authorId)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!authorId,
  });
}
