import { apiClient } from "@/lib/api/client";
import {
  PaymentStatus,
  type InvoiceRecord,
  type PaymentMethod,
  type PaymentTransactionRecord,
} from "@/features/payments/types/payments";

type RawRoom = {
  id?: string;
  name?: string;
  price?: number;
};

type AdminRoomRecord = {
  id: string;
  name: string;
  price: number;
  activeOccupant?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
};

type RawOccupantDetails = {
  name?: string;
  status?: string;
};

type RawUser = {
  id?: string;
  email?: string;
  role?: string;
  occupantDetails?: RawOccupantDetails | null;
  invoices?: unknown[];
};

type RawPayment = {
  id?: string;
  paymentDate?: string | Date;
  paymentMethod?: string;
  amount?: number;
  note?: string | null;
};

type RawInvoicePayment = {
  id?: string;
  invoiceId?: string;
  amountApplied?: number;
  payment?: RawPayment | null;
  invoice?: {
    id?: string;
    periodStart?: string | Date;
    periodEnd?: string | Date;
    room?: RawRoom | null;
  } | null;
};

type RawInvoice = {
  id?: string;
  roomId?: string;
  occupantId?: string | null;
  priceApplied?: number;
  paidNominal?: number;
  periodStart?: string | Date;
  periodEnd?: string | Date;
  note?: string | null;
  status?: string;
  isDpReservation?: boolean;
  waitingForRoomVacant?: boolean;
  priorOccupantId?: string | null;
  room?: RawRoom | null;
  occupant?: RawUser | null;
  priorOccupant?: RawUser | null;
  invoicePayments?: RawInvoicePayment[];
};

type RawPaymentTransaction = {
  id?: string;
  occupantId?: string;
  amount?: number;
  paymentDate?: string | Date;
  paymentMethod?: string;
  note?: string | null;
  occupant?: RawUser | null;
  invoicePayments?: RawInvoicePayment[];
};

function toDateString(value: string | Date | undefined): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.split("T")[0];
  }

  return value.toISOString().split("T")[0];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetPaymentsResponse {
  invoices: RawInvoice[]; // Raw backend response type - now returns invoices instead of payments
  transactions?: RawPaymentTransaction[]; // For payment transactions endpoint
  meta: PaginationMeta;
}

export interface FetchTransactionsParams {
  page?: number;
  limit?: number;
  search?: string;
  year?: string;
  roomId?: string;
  occupantId?: string;
}

export interface FetchPaymentsParams {
  page?: number;
  limit?: number;
  status?: string;
  roomId?: string;
  occupantId?: string;
  search?: string;
  periodDate?: string;
  hasPayment?: boolean;
}

export interface PaymentRelationRecord {
  paymentId: string;
  roomId: string;
  roomLabel: string;
  occupantId: string | null;
  occupantName: string;
  periodStartISO: string;
  periodEndISO: string;
  isDpReservation: boolean;
  waitingForRoomVacant: boolean;
}

export interface LatestRoomPeriodRecord {
  periodStartISO: string;
  periodEndISO: string;
}

/**
 * Maps raw backend invoice response to frontend InvoiceRecord
 */
