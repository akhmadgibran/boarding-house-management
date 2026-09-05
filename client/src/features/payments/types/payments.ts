export const PAYMENT_METHODS = ["Bank Transfer", "Cash", "E-Wallet"] as const;

export type PaymentStatus = "LUNAS" | "NUNGGAK" | "BELUM_BAYAR";
export type PaymentMode = "SEWA_REGULER" | "CICILAN" | "DP";
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type RoomOption = {
  id: string;
  label: string;
  monthlyBill: number;
  hasActiveOccupant: boolean;
  occupantName: string | null;
  occupantId: string | null;
};

// Represents an invoice/billing obligation
export type InvoiceRecord = {
  id: string;
  roomId: string;
  roomLabel: string;
  tenantName: string;
  periodLabel: string;
  billAmount: number;
  paidAmount: number;
  occupantId?: string; // Added for payment transactions
  status: PaymentStatus;
  installmentCount: number;
  isDpReservation: boolean;
  waitingForRoomVacant: boolean;
  priorOccupantName: string | null;
  startDateISO: string;
  // Optional payment history for detailed view
  paymentHistory?: InvoicePaymentHistory[];
};

// Represents a payment transaction (actual money transfer)
export type InvoicePaymentHistory = {
  id: string;
  invoiceId: string;
  paidDate: string;
  paidNominal: number;
  paymentMethod: PaymentMethod;
  note: string | null;
};

export type CreatePaymentForm = {
  roomId: string;
  occupantId: string;
  startDate: string;
  paymentMode: PaymentMode;
  amount: string;
  method: PaymentMethod;
};

// Represents a summary of an invoice that a transaction pays for
export type TransactionInvoiceInfo = {
  invoiceId: string;
  roomLabel: string;
  periodStart: string;
  periodEnd: string;
};

// Represents a top-level payment transaction from the backend
export type PaymentTransactionRecord = {
  id: string;
  occupantId: string;
  tenantName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  note: string | null;
  invoices: TransactionInvoiceInfo[];
};
