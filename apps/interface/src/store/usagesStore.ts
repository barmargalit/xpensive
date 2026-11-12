import { create } from "zustand";
import { Usage, UsageBounds, BillType } from "@xpensive/types";
import {
  usagesApi,
  CreateUsagePayload,
  UsageFilterParams,
} from "@/api/usagesApi";

type UsagesByType = Record<BillType, Usage[]>;
type LoadingByType = Record<BillType, boolean>;
type BoundsByType = Record<BillType, UsageBounds | null>;

interface UsagesState {
  usages: UsagesByType;
  loading: LoadingByType;
  bounds: BoundsByType;
  fetchByType: (params: UsageFilterParams) => Promise<void>;
  fetchBounds: (type: BillType) => Promise<void>;
  createMany: (payload: CreateUsagePayload[]) => Promise<Usage[]>;
}

const emptyUsages = (): UsagesByType =>
  Object.values(BillType).reduce(
    (acc, t) => ({ ...acc, [t]: [] }),
    {} as UsagesByType,
  );

const emptyLoading = (): LoadingByType =>
  Object.values(BillType).reduce(
    (acc, t) => ({ ...acc, [t]: false }),
    {} as LoadingByType,
  );

const emptyBounds = (): BoundsByType =>
  Object.values(BillType).reduce(
    (acc, t) => ({ ...acc, [t]: null }),
    {} as BoundsByType,
  );

export const useUsagesStore = create<UsagesState>((set, get) => ({
  usages: emptyUsages(),
  loading: emptyLoading(),
  bounds: emptyBounds(),

  fetchByType: async (params) => {
    set((s) => ({ loading: { ...s.loading, [params.type]: true } }));
    try {
      const data = await usagesApi.fetchByType(params);
      set((s) => ({ usages: { ...s.usages, [params.type]: data } }));
    } finally {
      set((s) => ({ loading: { ...s.loading, [params.type]: false } }));
    }
  },

  fetchBounds: async (type) => {
    const data = await usagesApi.fetchBounds(type);
    set((s) => ({ bounds: { ...s.bounds, [type]: data } }));
  },

  createMany: async (payload) => {
    if (payload.length === 0) return [];
    const created = await usagesApi.createMany(payload);
    for (const usage of created) {
      set((s) => ({
        usages: {
          ...s.usages,
          [usage.type]: [...s.usages[usage.type as BillType], usage],
        },
      }));
    }
    // Refresh bounds for each affected type so the date range picker
    // reflects the newly imported dates (first/last entry).
    const affectedTypes = [...new Set(created.map((u) => u.type as BillType))];
    await Promise.all(affectedTypes.map((type) => get().fetchBounds(type)));
    return created;
  },
}));