export function mapBackendToInvoiceRecord(raw: RawInvoice): InvoiceRecord {
  // Convert API response format to the frontend InvoiceRecord format
  const roomLabel = raw.room?.name || "Unknown Room";
  const tenantName = raw.occupant?.occupantDetails?.name || raw.occupant?.email || "Belum dipetakan";
  const priorOccupantName =
    raw.priorOccupant?.occupantDetails?.name ||
    raw.priorOccupant?.email ||
    (raw.priorOccupantId ? "Penghuni Lama" : null);
  
  const start = new Date(raw.periodStart || "");
  const end = new Date(raw.periodEnd || "");
  const dateFmtOptions: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" };
  const periodLabel = `${start.toLocaleDateString("id-ID", dateFmtOptions)} - ${end.toLocaleDateString("id-ID", dateFmtOptions)}`;

  const statusMap: Record<string, PaymentStatus> = {
    PAID: "LUNAS",
    UNPAID: "BELUM_BAYAR",
    NOT_FULLY_PAID: "NUNGGAK",
  };

  const methodMap: Record<string, PaymentMethod> = {
    TRANSFER: "Bank Transfer",
    CASH: "Cash",
    E_WALLET: "E-Wallet",
    QRIS: "E-Wallet", // Map QRIS to E-Wallet for now or keep it if frontend supports it
  };

  // Map invoicePayments from backend to frontend InvoicePaymentHistory
  const paymentHistory = Array.isArray(raw.invoicePayments)
    ? raw.invoicePayments
        .map((ip) => {
          const paymentMethodKey = ip.payment?.paymentMethod || "";
          return {
            id: ip.id || "",
            invoiceId: raw.id || "",
            paidDate: toDateString(ip.payment?.paymentDate),
            paidNominal: ip.amountApplied || 0,
            paymentMethod: methodMap[paymentMethodKey] || "Cash",
            note: ip.payment?.note || null,
          };
        })
        .sort((a, b) => {
          // Sort by paidDate descending
          if (!a.paidDate) return 1;
          if (!b.paidDate) return -1;
          return new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime();
        })
    : [];

  return {
    id: raw.id || "",
    roomId: raw.roomId || "",
    roomLabel,
    tenantName,
    periodLabel,
    billAmount: raw.priceApplied || 0,
    paidAmount: raw.paidNominal || 0,
    occupantId: raw.occupantId ?? undefined, // Added for payment transactions
    status: statusMap[raw.status || ""] || "BELUM_BAYAR",
    installmentCount: (raw.paidNominal || 0) > 0 && raw.status !== "PAID" ? 1 : 0, // Approximation
    isDpReservation: Boolean(raw.isDpReservation),
    waitingForRoomVacant: Boolean(raw.waitingForRoomVacant),
    priorOccupantName,
    startDateISO:
      typeof raw.periodStart === "string"
        ? raw.periodStart.split("T")[0]
        : new Date(raw.periodStart || "").toISOString().split("T")[0],
    paymentHistory,
  };
}

function mapBackendToPaymentRelation(raw: RawInvoice): PaymentRelationRecord {
  return {
    paymentId: raw.id || "",
    roomId: raw.roomId || "",
    roomLabel: raw.room?.name || "Unknown Room",
    occupantId: raw.occupantId || null,
    occupantName:
      raw.occupant?.occupantDetails?.name || raw.occupant?.email || "Belum dipetakan",
    periodStartISO: toDateString(raw.periodStart),
    periodEndISO: toDateString(raw.periodEnd),
    isDpReservation: Boolean(raw.isDpReservation),
    waitingForRoomVacant: Boolean(raw.waitingForRoomVacant),
  };
}

/**
 * Maps raw backend payment transaction response to frontend PaymentTransactionRecord
 */
export function mapBackendToPaymentTransaction(raw: RawPaymentTransaction): PaymentTransactionRecord {
  const methodMap: Record<string, PaymentMethod> = {
    TRANSFER: "Bank Transfer",
    CASH: "Cash",
    E_WALLET: "E-Wallet",
    QRIS: "E-Wallet",
  };

  const paymentMethodKey = raw.paymentMethod || "";

  const invoices = Array.isArray(raw.invoicePayments)
    ? raw.invoicePayments.map((ip) => ({
        invoiceId: ip.invoice?.id || "unknown",
        roomLabel: ip.invoice?.room?.name || "Unknown Room",
        periodStart: toDateString(ip.invoice?.periodStart),
        periodEnd: toDateString(ip.invoice?.periodEnd),
      }))
    : [];

  return {
    id: raw.id || "",
    occupantId: raw.occupantId || "",
    tenantName: raw.occupant?.occupantDetails?.name || raw.occupant?.email || "Belum dipetakan",
    amount: raw.amount || 0,
    paymentDate: toDateString(raw.paymentDate),
    paymentMethod: methodMap[paymentMethodKey] || "Cash",
    note: raw.note || null,
    invoices,
  };
}

