export type ExpenseCategory =
  | "ASSET_REPAIR"
  | "LISTRIK"
  | "GAJI_PRT"
  | "OPS_DAPUR"
  | "BTN"
  | "INTERNET"
  | "LAIN_LAIN";

export type TransactionType = "INCOME" | "EXPENSE";

export type FinancialPaymentMethod = "TRANSFER" | "QRIS" | "E_WALLET" | "CASH";

export type FinancialRecord = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  expenseCategory?: ExpenseCategory;
  asset?: {
    id: string;
    name: string;
    status: "BROKEN" | "GOOD" | "MAINTENANCE";
    roomId: string;
    room: {
      name: string;
      status: "OCCUPIED" | "VACANT";
    };
  } | null;
  payment?: {
    id: string;
    paymentMethod: FinancialPaymentMethod;
    paymentDate: string;
    occupant: {
      id: string;
      email: string;
      occupantDetails?: {
        name: string;
      } | null;
    };
    invoicePayments: {
      amountApplied: number;
      invoice: {
        id: string;
        room: {
          name: string;
        };
      };
    }[];
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateExpensePayload = {
  amount: number;
  description: string;
  expenseCategory: ExpenseCategory;
  assetId?: string;
};

export type UpdateExpensePayload = {
  amount: number;
  description: string;
  expenseCategory: ExpenseCategory;
  assetId?: string;
};

export type GetFinancialRecordsResponse = {
  records: FinancialRecord[];
};

export type CreateExpenseResponse = {
  message: string;
  expense: FinancialRecord;
};

export type UpdateExpenseResponse = {
  message: string;
  expense: FinancialRecord;
};
