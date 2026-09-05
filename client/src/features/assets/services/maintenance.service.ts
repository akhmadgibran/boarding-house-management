import { apiClient } from "@/lib/api/client";
import type {
  GetMaintenanceLogsResponse,
  CreateMaintenanceLogPayload,
  UpdateMaintenanceLogPayload,
} from "../types/maintenance";

export const maintenanceService = {
  getLogsByAssetId: async (assetId: string) => {
    return apiClient<GetMaintenanceLogsResponse>(
      `/api/admin/maintenance/${assetId}`,
      { method: "GET" },
    );
  },

  createLog: async (assetId: string, payload: CreateMaintenanceLogPayload) => {
    return apiClient<{ message: string }>(
      `/api/admin/maintenance/${assetId}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  updateLog: async (logId: string, payload: UpdateMaintenanceLogPayload) => {
    return apiClient<{ message: string }>(
      `/api/admin/maintenance/log/${logId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  deleteLog: async (logId: string) => {
    return apiClient<{ message: string }>(
      `/api/admin/maintenance/log/${logId}`,
      { method: "DELETE" },
    );
  },
};
