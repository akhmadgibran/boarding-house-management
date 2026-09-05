import { apiClient } from "@/lib/api/client";
import type {
    DashboardSummaryResponse,
    OccupancySnapshotListResponse,
    TriggerSnapshotResponse,
    BackfillSnapshotResponse,
} from "@/features/dashboard/types/dashboard";

export const dashboardService = {
    getSummary: async (): Promise<DashboardSummaryResponse> => {
        return apiClient<DashboardSummaryResponse>("/api/admin/dashboard/summary", {
            method: "GET",
        });
    },

    getOccupancySnapshots: async (year: number): Promise<OccupancySnapshotListResponse> => {
        return apiClient<OccupancySnapshotListResponse>(
            `/api/admin/dashboard/occupancy-snapshots?year=${year}`,
            { method: "GET" },
        );
    },

    triggerOccupancySnapshot: async (
        year?: number,
        month?: number,
    ): Promise<TriggerSnapshotResponse> => {
        return apiClient<TriggerSnapshotResponse>(
            "/api/admin/dashboard/occupancy-snapshots/trigger",
            {
                method: "POST",
                body: JSON.stringify({ year, month }),
            },
        );
    },

    backfillOccupancySnapshots: async (
        fromYear?: number,
    ): Promise<BackfillSnapshotResponse> => {
        return apiClient<BackfillSnapshotResponse>(
            "/api/admin/dashboard/occupancy-snapshots/backfill",
            {
                method: "POST",
                body: JSON.stringify({ fromYear }),
            },
        );
    },
};
