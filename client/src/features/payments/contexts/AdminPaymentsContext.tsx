"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PAYMENT_METHODS,
  type CreatePaymentForm,
  type InvoiceRecord,
  type RoomOption,
} from "@/features/payments/types/payments";
import { buildCycleText, toISODate } from "@/features/payments/utils/payments";
import {
  PaymentService,
  type PaginationMeta,
  type PaymentRelationRecord,
} from "@/features/payments/services/payment.service";

function createDefaultForm(): CreatePaymentForm {
  return {
    roomId: "",
    occupantId: "",
    startDate: toISODate(new Date()),
    paymentMode: "SEWA_REGULER",
    amount: "",
    method: PAYMENT_METHODS[0],
  };
}

type OccupantOption = {
  id: string;
  name: string;
  email: string;
};

type PaymentActionKind = "INSTALLMENT" | "SETTLE";
type PaymentSubmitMode = "DIRECT" | "INSTALLMENT";
type PaymentApiMethod = "TRANSFER" | "CASH" | "E_WALLET" | "QRIS";
type PaymentsListQuery = {
  page: number;
  status?: string;
  roomId?: string;
  search?: string;
  hasPayment?: boolean;
};

type AdminPaymentsContextValue = {
  rooms: RoomOption[];
  availableOccupants: OccupantOption[];
  payments: InvoiceRecord[];
  activePayments: InvoiceRecord[];
  completedPayments: InvoiceRecord[];
  isLoading: boolean;
  pagination: PaginationMeta;
  fetchPayments: (params?: { page?: number; status?: string; roomId?: string; search?: string; hasPayment?: boolean }) => Promise<void>;
  feedback: string | null;
  clearFeedback: () => void;
  isCreateModalOpen: boolean;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  paymentForm: CreatePaymentForm;
  updatePaymentForm: <Key extends keyof CreatePaymentForm>(
    field: Key,
    value: CreatePaymentForm[Key]
  ) => void;
  selectedRoom: RoomOption | null;
  cycleText: string;
  isDpForOccupiedRoom: boolean;
  isDpStartDateLoading: boolean;
  isPeriodRelationsLoading: boolean;
  isCreateModalDependenciesLoading: boolean;
  createModalLoadError: string | null;
  retryCreateModalDependencies: () => Promise<void>;
  periodRelations: PaymentRelationRecord[];
  selectedRoomPeriodRelation: PaymentRelationRecord | null;
  processingPaymentId: string | null;
  processingPaymentAction: PaymentActionKind | null;
  createPayment: () => Promise<void>;
  processPayment: (
    paymentId: string,
    amount: number,
    mode: PaymentSubmitMode,
    paymentMethod: PaymentApiMethod
  ) => Promise<boolean>;
  cancelInvoice: (invoiceId: string) => Promise<void>;
  markOccupantCheckout: (roomId: string) => Promise<boolean>;
};

const AdminPaymentsContext = createContext<AdminPaymentsContextValue | null>(null);

