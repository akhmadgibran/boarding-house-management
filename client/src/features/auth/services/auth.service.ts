import { apiClient } from '@/lib/api/client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export type UserRole = 'ADMIN' | 'OPERATOR' | 'OCCUPANT';
export type ProfileStatus = 'ACTIVE' | 'DEACTIVE';
export type OccupantOccupation = 'BEKERJA' | 'KULIAH';

export interface OccupantDetails {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  address: string;
  occupation: OccupantOccupation;
  status: ProfileStatus;
}

export interface OperatorDetails {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  address: string;
  status: ProfileStatus;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  occupantDetails?: OccupantDetails | null;
  operatorDetails?: OperatorDetails | null;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    return apiClient<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  getMe: async (): Promise<MeResponse> => {
    return apiClient<MeResponse>('/api/auth/me', {
      method: 'GET',
    });
  },
};