export const PaymentService = {
  /**
   * Get paginated list of payments
   */
  async getPayments(params: FetchPaymentsParams = {}): Promise<{ payments: InvoiceRecord[], meta: PaginationMeta }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.status && params.status !== "ALL") searchParams.append("status", params.status);
    if (params.roomId && params.roomId !== "ALL") searchParams.append("roomId", params.roomId);
    if (params.occupantId) searchParams.append("occupantId", params.occupantId);
    if (params.search) searchParams.append("search", params.search);
    if (params.periodDate) searchParams.append("periodDate", params.periodDate);
    if (params.hasPayment !== undefined) searchParams.append("hasPayment", String(params.hasPayment));

    const queryString = searchParams.toString();
    const endpoint = `/api/admin/payments${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient<GetPaymentsResponse>(endpoint);
    
    return {
      payments: response.invoices.map(mapBackendToInvoiceRecord),
      meta: response.meta || { total: response.invoices?.length || 0, page: 1, limit: 100, totalPages: 1 },
    };
  },

  /**
   * Get paginated list of payment transactions
   */
  async getPaymentTransactions(params: FetchTransactionsParams = {}): Promise<{ transactions: PaymentTransactionRecord[], meta: PaginationMeta }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.search) searchParams.append("search", params.search);
    if (params.year && params.year !== "ALL") searchParams.append("year", params.year);
    if (params.roomId) searchParams.append("roomId", params.roomId);
    if (params.occupantId) searchParams.append("occupantId", params.occupantId);

    const queryString = searchParams.toString();
    const endpoint = `/api/admin/payments/transactions${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient<GetPaymentsResponse>(endpoint);
    
    return {
      transactions: (response.transactions || []).map(mapBackendToPaymentTransaction),
      meta: response.meta || { total: response.transactions?.length || 0, page: 1, limit: 100, totalPages: 1 },
    };
  },

  /**
   * Get paginated list of payments for the logged-in occupant
   */
  async getMyPayments(params: FetchPaymentsParams = {}): Promise<{ payments: InvoiceRecord[], meta: PaginationMeta }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.status && params.status !== "ALL") searchParams.append("status", params.status);
    if (params.search) searchParams.append("search", params.search);
    if (params.periodDate) searchParams.append("periodDate", params.periodDate);
    if (params.hasPayment !== undefined) searchParams.append("hasPayment", String(params.hasPayment));

    const queryString = searchParams.toString();
    const endpoint = `/api/occupant/payments${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient<GetPaymentsResponse>(endpoint);

    return {
      payments: response.invoices.map(mapBackendToInvoiceRecord),
      meta: response.meta || { total: response.invoices?.length || 0, page: 1, limit: 100, totalPages: 1 },
    };
  },

  /**
   * Get paginated list of payment transactions for the logged-in occupant
   */
  async getMyPaymentTransactions(params: FetchTransactionsParams = {}): Promise<{ transactions: PaymentTransactionRecord[], meta: PaginationMeta }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.search) searchParams.append("search", params.search);
    if (params.year && params.year !== "ALL") searchParams.append("year", params.year);

    const queryString = searchParams.toString();
    const endpoint = `/api/occupant/payments/transactions${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient<GetPaymentsResponse>(endpoint);

    return {
      transactions: (response.transactions || []).map(mapBackendToPaymentTransaction),
      meta: response.meta || { total: response.transactions?.length || 0, page: 1, limit: 100, totalPages: 1 },
    };
  },

  /**
   * Get all payment relations (room-occupant) for a specific date/period point
   */
  async getPaymentRelations(periodDate: string): Promise<PaymentRelationRecord[]> {
    if (!periodDate) {
      return [];
    }

    const pageSize = 100;
    let currentPage = 1;
    let totalPages = 1;
    const relations: PaymentRelationRecord[] = [];

    do {
      const query = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        periodDate,
      });

      const response = await apiClient<GetPaymentsResponse>(`/api/admin/payments?${query.toString()}`);
      relations.push(...response.invoices.map(mapBackendToPaymentRelation));
      totalPages = response.meta?.totalPages ?? 1;
      currentPage += 1;
    } while (currentPage <= totalPages);

    return relations;
  },

  /**
   * Get latest room period to determine next start date.
   */
  async getLatestRoomPeriod(roomId: string): Promise<LatestRoomPeriodRecord | null> {
    if (!roomId) {
      return null;
    }

    const query = new URLSearchParams({
      page: "1",
      limit: "1",
      roomId,
    });

    const response = await apiClient<GetPaymentsResponse>(`/api/admin/payments?${query.toString()}`);
    const latestPayment = response.invoices[0];
    if (!latestPayment?.periodStart || !latestPayment?.periodEnd) {
      return null;
    }

    const pStart = typeof latestPayment.periodStart === "string" ? latestPayment.periodStart : new Date(latestPayment.periodStart).toISOString();
    const pEnd = typeof latestPayment.periodEnd === "string" ? latestPayment.periodEnd : new Date(latestPayment.periodEnd).toISOString();

    return {
      periodStartISO: pStart.split("T")[0],
      periodEndISO: pEnd.split("T")[0],
    };
  },

  /**
   * Create manual payment (Reguler or DP)
   */
  async createPayment(data: {
    roomId: string;
    occupantId: string;
    periodStart: string;
    paymentMode: string;
    initialPaidNominal: number;
    paymentMethod?: string;
  }) {
    return apiClient(`/api/admin/payments`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Record a payment transaction (replaces the old pay endpoint)
   * Now supports paying multiple invoices at once
   */
  async recordPaymentTransaction(data: {
    occupantId: string;
    invoiceIds: string[];
    totalAmount: number;
    paymentMethod: string;
    note?: string;
  }) {
    return apiClient(`/api/admin/payments/transaction`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },


  /**
   * Process payment for a single invoice (helper function)
   */
  async processSingleInvoicePayment(
    invoiceId: string,
    amount: number,
    paymentMethod: string
  ) {
    // First, get the invoice to extract the occupantId
    const response = await apiClient<GetPaymentsResponse>(`/api/admin/payments`);
    const invoice = response.invoices.find((inv) => inv.id === invoiceId);
    
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const occupantId = invoice.occupantId || "";

    return apiClient(`/api/admin/payments/transaction`, {
      method: "POST",
      body: JSON.stringify({
        occupantId,
        invoiceIds: [invoiceId],
        totalAmount: amount,
        paymentMethod,
      }),
    });
  },

  /**
   * Cancel/delete an unpaid invoice
   */
  async cancelInvoice(invoiceId: string) {
    return apiClient(`/api/admin/payments/${invoiceId}`, {
      method: "DELETE",
    });
  },


  /**
   * Mark room as checked out (Penghuni lama keluar)
   */
  async checkoutRoom(roomId: string) {
    return apiClient(`/api/admin/rooms/${roomId}/checkout`, {
      method: "PATCH",
    });
  },
  
  /**
   * Fetch rooms to populate select options
   */
  async getRooms() {
    return apiClient<{ rooms: AdminRoomRecord[] }>(`/api/admin/rooms`);
  },

  /**
   * Fetch all users and return only active occupants
   */
  async getOccupants() {
    const response = await apiClient<{ users: RawUser[] }>(`/api/admin/users`);
    return response.users
      .filter((user) => user.role === "OCCUPANT" && user.occupantDetails?.status === "ACTIVE")
      .map((user) => ({
        id: user.id || "",
        name: user.occupantDetails?.name || "Penghuni",
        email: user.email || "",
        hasPendingDp: Array.isArray(user.invoices) && user.invoices.length > 0,
      }));
  }
};
