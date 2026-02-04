import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Territory {
  code: string;
  name: string;
  region: string | null;
}

export function useTerritories() {
  return useQuery({
    queryKey: ['territories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('territories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Territory[];
    },
  });
}

export function useTerritoriesByRegion() {
  const { data: territories, ...rest } = useTerritories();
  
  const grouped = territories?.reduce((acc, territory) => {
    const region = territory.region || 'Autre';
    if (!acc[region]) {
      acc[region] = [];
    }
    acc[region].push(territory);
    return acc;
  }, {} as Record<string, Territory[]>);
  
  return { data: grouped, ...rest };
}
