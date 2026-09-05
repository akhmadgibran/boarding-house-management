import { apiClient } from "@/lib/api/client";
import {
    OccupantAssetsResponse,
    ComplaintsResponse,
    SubmitComplaintPayload,
    Complaint,
    ProcessComplaintPayload,
} from "../types/complaint";

export const complaintService = {
    // Occupant endpoints
    getOccupantAssets: async () => {
        return apiClient<OccupantAssetsResponse>("/api/complaints/my-assets", {
            method: "GET",
        });
    },

    getOccupantComplaints: async () => {
        return apiClient<{ complaints: Complaint[] }>(
            "/api/complaints/my-complaints",
            { method: "GET" },
        );
    },

    submitComplaint: async (payload: SubmitComplaintPayload) => {
        return apiClient<{ message: string }>("/api/complaints", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    // Admin/Operator endpoints
    getAllComplaints: async (status: string = "ALL", sort: string = "desc") => {
        return apiClient<ComplaintsResponse>(
            `/api/complaints?status=${status}&sort=${sort}`,
            { method: "GET" },
        );
    },

    processComplaint: async (id: string, payload: ProcessComplaintPayload) => {
        return apiClient<{ message: string }>(`/api/complaints/${id}/status`, {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },
};
