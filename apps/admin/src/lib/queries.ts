'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from './api';

/** All crops (including inactive) - shared by many filters and selects. */
export function useCrops() {
  return useQuery({ queryKey: ['crops'], queryFn: adminApi.crops, staleTime: 60_000 });
}

export function useMandis() {
  return useQuery({ queryKey: ['mandis'], queryFn: adminApi.mandis, staleTime: 60_000 });
}
