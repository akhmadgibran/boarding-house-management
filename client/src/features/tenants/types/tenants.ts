import type {
    OccupantOccupation,
    ProfileStatus,
} from "@/features/users/types/users";

export type TenantLeaseStatus =
    | "ACTIVE"
    | "EXPIRING"
    | "COMPLETED"
    | "WAITING_CHECKOUT"
    | "UPCOMING"
    | "NO_LEASE";

export type TenantPaymentStatus = "PAID" | "PARTIAL" | "UNPAID" | "NO_BILL";

export type TenantInvoicePaymentHistoryItem = {
    id: string;
    invoiceId: string;
    roomCode: string;
    periodStart: string;
    periodEnd: string;
    paidDate: string;
    paidNominal: number;
    amountApplied: number;
    paymentMethod: string;
    note?: string | null;
};

export type TenantPaymentTransactionInvoiceItem = {
    invoiceId: string;
    roomCode: string;
    periodStart: string;
    periodEnd: string;
    amountApplied: number;
};

export type TenantPaymentTransactionHistoryItem = {
    id: string;
    tenantName: string;
    paidDate: string;
    paidNominal: number;
    paymentMethod: string;
    note?: string | null;
    invoices: TenantPaymentTransactionInvoiceItem[];
};

export type TenantInvoiceHistoryItem = {
    id: string;
    roomId: string | null;
    roomCode: string;
    periodStart: string;
    periodEnd: string;
    monthlyRent: number;
    paidNominal: number;
    outstandingAmount: number;
    paymentStatus: TenantPaymentStatus;
    waitingForRoomVacant: boolean;
    isDpReservation: boolean;
    paymentHistory: TenantInvoicePaymentHistoryItem[];
};

export type TenantRecord = {
    id: string;
    email: string;
    name: string;
    phoneNumber: string;
    address: string;
    occupation: OccupantOccupation;
    profileStatus: ProfileStatus;
    roomId: string | null;
    roomCode: string;
    occupationStatus: OccupantOccupation;
    leaseStatus: TenantLeaseStatus;
    paymentStatus: TenantPaymentStatus;
    moveInDate: string | null;
    moveOutDate: string | null;
    totalBill: number;
    outstandingAmount: number;
    invoiceId: string | null;
    isDpReservation: boolean;
    waitingForRoomVacant: boolean;
    createdAt?: string;
    updatedAt?: string;
    invoiceHistory: TenantInvoiceHistoryItem[];
};
