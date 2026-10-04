import { BillType, ContractData, ContractOffer, ContractOfferStatus } from "@xpensive/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface CreateContractOfferPayload {
  contract_id: string;
  provider_id: string;
  bill_type: BillType;
  monthly_price: number;
  received_date: string;
  status?: ContractOfferStatus;
  comment?: string | null;
  data: ContractData;
}

export interface UpdateContractOfferPayload {
  provider_id?: string;
  bill_type?: BillType;
  monthly_price?: number;
  received_date?: string;
  status?: ContractOfferStatus;
  comment?: string | null;
  data?: ContractData;
  /** Required when transitioning status to "accepted" — becomes the start_date of the new contract. */
  effective_date?: string;
  /** Optional, only used when transitioning status to "accepted" — becomes the end_date of the new contract. */
  new_contract_end_date?: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const contractOffersApi = {
  fetchByContract: (contractId: string): Promise<ContractOffer[]> =>
    request<ContractOffer[]>(`/contract-offers?contract_id=${contractId}`),

  fetchCounts: (): Promise<{ contract_id: string; count: number }[]> =>
    request<{ contract_id: string; count: number }[]>("/contract-offers/counts"),

  create: (payload: CreateContractOfferPayload): Promise<ContractOffer> =>
    request<ContractOffer>("/contract-offers", { method: "POST", body: JSON.stringify(payload) }),

  update: (id: string, payload: UpdateContractOfferPayload): Promise<ContractOffer> =>
    request<ContractOffer>(`/contract-offers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  delete: (id: string): Promise<void> =>
    request<void>(`/contract-offers/${id}`, { method: "DELETE" }),
};
