import { apiClient } from "@/lib/api/client";
import type {
  CreateExpensePayload,
  CreateExpenseResponse,
  GetFinancialRecordsResponse,
  UpdateExpensePayload,
  UpdateExpenseResponse,
} from "@/features/financial/types/financial";

export const financialService = {
  getAll: async (type?: string): Promise<GetFinancialRecordsResponse> => {
    const params = new URLSearchParams();
    if (type) {
      params.append("type", type);
    }
    const queryString = params.toString();
    const url = `/api/admin/financial${queryString ? `?${queryString}` : ""}`;
    
    return apiClient<GetFinancialRecordsResponse>(url, {
      method: "GET",
    });
  },

  createExpense: async (
    payload: CreateExpensePayload,
  ): Promise<CreateExpenseResponse> => {
    return apiClient<CreateExpenseResponse>("/api/admin/financial/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateExpense: async (
    id: string,
    payload: UpdateExpensePayload,
  ): Promise<UpdateExpenseResponse> => {
    return apiClient<UpdateExpenseResponse>(`/api/admin/financial/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};
