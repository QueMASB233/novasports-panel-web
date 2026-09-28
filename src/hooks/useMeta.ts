import { useQuery } from '@tanstack/react-query';
import { metaApi } from '@/api/endpoints';

export function useMeta() {
  return useQuery({
    queryKey: ['meta'],
    queryFn: metaApi.get,
    staleTime: 60 * 60 * 1000,
  });
}
