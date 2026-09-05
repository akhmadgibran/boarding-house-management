import type { MaintenanceStatus, AssetStatus } from "@/features/rooms/types/rooms";

export interface AssetMaintenanceLog {
  id: string;
  assetId: string;
  details: string;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceAssetDetail {
  name: string;
  status: AssetStatus;
}

export interface GetMaintenanceLogsResponse {
  asset: MaintenanceAssetDetail;
  logs: AssetMaintenanceLog[];
}

export interface CreateMaintenanceLogPayload {
  details: string;
  status: MaintenanceStatus;
  assetStatus?: AssetStatus;
}

export interface UpdateMaintenanceLogPayload {
  assetId: string;
  details?: string;
  status?: MaintenanceStatus;
  assetStatus?: AssetStatus;
}
