import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, type MandiPriceQuery, type SupplierQuery, type WeatherQuery } from './endpoints';
import { qk } from './queryKeys';
import type {
  Activity,
  ActivityRange,
  ActivityWithCrop,
  CreateFarmerCropBody,
  Expense,
  ExpenseBody,
  FarmBody,
  Scheme,
  UpdateFarmerCropBody,
  UpdateProfileBody,
} from './types';

// ---------- invalidation helpers ----------

/** Anything that changes a crop's tasks, expenses or estimates touches these screens. */
export function invalidateCropData(qc: QueryClient): Promise<unknown> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: qk.dashboard }),
    qc.invalidateQueries({ queryKey: qk.activitiesAll }),
    qc.invalidateQueries({ queryKey: qk.farmerCrops }),
    qc.invalidateQueries({ queryKey: qk.expensesAll }),
    qc.invalidateQueries({ queryKey: qk.farms }),
  ]);
}

// ---------- queries ----------

export const useDashboard = () => useQuery({ queryKey: qk.dashboard, queryFn: api.dashboard });

export const useFarms = () => useQuery({ queryKey: qk.farms, queryFn: api.farms.list });

export const useFarm = (id: string | undefined) =>
  useQuery({ queryKey: qk.farm(id ?? ''), queryFn: () => api.farms.get(id!), enabled: !!id });

export const useCropCatalog = () =>
  useQuery({ queryKey: qk.crops, queryFn: () => api.crops.list(), staleTime: 6 * 60 * 60 * 1000 });

export const useFarmerCrops = () => useQuery({ queryKey: qk.farmerCrops, queryFn: () => api.farmerCrops.list() });

export const useFarmerCrop = (id: string | undefined) =>
  useQuery({ queryKey: qk.farmerCrop(id ?? ''), queryFn: () => api.farmerCrops.get(id!), enabled: !!id });

export const useProfit = (id: string | undefined) =>
  useQuery({ queryKey: qk.profit(id ?? ''), queryFn: () => api.farmerCrops.profit(id!), enabled: !!id });

export const UPCOMING_DAYS = 14;

export const useActivities = (range: ActivityRange) =>
  useQuery({
    queryKey: qk.activities(range),
    queryFn: () => api.activities.list(range, range === 'upcoming' ? UPCOMING_DAYS : undefined),
  });

/**
 * There is no GET /activities/:id, so an activity is found through its crop's activity list,
 * or (when only the id is known, e.g. from a push notification) by searching the task ranges.
 */
export const useActivityLookup = (activityId: string | undefined, farmerCropId: string | undefined) => {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.activityLookup(activityId ?? ''),
    enabled: !!activityId,
    queryFn: async (): Promise<Activity | ActivityWithCrop | null> => {
      if (farmerCropId) {
        const list = await api.farmerCrops.activities(farmerCropId);
        return list.find((a) => a.id === activityId) ?? null;
      }
      const cached = qc
        .getQueriesData<ActivityWithCrop[]>({ queryKey: qk.activitiesAll })
        .flatMap(([, data]) => (Array.isArray(data) ? data : []));
      const hit = cached.find((a) => a.id === activityId);
      if (hit) return hit;
      for (const range of ['today', 'overdue', 'upcoming', 'completed'] as const) {
        const list = await api.activities.list(range, range === 'upcoming' ? 90 : undefined);
        const found = list.find((a) => a.id === activityId);
        if (found) return found;
      }
      return null;
    },
  });
};

export const useExpenses = (farmerCropId?: string) =>
  useQuery({ queryKey: qk.expenses(farmerCropId), queryFn: () => api.expenses.list(farmerCropId) });

export const useWeatherCurrent = (q: WeatherQuery, enabled = true) =>
  useQuery({ queryKey: qk.weatherCurrent(q), queryFn: () => api.weather.current(q), enabled });

export const useWeatherForecast = (q: WeatherQuery, enabled = true) =>
  useQuery({ queryKey: qk.weatherForecast(q), queryFn: () => api.weather.forecast(q), enabled });

export const useMandis = () =>
  useQuery({ queryKey: qk.mandis, queryFn: () => api.mandi.mandis(), staleTime: 6 * 60 * 60 * 1000 });

export const useMandiPrices = (q: MandiPriceQuery) =>
  useQuery({ queryKey: qk.mandiPrices(q), queryFn: () => api.mandi.prices(q) });

export const useMandiCropPrices = (cropId: string | undefined, district?: string) =>
  useQuery({
    queryKey: qk.mandiCrop(cropId ?? '', district),
    queryFn: () => api.mandi.cropPrices(cropId!, { district, days: 30 }),
    enabled: !!cropId,
  });

export const useNotifications = () =>
  useQuery({ queryKey: qk.notifications, queryFn: () => api.notifications.list(1, 100) });

export const useAdvisories = (language: string) =>
  useQuery({ queryKey: qk.advisories(language), queryFn: () => api.advisories.list({ language }) });

export const useNearbySuppliers = (q: SupplierQuery, enabled = true) =>
  useQuery({ queryKey: qk.suppliers(q), queryFn: () => api.suppliers.nearby(q), enabled });

export const useSchemes = (language: string) =>
  useQuery({ queryKey: qk.schemes(language), queryFn: () => api.schemes.list({ language }) });

/** One scheme; shows the copy from an already-loaded list while the detail request runs. */
export const useScheme = (id: string | undefined) => {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.scheme(id ?? ''),
    queryFn: () => api.schemes.get(id!),
    enabled: !!id,
    placeholderData: () =>
      qc
        .getQueriesData<Scheme[]>({ queryKey: qk.schemesAll })
        .flatMap(([, data]) => (Array.isArray(data) ? data : []))
        .find((s) => s.id === id),
  });
};

// ---------- mutations ----------

export function useToggleActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      done ? api.activities.complete(id) : api.activities.uncomplete(id),
    onSuccess: () => invalidateCropData(qc),
  });
}

export function useSaveFarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: FarmBody }) =>
      id ? api.farms.update(id, body) : api.farms.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.farms });
      void qc.invalidateQueries({ queryKey: qk.dashboard });
      void qc.invalidateQueries({ queryKey: ['weather'] });
    },
  });
}

export function useDeleteFarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.farms.remove(id),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: qk.farm(id) });
      void invalidateCropData(qc);
    },
  });
}

export function useCreateFarmerCrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFarmerCropBody) => api.farmerCrops.create(body),
    onSuccess: (data) => {
      qc.setQueryData(qk.farmerCrop(data.id), data);
      void invalidateCropData(qc);
    },
  });
}

export function useUpdateFarmerCrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateFarmerCropBody }) => api.farmerCrops.update(id, body),
    onSuccess: (data) => {
      qc.setQueryData(qk.farmerCrop(data.id), data);
      void invalidateCropData(qc);
    },
  });
}

export function useDeleteFarmerCrop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.farmerCrops.remove(id),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: qk.farmerCrop(id) });
      void invalidateCropData(qc);
    },
  });
}

export function useSaveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: ExpenseBody }): Promise<Expense> => {
      if (id) {
        const { farmerCropId: _ignored, ...rest } = body;
        return api.expenses.update(id, rest);
      }
      return api.expenses.create(body);
    },
    onSuccess: () => invalidateCropData(qc),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.expenses.remove(id),
    onSuccess: () => invalidateCropData(qc),
  });
}

export function useUpdateProfile() {
  return useMutation({ mutationFn: (body: UpdateProfileBody) => api.farmer.update(body) });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.notificationsAll });
      void qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.notificationsAll });
      void qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}
