import { apiClient } from "@/lib/api/client";
import type {
  CreateRoomPayload,
  DeleteRoomResponse,
  GetAllRoomsResponse,
  GetRoomDetailResponse,
  RoomMutationResponse,
  UpdateRoomPayload,
} from "@/features/rooms/types/rooms";

export const roomsService = {
  getAll: async (): Promise<GetAllRoomsResponse> => {
    return apiClient<GetAllRoomsResponse>("/api/admin/rooms", {
      method: "GET",
    });
  },

  getById: async (id: string): Promise<GetRoomDetailResponse> => {
    return apiClient<GetRoomDetailResponse>(`/api/admin/rooms/${id}`, {
      method: "GET",
    });
  },

  create: async (payload: CreateRoomPayload): Promise<RoomMutationResponse> => {
    return apiClient<RoomMutationResponse>("/api/admin/rooms", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: async (
    id: string,
    payload: UpdateRoomPayload,
  ): Promise<RoomMutationResponse> => {
    return apiClient<RoomMutationResponse>(`/api/admin/rooms/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  remove: async (id: string): Promise<DeleteRoomResponse> => {
    return apiClient<DeleteRoomResponse>(`/api/admin/rooms/${id}`, {
      method: "DELETE",
    });
  },
};
