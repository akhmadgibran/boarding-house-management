export type DashboardSummaryResponse = {
    summary: {
        totalRooms: number;
        occupiedRooms: number;
        totalActiveTenants: number;
        monthlyIncome: number;
        totalOutstanding: number;
        endingBalance: number;
    };
    recentActivities: {
        id: string;
        tenantName: string;
        amount: number;
        date: string;
        method: string;
        type: string;
    }[];
};

export type OccupancySnapshot = {
    id: string;
    year: number;
    month: number;         // 1–12
    occupiedRooms: number;
    totalRooms: number;
    snapshotDate: string;
    createdAt: string;
    updatedAt: string;
};

export type OccupancySnapshotListResponse = {
    year: number;
    snapshots: (OccupancySnapshot | null)[]; // 12 elemen, index 0 = Jan
};

export type TriggerSnapshotResponse = {
    message: string;
    snapshot: OccupancySnapshot;
};

export type BackfillSnapshotResponse = {
    message: string;
    processed: number;
    skipped: number;
    errors: { year: number; month: number; error: string }[];
};
