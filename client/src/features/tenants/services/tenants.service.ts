import { apiClient } from "@/lib/api/client";
import { usersService } from "@/features/users/services/users.service";
import type { AdminUser, OccupantDetails } from "@/features/users/types/users";
import type {
    TenantInvoicePaymentHistoryItem,
    TenantInvoiceHistoryItem,
    TenantLeaseStatus,
    TenantPaymentStatus,
    TenantRecord,
} from "@/features/tenants/types/tenants";

type BackendInvoiceStatus = "PAID" | "UNPAID" | "NOT_FULLY_PAID";

type BackendInvoicePayment = {
    id: string;
    amountApplied: number;
    payment?: {
        id: string;
        paymentDate: string;
        paymentMethod: string;
        amount: number;
        note?: string | null;
    } | null;
};

type BackendInvoice = {
    id: string;
    roomId: string;
    occupantId: string;
    priceApplied: number;
    paidNominal: number;
    periodStart: string;
    periodEnd: string;
    status: BackendInvoiceStatus;
    isDpReservation: boolean;
    waitingForRoomVacant: boolean;
    room?: {
        id: string;
        name: string;
        price: number;
    } | null;
    invoicePayments?: BackendInvoicePayment[];
};

type PaymentsApiResponse = {
    invoices: BackendInvoice[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
};

const LEASE_EXPIRING_THRESHOLD_DAYS = 7;

function toTimestamp(value?: string | null) {
    if (!value) {
        return Number.NaN;
    }

    return new Date(value).getTime();
}

function mapPaymentStatus(
    status?: BackendInvoiceStatus | null,
): TenantPaymentStatus {
    if (status === "PAID") {
        return "PAID";
    }

    if (status === "NOT_FULLY_PAID") {
        return "PARTIAL";
    }

    if (status === "UNPAID") {
        return "UNPAID";
    }

    return "NO_BILL";
}

function toPaymentHistory(
    invoice: BackendInvoice,
): TenantInvoicePaymentHistoryItem[] {
    return [...(invoice.invoicePayments ?? [])]
        .map((invoicePayment) => {
            const payment = invoicePayment.payment;
            return {
                id: payment?.id ?? invoicePayment.id,
                invoiceId: invoice.id,
                roomCode: invoice.room?.name ?? "-",
                periodStart: invoice.periodStart,
                periodEnd: invoice.periodEnd,
                paidDate: payment?.paymentDate ?? "",
                paidNominal:
                    payment?.amount ?? invoicePayment.amountApplied ?? 0,
                amountApplied:
                    invoicePayment.amountApplied ?? payment?.amount ?? 0,
                paymentMethod: payment?.paymentMethod ?? "-",
                note: payment?.note ?? null,
            };
        })
        .sort(
            (left, right) =>
                toTimestamp(right.paidDate) - toTimestamp(left.paidDate),
        );
}

function toHistoryItem(invoice: BackendInvoice): TenantInvoiceHistoryItem {
    return {
        id: invoice.id,
        roomId: invoice.room?.id ?? invoice.roomId ?? null,
        roomCode: invoice.room?.name ?? "-",
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        monthlyRent: invoice.priceApplied ?? 0,
        paidNominal: invoice.paidNominal ?? 0,
        outstandingAmount: Math.max(
            0,
            (invoice.priceApplied ?? 0) - (invoice.paidNominal ?? 0),
        ),
        paymentStatus: mapPaymentStatus(invoice.status),
        waitingForRoomVacant: Boolean(invoice.waitingForRoomVacant),
        isDpReservation: Boolean(invoice.isDpReservation),
        paymentHistory: toPaymentHistory(invoice),
    };
}

function getRelevantInvoice(invoices: BackendInvoice[], now: number) {
    if (invoices.length === 0) {
        return null;
    }

    const sorted = [...invoices].sort((left, right) => {
        const rightStart = toTimestamp(right.periodStart);
        const leftStart = toTimestamp(left.periodStart);
        return rightStart - leftStart;
    });

    const activeInvoices = sorted.filter((invoice) => {
        const start = toTimestamp(invoice.periodStart);
        const end = toTimestamp(invoice.periodEnd);
        return (
            !Number.isNaN(start) &&
            !Number.isNaN(end) &&
            start <= now &&
            end > now
        );
    });

    const activeNonWaiting = activeInvoices.find(
        (invoice) => !invoice.waitingForRoomVacant,
    );
    if (activeNonWaiting) {
        return activeNonWaiting;
    }

    const activeWaiting = activeInvoices.find(
        (invoice) => invoice.waitingForRoomVacant,
    );
    if (activeWaiting) {
        return activeWaiting;
    }

    const upcomingInvoices = [...sorted]
        .filter((invoice) => {
            const start = toTimestamp(invoice.periodStart);
            return !Number.isNaN(start) && start > now;
        })
        .sort(
            (left, right) =>
                toTimestamp(left.periodStart) - toTimestamp(right.periodStart),
        );

    if (upcomingInvoices.length > 0) {
        return upcomingInvoices[0];
    }

    return sorted[0];
}

function computeTotalBill(invoices: BackendInvoice[]): number {
    return invoices
        .filter(
            (inv) => inv.status === "UNPAID" || inv.status === "NOT_FULLY_PAID",
        )
        .reduce((sum, inv) => sum + (inv.priceApplied ?? 0), 0);
}

function computeTotalOutstanding(invoices: BackendInvoice[]): number {
    return invoices
        .filter(
            (inv) => inv.status === "UNPAID" || inv.status === "NOT_FULLY_PAID",
        )
        .reduce(
            (sum, inv) =>
                sum +
                Math.max(0, (inv.priceApplied ?? 0) - (inv.paidNominal ?? 0)),
            0,
        );
}

function computeOverallPaymentStatus(
    invoices: BackendInvoice[],
): TenantPaymentStatus {
    if (invoices.length === 0) return "NO_BILL";

    const hasUnpaid = invoices.some((inv) => inv.status === "UNPAID");
    const hasPartial = invoices.some((inv) => inv.status === "NOT_FULLY_PAID");

    if (hasUnpaid) return "UNPAID";
    if (hasPartial) return "PARTIAL";
    return "PAID";
}

function computeOverallLeaseStatus(
    invoices: BackendInvoice[],
    relevantInvoice: BackendInvoice | null,
    now: number,
): TenantLeaseStatus {
    if (!relevantInvoice || invoices.length === 0) {
        return "NO_LEASE";
    }

    if (relevantInvoice.waitingForRoomVacant) {
        return "WAITING_CHECKOUT";
    }

    const start = toTimestamp(relevantInvoice.periodStart);
    const end = toTimestamp(relevantInvoice.periodEnd);

    if (Number.isNaN(start) || Number.isNaN(end)) {
        return "NO_LEASE";
    }

    if (start > now) {
        return "UPCOMING";
    }

    if (end <= now) {
        return "COMPLETED";
    }

    const remainingDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return remainingDays <= LEASE_EXPIRING_THRESHOLD_DAYS
        ? "EXPIRING"
        : "ACTIVE";
}

function buildTenantRecord(
    user: AdminUser,
    invoices: BackendInvoice[],
    now: number,
): TenantRecord | null {
    const details = user.occupantDetails as OccupantDetails | null | undefined;
    if (!details) {
        return null;
    }

    const relevantInvoice = getRelevantInvoice(invoices, now);
    const moveInDate = details.moveInDate ?? null;
    const moveOutDate = details.moveOutDate ?? null;
    const invoiceHistory = [...invoices]
        .sort(
            (left, right) =>
                toTimestamp(right.periodStart) - toTimestamp(left.periodStart),
        )
        .map(toHistoryItem);

    return {
        id: user.id,
        email: user.email,
        name: details.name,
        phoneNumber: details.phoneNumber,
        address: details.address,
        occupation: details.occupation,
        profileStatus: details.status,
        roomId: relevantInvoice?.room?.id ?? relevantInvoice?.roomId ?? null,
        roomCode: relevantInvoice?.room?.name ?? "-",
        occupationStatus: details.occupation,
        leaseStatus: computeOverallLeaseStatus(invoices, relevantInvoice, now),
        paymentStatus: computeOverallPaymentStatus(invoices),
        moveInDate,
        moveOutDate,
        totalBill: computeTotalBill(invoices),
        outstandingAmount: computeTotalOutstanding(invoices),
        invoiceId: relevantInvoice?.id ?? null,
        isDpReservation: Boolean(relevantInvoice?.isDpReservation),
        waitingForRoomVacant: Boolean(relevantInvoice?.waitingForRoomVacant),
        createdAt: user.createdAt,
        updatedAt: details.updatedAt ?? user.updatedAt,
        invoiceHistory,
    };
}

async function getAllInvoices(): Promise<BackendInvoice[]> {
    const limit = 100;
    const firstResponse = await apiClient<PaymentsApiResponse>(
        `/api/admin/payments?page=1&limit=${limit}`,
    );
    const invoices = [...firstResponse.invoices];
    const totalPages = firstResponse.meta?.totalPages ?? 1;

    for (let page = 2; page <= totalPages; page += 1) {
        const response = await apiClient<PaymentsApiResponse>(
            `/api/admin/payments?page=${page}&limit=${limit}`,
        );
        invoices.push(...response.invoices);
    }

    return invoices;
}

export const tenantsService = {
    async getAll(): Promise<{ tenants: TenantRecord[] }> {
        const [usersResponse, invoices] = await Promise.all([
            usersService.getAllUsers(),
            getAllInvoices(),
        ]);

        const invoicesByOccupant = new Map<string, BackendInvoice[]>();
        for (const invoice of invoices) {
            const current = invoicesByOccupant.get(invoice.occupantId) ?? [];
            current.push(invoice);
            invoicesByOccupant.set(invoice.occupantId, current);
        }

        const now = Date.now();

        const tenants = usersResponse.users
            .filter((user) => user.role === "OCCUPANT" && user.occupantDetails)
            .map((user) =>
                buildTenantRecord(
                    user,
                    invoicesByOccupant.get(user.id) ?? [],
                    now,
                ),
            )
            .filter((tenant): tenant is TenantRecord => tenant !== null)
            .sort((left, right) => left.name.localeCompare(right.name, "id"));

        return { tenants };
    },
};