export function AdminPaymentsProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [occupants, setOccupants] = useState<OccupantOption[]>([]);
  const [payments, setPayments] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [periodRelations, setPeriodRelations] = useState<PaymentRelationRecord[]>([]);
  const [isPeriodRelationsLoading, setIsPeriodRelationsLoading] = useState(false);
  const [isDpStartDateLoading, setIsDpStartDateLoading] = useState(false);
  const periodRelationsRequestIdRef = useRef(0);
  const dpStartDateRequestIdRef = useRef(0);
  const lastPaymentsQueryRef = useRef<PaymentsListQuery>({ page: 1 });
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  const [processingPaymentAction, setProcessingPaymentAction] = useState<PaymentActionKind | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<CreatePaymentForm>(createDefaultForm);
  const [roomsLoadError, setRoomsLoadError] = useState<string | null>(null);
  const [occupantsLoadError, setOccupantsLoadError] = useState<string | null>(null);
  const [isCreateModalDependenciesLoading, setIsCreateModalDependenciesLoading] = useState(false);
  const prevPaymentModeRef = useRef<string>(paymentForm.paymentMode);
  const prevRoomIdRef = useRef<string>(paymentForm.roomId);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === paymentForm.roomId) ?? null,
    [paymentForm.roomId, rooms]
  );

  const cycleText = useMemo(
    () => buildCycleText(paymentForm.startDate),
    [paymentForm.startDate]
  );

  const activePayments = useMemo(
    () => payments.filter((payment) => payment.status !== "LUNAS" || payment.waitingForRoomVacant),
    [payments]
  );

  const completedPayments = useMemo(
    () => payments,
    [payments]
  );

  const periodRoomRelationMap = useMemo(() => {
    const map = new Map<string, PaymentRelationRecord>();
    for (const relation of periodRelations) {
      if (!map.has(relation.roomId)) {
        map.set(relation.roomId, relation);
      }
    }
    return map;
  }, [periodRelations]);

  const periodOccupantRelationMap = useMemo(() => {
    const map = new Map<string, PaymentRelationRecord>();
    for (const relation of periodRelations) {
      if (!relation.occupantId) {
        continue;
      }
      if (!map.has(relation.occupantId)) {
        map.set(relation.occupantId, relation);
      }
    }
    return map;
  }, [periodRelations]);

  const selectedRoomPeriodRelation = useMemo(() => {
    if (!paymentForm.roomId || isPeriodRelationsLoading) {
      return null;
    }
    return periodRoomRelationMap.get(paymentForm.roomId) ?? null;
  }, [paymentForm.roomId, periodRoomRelationMap, isPeriodRelationsLoading]);

  const selectedRoomAutofillOccupantId = useMemo(() => {
    if (!paymentForm.roomId) {
      return "";
    }

    if (paymentForm.paymentMode !== "DP" && selectedRoomPeriodRelation?.occupantId) {
      return selectedRoomPeriodRelation.occupantId;
    }

    return selectedRoom?.occupantId ?? "";
  }, [
    paymentForm.paymentMode,
    paymentForm.roomId,
    selectedRoom,
    selectedRoomPeriodRelation,
  ]);

  const occupiedOccupantIds = useMemo(() => {
    const ids = new Set<string>();
    rooms.forEach(room => {
      if (room.occupantId) {
        ids.add(room.occupantId);
      }
    });
    return ids;
  }, [rooms]);

  const availableOccupants = useMemo(() => {
    return occupants.filter((occupant) => {
      if (selectedRoomPeriodRelation?.occupantId === occupant.id) {
        return true;
      }

      // Selalu tampilkan penghuni yang saat ini menempati kamar yang dipilih
      // Validasi overlap akan ditangani oleh warning UI dan backend
      if (selectedRoom?.occupantId === occupant.id) {
        return true;
      }

      // Hide if they already have an invoice overlapping the chosen date
      if (periodOccupantRelationMap.has(occupant.id)) {
        return false;
      }

      // Hide if they are occupying a room and the chosen room is not their room
      if (occupiedOccupantIds.has(occupant.id)) {
        if (!paymentForm.roomId || selectedRoom?.occupantId !== occupant.id) {
          return false;
        }
      }

      return true;
    });
  }, [
    occupants,
    paymentForm.roomId,
    periodOccupantRelationMap,
    occupiedOccupantIds,
    selectedRoom,
    selectedRoomPeriodRelation,
  ]);

  const isDpForOccupiedRoom =
    paymentForm.paymentMode === "DP" && Boolean(selectedRoom?.hasActiveOccupant);

  const createModalLoadError = useMemo(() => {
    if (roomsLoadError && occupantsLoadError) {
      return "Failed to load room and occupant lists.";
    }

    if (roomsLoadError) {
      return roomsLoadError;
    }

    if (occupantsLoadError) {
      return occupantsLoadError;
    }

    return null;
  }, [occupantsLoadError, roomsLoadError]);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await PaymentService.getRooms();
      const mappedRooms: RoomOption[] = response.rooms.map((room) => ({
        id: room.id,
        label: room.name,
        monthlyBill: room.price,
        hasActiveOccupant: Boolean(room.activeOccupant),
        occupantName: room.activeOccupant
          ? room.activeOccupant.name || room.activeOccupant.email || null
          : null,
        occupantId: room.activeOccupant?.id || null,
      }));
      setRooms(mappedRooms);
      setRoomsLoadError(null);
    } catch (error) {
      console.error("Failed to fetch rooms", error);
      setRoomsLoadError("Failed to load room list.");
    }
  }, []);

  const fetchOccupants = useCallback(async () => {
    try {
      const data = await PaymentService.getOccupants();
      setOccupants(data);
      setOccupantsLoadError(null);
    } catch (error) {
      console.error("Failed to fetch occupants", error);
      setOccupantsLoadError("Failed to load occupant list.");
    }
  }, []);

  const retryCreateModalDependencies = useCallback(async () => {
    setIsCreateModalDependenciesLoading(true);
    setRoomsLoadError(null);
    setOccupantsLoadError(null);
    try {
      await Promise.all([fetchRooms(), fetchOccupants()]);
    } finally {
      setIsCreateModalDependenciesLoading(false);
    }
  }, [fetchOccupants, fetchRooms]);

  const fetchPayments = useCallback(
    async (params: { page?: number; status?: string; roomId?: string; search?: string; hasPayment?: boolean } = {}) => {
      setIsLoading(true);
      try {
        const has = (key: "page" | "status" | "roomId" | "search" | "hasPayment") =>
          Object.prototype.hasOwnProperty.call(params, key);

        const nextQuery: PaymentsListQuery = {
          page: has("page")
            ? (params.page ?? 1)
            : (lastPaymentsQueryRef.current.page || pagination.page || 1),
          status: has("status") ? params.status : lastPaymentsQueryRef.current.status,
          roomId: has("roomId") ? params.roomId : lastPaymentsQueryRef.current.roomId,
          search: has("search") ? params.search : lastPaymentsQueryRef.current.search,
          hasPayment: has("hasPayment") ? params.hasPayment : lastPaymentsQueryRef.current.hasPayment,
        };

        const { payments: fetchedPayments, meta } = await PaymentService.getPayments({
          page: nextQuery.page,
          limit: pagination.limit,
          status: nextQuery.status,
          roomId: nextQuery.roomId,
          search: nextQuery.search,
          hasPayment: nextQuery.hasPayment,
        });

        setPayments(fetchedPayments);
        setPagination(meta);
        lastPaymentsQueryRef.current = {
          ...nextQuery,
          page: meta.page,
        };
      } catch (error) {
        console.error("Failed to fetch payments", error);
        setFeedback("Failed to load payment data.");
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, pagination.page]
  );

  const fetchPeriodRelations = useCallback(async (periodDate: string) => {
    if (!periodDate) {
      setPeriodRelations([]);
      return;
    }

    const requestId = periodRelationsRequestIdRef.current + 1;
    periodRelationsRequestIdRef.current = requestId;

    setIsPeriodRelationsLoading(true);
    try {
      const relations = await PaymentService.getPaymentRelations(periodDate);
      if (periodRelationsRequestIdRef.current === requestId) {
        setPeriodRelations(relations);
      }
    } catch (error) {
      console.error("Failed to fetch payment relations", error);
      if (periodRelationsRequestIdRef.current === requestId) {
        setPeriodRelations([]);
      }
    } finally {
      if (periodRelationsRequestIdRef.current === requestId) {
        setIsPeriodRelationsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchRooms();
      void fetchOccupants();
      void fetchPayments({ page: 1 });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchRooms, fetchOccupants, fetchPayments]);

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchPeriodRelations(paymentForm.startDate);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchPeriodRelations, isCreateModalOpen, paymentForm.startDate]);

  useEffect(() => {
    if (!isCreateModalOpen || !paymentForm.roomId) {
      dpStartDateRequestIdRef.current += 1;
      const timeoutId = window.setTimeout(() => {
        setIsDpStartDateLoading(false);
      }, 0);
      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    const requestId = dpStartDateRequestIdRef.current + 1;
    dpStartDateRequestIdRef.current = requestId;
    const loadingTimeoutId = window.setTimeout(() => {
      setIsDpStartDateLoading(true);
    }, 0);

    const roomId = paymentForm.roomId;

    const syncDpStartDate = async () => {
      try {
        const latestPeriod = await PaymentService.getLatestRoomPeriod(roomId);
        let nextStartDate = toISODate(new Date());

        if (latestPeriod?.periodEndISO) {
          const endDate = new Date(latestPeriod.periodEndISO);
          endDate.setUTCDate(endDate.getUTCDate() + 1);
          nextStartDate = endDate.toISOString().split("T")[0];
        }

        if (dpStartDateRequestIdRef.current !== requestId) {
          return;
        }

        setPaymentForm((previous) => {
          if (previous.roomId !== roomId) {
            return previous;
          }

          const room = rooms.find((r) => r.id === roomId);
          const nextOccupantId = previous.occupantId || (room?.occupantId ?? "");

          if (previous.startDate === nextStartDate && previous.occupantId === nextOccupantId) {
            return previous;
          }

          return {
            ...previous,
            startDate: nextStartDate,
            occupantId: nextOccupantId,
          };
        });
      } catch (error) {
        console.error("Failed to resolve DP start date", error);
      } finally {
        if (dpStartDateRequestIdRef.current === requestId) {
          setIsDpStartDateLoading(false);
        }
      }
    };

    void syncDpStartDate();
    return () => {
      window.clearTimeout(loadingTimeoutId);
    };
  }, [isCreateModalOpen, paymentForm.roomId, rooms]);

  useEffect(() => {
    const roomChanged = prevRoomIdRef.current !== paymentForm.roomId;
    const modeChanged = prevPaymentModeRef.current !== paymentForm.paymentMode;

    if (
      !paymentForm.roomId ||
      paymentForm.paymentMode === "DP" ||
      !selectedRoomAutofillOccupantId
    ) {
      return;
    }

    const shouldForceRelationOccupant =
      Boolean(selectedRoomPeriodRelation?.occupantId) &&
      paymentForm.occupantId !== selectedRoomPeriodRelation?.occupantId;
    const shouldAutofillOccupant =
      roomChanged || modeChanged || !paymentForm.occupantId || shouldForceRelationOccupant;

    if (!shouldAutofillOccupant || paymentForm.occupantId === selectedRoomAutofillOccupantId) {
      return;
    }

    const nextRoomId = paymentForm.roomId;
    const nextOccupantId = selectedRoomAutofillOccupantId;

    const timeoutId = window.setTimeout(() => {
      setPaymentForm((previous) => {
        if (
          previous.roomId !== nextRoomId ||
          previous.paymentMode === "DP" ||
          previous.occupantId === nextOccupantId
        ) {
          return previous;
        }

        return {
          ...previous,
          occupantId: nextOccupantId,
        };
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    paymentForm.occupantId,
    paymentForm.paymentMode,
    paymentForm.roomId,
    selectedRoomAutofillOccupantId,
    selectedRoomPeriodRelation,
  ]);

  useEffect(() => {
    prevPaymentModeRef.current = paymentForm.paymentMode;
    prevRoomIdRef.current = paymentForm.roomId;
  }, [paymentForm.paymentMode, paymentForm.roomId]);

  useEffect(() => {
    if (!paymentForm.occupantId) {
      return;
    }

    // Jangan kosongkan penghuni jika dia adalah penghuni aktif dari kamar yang sedang dipilih.
    // Validasi overlap akan memunculkan warning alih-alih mereset form.
    if (selectedRoom?.occupantId === paymentForm.occupantId) {
      return;
    }

    if (periodOccupantRelationMap.has(paymentForm.occupantId)) {
      const timeoutId = window.setTimeout(() => {
        setPaymentForm((previous) => {
          if (!previous.occupantId) {
            return previous;
          }

          return {
            ...previous,
            occupantId: "",
          };
        });
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [paymentForm.occupantId, periodOccupantRelationMap, selectedRoom]);

  const clearFeedback = () => {
    setFeedback(null);
  };

  const openCreateModal = () => {
    setFeedback(null);
    setIsCreateModalOpen(true);
    void retryCreateModalDependencies();
  };

  const closeCreateModal = () => {
    periodRelationsRequestIdRef.current += 1;
    dpStartDateRequestIdRef.current += 1;
    setIsCreateModalOpen(false);
    setIsPeriodRelationsLoading(false);
    setIsDpStartDateLoading(false);
    setRoomsLoadError(null);
    setOccupantsLoadError(null);
    setPeriodRelations([]);
    setPaymentForm(createDefaultForm());
  };

  const updatePaymentForm = <Key extends keyof CreatePaymentForm>(
    field: Key,
    value: CreatePaymentForm[Key]
  ) => {
    setPaymentForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const createPayment = async () => {
    setFeedback(null);

    if (isPeriodRelationsLoading) {
      setFeedback("Period relations are being synchronized. Please try again in a few seconds.");
      return;
    }

    if (isDpStartDateLoading) {
      setFeedback("DP period is being adjusted. Please try again in a few seconds.");
      return;
    }

    if (!selectedRoom) {
      setFeedback("Please select a room first.");
      return;
    }

    if (!paymentForm.occupantId) {
      setFeedback("An occupant must be selected.");
      return;
    }

    const occupantRelation = periodOccupantRelationMap.get(paymentForm.occupantId);
    if (occupantRelation) {
      setFeedback(
        `The occupant is already related to ${occupantRelation.roomLabel} for that period.`
      );
      return;
    }

    if (selectedRoomPeriodRelation) {
      const isRoomVacant = !selectedRoom.hasActiveOccupant;
      const isDpForOccupied = paymentForm.paymentMode === "DP" && selectedRoom.hasActiveOccupant;

      if (!isRoomVacant && !isDpForOccupied) {
        if (selectedRoomPeriodRelation.occupantId === paymentForm.occupantId) {
          setFeedback("The occupant's bill for this room and period already exists.");
        } else {
          setFeedback(
            `The room is already related to ${selectedRoomPeriodRelation.occupantName} for that period.`
          );
        }
        return;
      }
    }

    const amount = Number(paymentForm.amount);
    if (paymentForm.paymentMode !== "SEWA_REGULER" && (Number.isNaN(amount) || amount <= 0)) {
      setFeedback("Initial payment amount is invalid.");
      return;
    }

    try {
      const payload = {
        roomId: selectedRoom.id,
        occupantId: paymentForm.occupantId,
        periodStart: paymentForm.startDate,
        paymentMode: paymentForm.paymentMode === "DP" ? "DP" : "SEWA_REGULER",
        initialPaidNominal: paymentForm.paymentMode === "SEWA_REGULER" ? 0 : amount,
        ...(paymentForm.paymentMode !== "SEWA_REGULER" && {
          paymentMethod:
            paymentForm.method === "Bank Transfer"
              ? "TRANSFER"
              : paymentForm.method === "Cash"
                ? "CASH"
                : "E_WALLET",
        }),
      };

      await PaymentService.createPayment(payload);

      setFeedback("New bill successfully created.");
      closeCreateModal();
      fetchPayments({ page: 1 });
      fetchRooms();
      fetchOccupants();
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        setFeedback(error.message || "Failed to create bill.");
        return;
      }

      setFeedback("Failed to create bill.");
    }
  };

  const processPayment = async (
    paymentId: string,
    amount: number,
    mode: PaymentSubmitMode,
    paymentMethod: PaymentApiMethod
  ): Promise<boolean> => {
    if (processingPaymentId) {
      setFeedback("Please wait for the ongoing payment process to finish.");
      return false;
    }

    const target = payments.find((payment) => payment.id === paymentId);
    if (!target) {
      setFeedback("Bill not found.");
      return false;
    }

    if (!target.occupantId) {
      setFeedback("This legacy bill has no occupant, so payment cannot be processed from the UI yet.");
      return false;
    }

    if (target.waitingForRoomVacant && mode === "DIRECT") {
      setFeedback("Cannot pay off this bill yet because the room is still occupied by the previous occupant. Use installment mode.");
      return false;
    }

    const remaining = Math.max(0, target.billAmount - target.paidAmount);
    if (remaining === 0) {
      setFeedback("This bill is already fully paid.");
      return false;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFeedback("Payment amount is invalid.");
      return false;
    }

    if (!paymentMethod) {
      setFeedback("Payment method must be selected.");
      return false;
    }

    if (amount > remaining) {
      setFeedback("Payment amount exceeds the remaining bill.");
      return false;
    }

    if (mode === "INSTALLMENT" && amount >= remaining) {
      setFeedback("For installments, the amount must be less than the remaining bill.");
      return false;
    }

    const willBePaidOff = amount >= remaining;
    const actionType: PaymentActionKind = willBePaidOff ? "SETTLE" : "INSTALLMENT";

    try {
      setProcessingPaymentId(paymentId);
      setProcessingPaymentAction(actionType);
      // Use the new transaction-based API - pay for a single invoice
      await PaymentService.recordPaymentTransaction({
        occupantId: target.occupantId,
        invoiceIds: [paymentId],
        totalAmount: amount,
        paymentMethod,
      });

      setFeedback(willBePaidOff ? "Bill successfully paid off." : "Installment successfully added.");
      await fetchPayments();
      if (willBePaidOff) {
        await fetchRooms();
      }
      return true;
    } catch (error: unknown) {
      if (error instanceof Error) {
        setFeedback(error.message || "Failed to record payment.");
      } else {
        setFeedback("Failed to record payment.");
      }
      return false;
    } finally {
      setProcessingPaymentId(null);
      setProcessingPaymentAction(null);
    }
  };

  const cancelInvoice = async (invoiceId: string) => {
    try {
      await PaymentService.cancelInvoice(invoiceId);
      setFeedback("Bill successfully canceled/deleted.");
      await fetchPayments();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setFeedback(error.message || "Failed to cancel bill.");
      } else {
        setFeedback("Failed to cancel bill.");
      }
    }
  };

  const markOccupantCheckout = async (roomId: string): Promise<boolean> => {
    try {
      await PaymentService.checkoutRoom(roomId);
      setFeedback("The previous occupant has checked out. DP occupants can now pay off the remaining bill.");
      await Promise.all([fetchPayments(), fetchRooms(), fetchOccupants()]);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error) {
        setFeedback(error.message || "Failed to process checkout.");
      } else {
        setFeedback("Failed to process checkout.");
      }
      return false;
    }
  };

  return (
    <AdminPaymentsContext.Provider
      value={{
        rooms,
        availableOccupants,
        payments,
        activePayments,
        completedPayments,
        isLoading,
        pagination,
        fetchPayments,
        feedback,
        clearFeedback,
        isCreateModalOpen,
        openCreateModal,
        closeCreateModal,
        paymentForm,
        updatePaymentForm,
        selectedRoom,
        cycleText,
        isDpForOccupiedRoom,
        isDpStartDateLoading,
        isPeriodRelationsLoading,
        isCreateModalDependenciesLoading,
        createModalLoadError,
        retryCreateModalDependencies,
        periodRelations,
        selectedRoomPeriodRelation,
        processingPaymentId,
        processingPaymentAction,
        createPayment,
        processPayment,
        cancelInvoice,
        markOccupantCheckout,
      }}
    >
      {children}
    </AdminPaymentsContext.Provider>
  );
}

export function useAdminPayments() {
  const context = useContext(AdminPaymentsContext);

  if (!context) {
    throw new Error("useAdminPayments must be used within AdminPaymentsProvider");
  }

  return context;
}
