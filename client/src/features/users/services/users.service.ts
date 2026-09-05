import { apiClient } from "@/lib/api/client";
import type {
  CreateOccupantPayload,
  CreateOccupantResponse,
  CreateOperatorPayload,
  CreateOperatorResponse,
  DeleteUserResponse,
  GetAllUsersResponse,
  UpdateOccupantPayload,
  UpdateOperatorPayload,
  UpdateUserResponse,
} from "@/features/users/types/users";

export const usersService = {
  getAllUsers: async (): Promise<GetAllUsersResponse> => {
    return apiClient<GetAllUsersResponse>("/api/admin/users", {
      method: "GET",
    });
  },

  createOperator: async (
    payload: CreateOperatorPayload
  ): Promise<CreateOperatorResponse> => {
    return apiClient<CreateOperatorResponse>("/api/admin/operators", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  createOccupant: async (
    payload: CreateOccupantPayload
  ): Promise<CreateOccupantResponse> => {
    return apiClient<CreateOccupantResponse>("/api/admin/occupants", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateOperator: async (
    id: string,
    payload: UpdateOperatorPayload
  ): Promise<UpdateUserResponse> => {
    return apiClient<UpdateUserResponse>(`/api/admin/operators/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  updateOccupant: async (
    id: string,
    payload: UpdateOccupantPayload
  ): Promise<UpdateUserResponse> => {
    return apiClient<UpdateUserResponse>(`/api/admin/occupants/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove: async (id: string): Promise<DeleteUserResponse> => {
    return apiClient<DeleteUserResponse>(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
  },
};
