export type MaintenanceStatus = "PROCESS" | "PENDING" | "FINISHED";
export type AssetStatus = "BROKEN" | "GOOD" | "MAINTENANCE";

export type ComplaintCategory = "ASSET" | "OTHERS";
export type ComplaintStatus = "PENDING" | "PROCESSED" | "RESOLVED";

export type AssetMaster = {
    id: string;
    name: string;
};

export type Room = {
    id: string;
    name: string;
};

export type AssetMaintenanceLog = {
    id: string;
    assetId: string;
    details: string;
    status: MaintenanceStatus;
    createdAt: string;
    updatedAt: string;
};

export type Complaint = {
    id: string;
    category: ComplaintCategory;
    detail: string;
    status: ComplaintStatus;
    createdAt: string;
    updatedAt: string;
    assetId?: string | null;
    asset?: {
        id: string;
        name: string;
        status: AssetStatus;
        room: Room;
        assetMaster: AssetMaster;
    } | null;
    reportedBy?: {
        email: string;
        occupantDetails?: {
            name: string;
        };
    };
};

export type OccupantAsset = {
    id: string;
    name: string;
    details: string;
    status: AssetStatus;
};

export type OccupantAssetsResponse = {
    roomId: string;
    assets: OccupantAsset[];
};

export type ComplaintsResponse = {
    complaints: Complaint[];
};

export type SubmitComplaintPayload = {
    category: ComplaintCategory;
    assetId?: string | null;
    details: string;
};

export type ProcessComplaintPayload = {
    status: ComplaintStatus;
    maintenanceDetails?: string;
};
