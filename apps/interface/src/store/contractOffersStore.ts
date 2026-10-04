import { create } from "zustand";
import { ContractOffer } from "@xpensive/types";
import { contractOffersApi, CreateContractOfferPayload, UpdateContractOfferPayload } from "@/api/contractOffersApi";

interface ContractOffersState {
  offersByContract: Record<string, ContractOffer[]>;
  countsByContract: Record<string, number>;
  loading: boolean;
  fetchByContract: (contractId: string) => Promise<void>;
  fetchCounts: () => Promise<void>;
  createOffer: (payload: CreateContractOfferPayload) => Promise<ContractOffer>;
  updateOffer: (id: string, contractId: string, payload: UpdateContractOfferPayload) => Promise<ContractOffer>;
  deleteOffer: (id: string, contractId: string) => Promise<void>;
}

export const useContractOffersStore = create<ContractOffersState>((set, get) => ({
  offersByContract: {},
  countsByContract: {},
  loading: false,

  fetchByContract: async (contractId) => {
    set({ loading: true });
    try {
      const offers = await contractOffersApi.fetchByContract(contractId);
      set((s) => ({ offersByContract: { ...s.offersByContract, [contractId]: offers } }));
    } finally {
      set({ loading: false });
    }
  },

  fetchCounts: async () => {
    const counts = await contractOffersApi.fetchCounts();
    set({
      countsByContract: Object.fromEntries(counts.map((c) => [c.contract_id, c.count])),
    });
  },

  createOffer: async (payload) => {
    const offer = await contractOffersApi.create(payload);
    set((s) => ({
      offersByContract: {
        ...s.offersByContract,
        [payload.contract_id]: [offer, ...(s.offersByContract[payload.contract_id] ?? [])],
      },
      countsByContract: {
        ...s.countsByContract,
        [payload.contract_id]: (s.countsByContract[payload.contract_id] ?? 0) + 1,
      },
    }));
    return offer;
  },

  updateOffer: async (id, contractId, payload) => {
    const updated = await contractOffersApi.update(id, payload);
    set((s) => ({
      offersByContract: {
        ...s.offersByContract,
        [contractId]: (s.offersByContract[contractId] ?? []).map((o) => (o.id === id ? updated : o)),
      },
    }));
    return updated;
  },

  deleteOffer: async (id, contractId) => {
    await contractOffersApi.delete(id);
    set((s) => ({
      offersByContract: {
        ...s.offersByContract,
        [contractId]: (s.offersByContract[contractId] ?? []).filter((o) => o.id !== id),
      },
      countsByContract: {
        ...s.countsByContract,
        [contractId]: Math.max(0, (s.countsByContract[contractId] ?? 0) - 1),
      },
    }));
  },
}));
