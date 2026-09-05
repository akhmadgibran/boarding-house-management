export type UserRole = "ADMIN" | "OPERATOR" | "OCCUPANT";
export type ProfileStatus = "ACTIVE" | "DEACTIVE";
export type OccupantOccupation = "BEKERJA" | "KULIAH";

type BaseProfileDetails = {
    id: string;
    userId: string;
    name: string;
    phoneNumber: string;
    address: string;
    status: ProfileStatus;
    createdAt?: string;
    updatedAt?: string;
};

export type OperatorDetails = BaseProfileDetails;

export type OccupantDetails = BaseProfileDetails & {
    occupation: OccupantOccupation;
    moveInDate?: string | null;
    moveOutDate?: string | null;
};

export type AdminUser = {
    id: string;
    email: string;
    role: UserRole;
    createdAt?: string;
    updatedAt?: string;
    operatorDetails?: OperatorDetails | null;
    occupantDetails?: OccupantDetails | null;
};

export type GetAllUsersResponse = {
    users: AdminUser[];
};

export type CreateOperatorPayload = {
    email: string;
    password: string;
    name: string;
    phoneNumber: string;
    address: string;
};

export type CreateOccupantPayload = CreateOperatorPayload & {
    occupation: OccupantOccupation;
    moveInDate?: string | null;
    moveOutDate?: string | null;
};

export type CreateOperatorResponse = {
    message: string;
    user: AdminUser;
};

export type CreateOccupantResponse = {
    message: string;
    user: AdminUser;
};

export type UpdateUserBasePayload = {
    email?: string;
    password?: string;
    name?: string;
    phoneNumber?: string;
    address?: string;
    status?: ProfileStatus;
};

export type UpdateOperatorPayload = UpdateUserBasePayload;

export type UpdateOccupantPayload = UpdateUserBasePayload & {
    occupation?: OccupantOccupation;
    moveInDate?: string | null;
    moveOutDate?: string | null;
};

export type UpdateUserResponse = {
    message: string;
    user?: AdminUser;
};

export type DeleteUserResponse = {
    message: string;
};
