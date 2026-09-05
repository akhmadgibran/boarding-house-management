import { apiClient } from "@/lib/api/client";
import type {
  AssetMasterMutationResponse,
  CreateAssetMasterPayload,
  DeleteAssetMasterResponse,
  GetAllAssetMastersResponse,
} from "@/features/assets/types/assets";

export const assetMastersService = {
  getAll: async (): Promise<GetAllAssetMastersResponse> => {
    return apiClient<GetAllAssetMastersResponse>("/api/admin/asset-masters", {
      method: "GET",
    });
  },

  create: async (
    payload: CreateAssetMasterPayload,
  ): Promise<AssetMasterMutationResponse> => {
    return apiClient<AssetMasterMutationResponse>("/api/admin/asset-masters", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: async (
    id: string,
    payload: CreateAssetMasterPayload,
  ): Promise<AssetMasterMutationResponse> => {
    return apiClient<AssetMasterMutationResponse>(`/api/admin/asset-masters/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove: async (id: string): Promise<DeleteAssetMasterResponse> => {
    return apiClient<DeleteAssetMasterResponse>(`/api/admin/asset-masters/${id}`, {
      method: "DELETE",
    });
  },
};
