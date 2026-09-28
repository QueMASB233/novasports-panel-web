import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/endpoints';

export function useReportsMeta() {
  return useQuery({
    queryKey: ['reports-meta'],
    queryFn: reportsApi.meta,
    staleTime: 60 * 60 * 1000,
  });
}

export function useReportsQueueCount() {
  return useQuery({
    queryKey: ['reports-queue'],
    queryFn: () => reportsApi.list({ status: 'open', limit: 1, offset: 0 }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
