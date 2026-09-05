"use client";

import {
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { CrudModal } from "@/components/ui/CrudModal";
import { PaymentService } from "@/features/payments/services/payment.service";
import { tenantsService } from "@/features/tenants/services/tenants.service";
import type {
    TenantPaymentTransactionHistoryItem,
    TenantLeaseStatus,
    TenantPaymentStatus,
    TenantRecord,
} from "@/features/tenants/types/tenants";
import { usersService } from "@/features/users/services/users.service";
import type {
    OccupantOccupation,
    ProfileStatus,
} from "@/features/users/types/users";
import { ApiError } from "@/lib/api/client";

type LeaseFilter = "ALL" | TenantLeaseStatus;
type PaymentFilter = "ALL" | TenantPaymentStatus;
type AccountStatusFilter = "ALL" | ProfileStatus;

type CreateTenantForm = {
    email: string;
    password: string;
    name: string;
    phoneNumber: string;
    address: string;
    occupation: OccupantOccupation;
    moveInDate: string;
    moveOutDate: string;
};

type EditTenantForm = {
    email: string;
    password: string;
    name: string;
    phoneNumber: string;
    address: string;
    occupation: OccupantOccupation;
    status: ProfileStatus;
    moveInDate: string;
    moveOutDate: string;
};

const defaultCreateForm: CreateTenantForm = {
    email: "",
    password: "",
    name: "",
    phoneNumber: "",
    address: "",
    occupation: "BEKERJA",
    moveInDate: "",
    moveOutDate: "",
};

const defaultEditForm: EditTenantForm = {
    email: "",
    password: "",
    name: "",
    phoneNumber: "",
    address: "",
    occupation: "BEKERJA",
    status: "ACTIVE",
    moveInDate: "",
    moveOutDate: "",
};

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
});

function getErrorMessage(error: unknown) {
    if (error instanceof ApiError) {
        return error.message;
    }

    return "Terjadi kesalahan saat memproses data penghuni.";
}

function formatDate(value?: string | null) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

function occupationLabel(occupation: OccupantOccupation) {
    if (occupation === "KULIAH") {
        return "Kuliah";
    }

    return "Bekerja";
}

function profileStatusLabel(status: ProfileStatus) {
    if (status === "DEACTIVE") {
        return "Nonaktif";
    }

    return "Active";
}

function profileStatusBadgeClass(status: ProfileStatus) {
    if (status === "DEACTIVE") {
        return "bg-gray-100 text-gray-700";
    }

    return "bg-emerald-100 text-emerald-800";
}

function leaseStatusLabel(status: TenantLeaseStatus) {
    if (status === "EXPIRING") {
        return "Akan Berakhir";
    }

    if (status === "COMPLETED") {
        return "Done";
    }

    if (status === "WAITING_CHECKOUT") {
        return "Menunggu Checkout";
    }

    if (status === "UPCOMING") {
        return "Akan Mulai";
    }

    if (status === "NO_LEASE") {
        return "Belum Ada Sewa";
    }

    return "Active";
}

function paymentStatusLabel(status: TenantPaymentStatus) {
    if (status === "PARTIAL") {
        return "Cicilan";
    }

    if (status === "UNPAID") {
        return "Belum Bayar";
    }

    if (status === "NO_BILL") {
        return "Belum Ada Tagihan";
    }

    return "Lunas";
}

function leaseBadgeClass(status: TenantLeaseStatus) {
    if (status === "ACTIVE") {
        return "bg-emerald-100 text-emerald-800";
    }

    if (status === "EXPIRING" || status === "WAITING_CHECKOUT") {
        return "bg-amber-100 text-amber-800";
    }

    if (status === "UPCOMING") {
        return "bg-blue-100 text-blue-800";
    }

    return "bg-gray-100 text-gray-700";
}

function paymentBadgeClass(status: TenantPaymentStatus) {
    if (status === "PAID") {
        return "bg-emerald-100 text-emerald-800";
    }

    if (status === "PARTIAL") {
        return "bg-amber-100 text-amber-800";
    }

    if (status === "UNPAID") {
        return "bg-rose-100 text-rose-800";
    }

    return "bg-gray-100 text-gray-700";
}

function occupationBadgeClass(status: OccupantOccupation) {
    if (status === "KULIAH") {
        return "bg-indigo-100 text-indigo-800";
    }

    return "bg-blue-100 text-blue-800";
}

function paymentMethodLabel(method?: string | null) {
    const normalized = method?.toUpperCase() ?? "";

    if (normalized.includes("TRANSFER")) {
        return "Bank Transfer";
    }

    if (normalized.includes("QRIS")) {
        return "QRIS";
    }

    if (
        normalized.includes("E_WALLET") ||
        normalized.includes("E-WALLET") ||
        normalized.includes("EWALLET")
    ) {
        return "E-Wallet";
    }

    if (normalized.includes("CASH")) {
        return "Cash";
    }

    return method || "-";
}

function paymentMethodBadgeClass(method?: string | null) {
    const normalized = method?.toUpperCase() ?? "";

    if (normalized.includes("TRANSFER")) {
        return "bg-blue-100 text-blue-800";
    }

    if (normalized.includes("QRIS")) {
        return "bg-emerald-100 text-emerald-800";
    }

    if (
        normalized.includes("E_WALLET") ||
        normalized.includes("E-WALLET") ||
        normalized.includes("EWALLET")
    ) {
        return "bg-indigo-100 text-indigo-800";
    }

    if (normalized.includes("CASH")) {
        return "bg-amber-100 text-amber-800";
    }

    return "bg-gray-100 text-gray-700";
}

function toTimeValue(value?: string | null) {
    if (!value) {
        return Number.NaN;
    }

    return new Date(value).getTime();
}

function buildSearchIndex(tenant: TenantRecord) {
    return [tenant.name, tenant.email, tenant.phoneNumber, tenant.roomCode]
        .join(" ")
        .toLowerCase();
}

function compareTenantRoomCode(left: TenantRecord, right: TenantRecord) {
    return left.roomCode.localeCompare(right.roomCode, "id-ID", {
        numeric: true,
        sensitivity: "base",
    });
}

function transactionPeriodLabels(
    transaction: TenantPaymentTransactionHistoryItem,
): string[] {
    if (transaction.invoices.length === 0) {
        return [];
    }

    const sortedInvoices = [...transaction.invoices].sort(
        (left, right) =>
            toTimeValue(left.periodStart) - toTimeValue(right.periodStart),
    );

    return sortedInvoices.map(
        (invoice) =>
            `${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`,
    );
}

function buildEditForm(tenant: TenantRecord): EditTenantForm {
    return {
        email: tenant.email,
        password: "",
        name: tenant.name,
        phoneNumber: tenant.phoneNumber,
        address: tenant.address,
        occupation: tenant.occupation,
        status: tenant.profileStatus,
        moveInDate: tenant.moveInDate ?? "",
        moveOutDate: tenant.moveOutDate ?? "",
    };
}

export default function AdminTenantsPage() {
    const [tenants, setTenants] = useState<TenantRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fetchError, setFetchError] = useState("");
    const [feedbackMessage, setFeedbackMessage] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [leaseFilter, setLeaseFilter] = useState<LeaseFilter>("ALL");
    const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
    const [accountStatusFilter, setAccountStatusFilter] =
        useState<AccountStatusFilter>("ACTIVE");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [detailTenantId, setDetailTenantId] = useState<string | null>(null);
    const [editTenantId, setEditTenantId] = useState<string | null>(null);
    const [createForm, setCreateForm] =
        useState<CreateTenantForm>(defaultCreateForm);
    const [editForm, setEditForm] = useState<EditTenantForm>(defaultEditForm);
    const [createError, setCreateError] = useState("");
    const [editError, setEditError] = useState("");
    const [paymentTransactions, setPaymentTransactions] = useState<
        TenantPaymentTransactionHistoryItem[]
    >([]);
    const [isPaymentTransactionsLoading, setIsPaymentTransactionsLoading] =
        useState(false);

    const loadTenants = useCallback(async () => {
        try {
            const response = await tenantsService.getAll();
            setTenants(response.tenants);
            setFetchError("");
        } catch (error) {
            setFetchError(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadPaymentTransactions = useCallback(
        async (tenantId: string | null) => {
            if (!tenantId) {
                setPaymentTransactions([]);
                setIsPaymentTransactionsLoading(false);
                return;
            }

            setIsPaymentTransactionsLoading(true);

            try {
                const response = await PaymentService.getPaymentTransactions({
                    page: 1,
                    limit: 5,
                    occupantId: tenantId,
                });

                const mapped = response.transactions.map((transaction) => ({
                    id: transaction.id,
                    tenantName: transaction.tenantName,
                    paidDate: transaction.paymentDate,
                    paidNominal: transaction.amount,
                    paymentMethod: transaction.paymentMethod,
                    note: transaction.note,
                    invoices: transaction.invoices.map((invoice) => ({
                        invoiceId: invoice.invoiceId,
                        roomCode: invoice.roomLabel,
                        periodStart: invoice.periodStart,
                        periodEnd: invoice.periodEnd,
                        amountApplied: 0,
                    })),
                }));

                setPaymentTransactions(mapped);
            } catch (error) {
                console.error(
                    "Gagal memuat transaksi pembayaran penghuni:",
                    error,
                );
                setPaymentTransactions([]);
            } finally {
                setIsPaymentTransactionsLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadTenants();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [loadTenants]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadPaymentTransactions(detailTenantId);
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [detailTenantId, loadPaymentTransactions]);

    const filteredTenants = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return tenants
            .filter((tenant) => {
                if (
                    normalizedQuery &&
                    !buildSearchIndex(tenant).includes(normalizedQuery)
                ) {
                    return false;
                }

                if (
                    leaseFilter !== "ALL" &&
                    tenant.leaseStatus !== leaseFilter
                ) {
                    return false;
                }

                if (
                    paymentFilter !== "ALL" &&
                    tenant.paymentStatus !== paymentFilter
                ) {
                    return false;
                }

                if (
                    accountStatusFilter !== "ALL" &&
                    tenant.profileStatus !== accountStatusFilter
                ) {
                    return false;
                }

                return true;
            })
            .sort(compareTenantRoomCode);
    }, [accountStatusFilter, leaseFilter, paymentFilter, searchQuery, tenants]);

    const detailTenant = useMemo(
        () => tenants.find((tenant) => tenant.id === detailTenantId) ?? null,
        [detailTenantId, tenants],
    );

    const editTenant = useMemo(
        () => tenants.find((tenant) => tenant.id === editTenantId) ?? null,
        [editTenantId, tenants],
    );

    const unpaidInvoices = useMemo(
        () =>
            detailTenant
                ? detailTenant.invoiceHistory.filter(
                      (invoice) =>
                          invoice.paymentStatus === "UNPAID" ||
                          invoice.paymentStatus === "PARTIAL",
                  )
                : [],
        [detailTenant],
    );

    const totalTenants = tenants.length;
    const totalActiveLease = tenants.filter(
        (tenant) => tenant.leaseStatus === "ACTIVE",
    ).length;
    const totalExpiringLease = tenants.filter(
        (tenant) =>
            tenant.leaseStatus === "EXPIRING" ||
            tenant.leaseStatus === "WAITING_CHECKOUT",
    ).length;
    const totalUnsettled = tenants.filter(
        (tenant) =>
            tenant.paymentStatus === "UNPAID" ||
            tenant.paymentStatus === "PARTIAL",
    ).length;
    const totalRemainingBill = tenants.reduce(
        (sum, tenant) => sum + tenant.outstandingAmount,
        0,
    );

    const handleResetFilters = () => {
        setSearchQuery("");
        setLeaseFilter("ALL");
        setPaymentFilter("ALL");
        setAccountStatusFilter("ACTIVE");
    };

    const openEditModal = (tenant: TenantRecord) => {
        setFeedbackMessage("");
        setEditError("");
        setEditForm(buildEditForm(tenant));
        setEditTenantId(tenant.id);
    };

    const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCreateError("");
        setFeedbackMessage("");
        setIsSubmitting(true);

        try {
            const response = await usersService.createOccupant({
                email: createForm.email.trim(),
                password: createForm.password.trim(),
                name: createForm.name.trim(),
                phoneNumber: createForm.phoneNumber.trim(),
                address: createForm.address.trim(),
                occupation: createForm.occupation,
                moveInDate: createForm.moveInDate || null,
                moveOutDate: createForm.moveOutDate || null,
            });

            setFeedbackMessage(response.message);
            setCreateForm(defaultCreateForm);
            setIsCreateModalOpen(false);
            setIsLoading(true);
            await loadTenants();
        } catch (error) {
            setCreateError(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editTenant) {
            return;
        }

        setEditError("");
        setFeedbackMessage("");
        setIsSubmitting(true);

        try {
            const response = await usersService.updateOccupant(editTenant.id, {
                email: editForm.email.trim(),
                name: editForm.name.trim(),
                phoneNumber: editForm.phoneNumber.trim(),
                address: editForm.address.trim(),
                occupation: editForm.occupation,
                status: editForm.status,
                moveInDate: editForm.moveInDate || null,
                moveOutDate: editForm.moveOutDate || null,
                ...(editForm.password.trim()
                    ? { password: editForm.password.trim() }
                    : {}),
            });

            setFeedbackMessage(response.message);
            setEditTenantId(null);
            setIsLoading(true);
            await loadTenants();
        } catch (error) {
            setEditError(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasData = filteredTenants.length > 0;

    return (
        <section className="space-y-5">
            <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900">
                        Data Penghuni
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 md:text-base">
                        Kelola data penghuni aktif, status sewa, dan tindak
                        lanjut tagihan dari satu halaman.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setFeedbackMessage("");
                            setCreateError("");
                            setCreateForm(defaultCreateForm);
                            setIsCreateModalOpen(true);
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        Tambah Penghuni
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setIsLoading(true);
                            setFetchError("");
                            void loadTenants();
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                    >Reload</button>
                </div>
            </header>

            {feedbackMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {feedbackMessage}
                </div>
            ) : null}

            {fetchError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {fetchError}
                </div>
            ) : null}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Total Penghuni
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
                        {totalTenants}
                    </p>
                </article>

                <article className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Sewa Aktif
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
                        {totalActiveLease}
                    </p>
                </article>

                <article className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Perlu Tindak Lanjut
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-700">
                        {totalExpiringLease}
                    </p>
                </article>

                <article className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Belum Lunas
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-rose-700">
                        {totalUnsettled}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-rose-700">
                        Sisa tagihan:{" "}
                        {rupiahFormatter.format(totalRemainingBill)}
                    </p>
                </article>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <label className="flex flex-col gap-1 xl:col-span-2">
                        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Cari Penghuni
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => {
                                setSearchQuery(event.target.value);
                            }}
                            placeholder="Cari nama, email, nomor HP, atau kamar"
                            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Status Sewa
                        </span>
                        <select
                            value={leaseFilter}
                            onChange={(event) => {
                                setLeaseFilter(
                                    event.target.value as LeaseFilter,
                                );
                            }}
                            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        >
                            <option value="ALL">Semua Status Sewa</option>
                            <option value="ACTIVE">Active</option>
                            <option value="EXPIRING">Akan Berakhir</option>
                            <option value="WAITING_CHECKOUT">
                                Menunggu Checkout
                            </option>
                            <option value="UPCOMING">Akan Mulai</option>
                            <option value="COMPLETED">Done</option>
                            <option value="NO_LEASE">Belum Ada Sewa</option>
                        </select>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Status Pembayaran
                        </span>
                        <select
                            value={paymentFilter}
                            onChange={(event) => {
                                setPaymentFilter(
                                    event.target.value as PaymentFilter,
                                );
                            }}
                            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        >
                            <option value="ALL">Semua Status</option>
                            <option value="PAID">Lunas</option>
                            <option value="PARTIAL">Cicilan</option>
                            <option value="UNPAID">Belum Bayar</option>
                            <option value="NO_BILL">Belum Ada Tagihan</option>
                        </select>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Status Akun
                        </span>
                        <select
                            value={accountStatusFilter}
                            onChange={(event) => {
                                setAccountStatusFilter(
                                    event.target.value as AccountStatusFilter,
                                );
                            }}
                            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        >
                            <option value="ALL">Semua Status Akun</option>
                            <option value="ACTIVE">Active</option>
                            <option value="DEACTIVE">Nonaktif</option>
                        </select>
                    </label>

                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                            Daftar Penghuni
                        </h3>
                        <p className="text-xs text-gray-500">
                            {filteredTenants.length} penghuni ditampilkan
                        </p>
                    </div>
                </header>

                {isLoading ? (
                    <div className="space-y-3 p-4">
                        <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                        <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                        <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                    </div>
                ) : null}

                {!isLoading && !hasData ? (
                    <div className="p-6 text-sm text-gray-500">
                        Tidak ada data penghuni yang cocok dengan filter saat
                        ini.
                    </div>
                ) : null}

                {!isLoading && hasData ? (
                    <>
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Tenant</th>
                                        <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            Kontak
                                        </th>
                                        <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            Status Akun
                                        </th>
                                        <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Room</th>
                                        <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            Tanggal Masuk / Keluar
                                        </th>
                                        <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            Status Sewa
                                        </th>
                                        <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            Status Pembayaran
                                        </th>
                                        <th className="border-r border-gray-200 px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            Total Tagihan
                                        </th>
                                        <th className="border-r border-gray-200 px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            Sisa Tagihan
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTenants.map((tenant) => (
                                        <tr
                                            key={tenant.id}
                                            className="border-b border-gray-200 transition hover:bg-gray-50"
                                        >
                                            <td className="border-r border-gray-200 px-4 py-3 align-top">
                                                <p className="font-semibold text-gray-900">
                                                    {tenant.name}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {occupationLabel(
                                                        tenant.occupationStatus,
                                                    )}
                                                </p>
                                            </td>
                                            <td className="border-r border-gray-200 px-4 py-3 align-top">
                                                <p className="text-sm text-gray-800">
                                                    {tenant.phoneNumber}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {tenant.email}
                                                </p>
                                            </td>
                                            <td className="border-r border-gray-200 px-4 py-3 align-top">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${profileStatusBadgeClass(
                                                        tenant.profileStatus,
                                                    )}`}
                                                >
                                                    {profileStatusLabel(
                                                        tenant.profileStatus,
                                                    )}
                                                </span>
                                            </td>
                                            <td className="border-r border-gray-200 px-4 py-3 align-top">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {tenant.roomCode}
                                                </p>
                                            </td>
                                            <td className="border-r border-gray-200 px-4 py-3 align-top">
                                                <p className="text-xs text-gray-500">
                                                    {formatDate(
                                                        tenant.moveInDate,
                                                    )}{" "}
                                                    -{" "}
                                                    {formatDate(
                                                        tenant.moveOutDate,
                                                    )}
                                                </p>
                                            </td>
                                            <td className="border-r border-gray-200 px-4 py-3 align-top">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${leaseBadgeClass(
                                                        tenant.leaseStatus,
                                                    )}`}
                                                >
                                                    {leaseStatusLabel(
                                                        tenant.leaseStatus,
                                                    )}
                                                </span>
                                            </td>
                                            <td className="border-r border-gray-200 px-4 py-3 align-top">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentBadgeClass(
                                                        tenant.paymentStatus,
                                                    )}`}
                                                >
                                                    {paymentStatusLabel(
                                                        tenant.paymentStatus,
                                                    )}
                                                </span>
                                            </td>
                                            <td className="border-r border-gray-200 px-4 py-3 text-right align-top font-semibold tabular-nums text-gray-900">
                                                {rupiahFormatter.format(
                                                    tenant.totalBill,
                                                )}
                                            </td>
                                            <td className="border-r border-gray-200 px-4 py-3 text-right align-top font-semibold tabular-nums text-rose-700">
                                                {rupiahFormatter.format(
                                                    tenant.outstandingAmount,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDetailTenantId(
                                                                tenant.id,
                                                            )
                                                        }
                                                        className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                                                    >Detail</button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditModal(
                                                                tenant,
                                                            )
                                                        }
                                                        className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                                                    >Edit</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-3 p-4 lg:hidden">
                            {filteredTenants.map((tenant) => (
                                <article
                                    key={`${tenant.id}-mobile`}
                                    className="rounded-xl border border-gray-200 bg-white p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {tenant.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {occupationLabel(
                                                    tenant.occupationStatus,
                                                )}
                                            </p>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {tenant.roomCode}
                                        </p>
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                        <p className="text-gray-600">No. HP</p>
                                        <p className="text-right text-gray-900">
                                            {tenant.phoneNumber}
                                        </p>
                                        <p className="text-gray-600">
                                            Status Akun
                                        </p>
                                        <p className="text-right text-gray-900">
                                            {profileStatusLabel(
                                                tenant.profileStatus,
                                            )}
                                        </p>
                                        <p className="text-gray-600">
                                            Masuk / Keluar
                                        </p>
                                        <p className="text-right text-xs leading-relaxed text-gray-900 sm:text-sm">
                                            {formatDate(tenant.moveInDate)} -{" "}
                                            {formatDate(tenant.moveOutDate)}
                                        </p>
                                        <p className="text-gray-600">
                                            Total Tagihan
                                        </p>
                                        <p className="text-right font-semibold tabular-nums text-rose-700">
                                            {rupiahFormatter.format(
                                                tenant.outstandingAmount,
                                            )}
                                        </p>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${occupationBadgeClass(
                                                tenant.occupationStatus,
                                            )}`}
                                        >
                                            {occupationLabel(
                                                tenant.occupationStatus,
                                            )}
                                        </span>
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${profileStatusBadgeClass(
                                                tenant.profileStatus,
                                            )}`}
                                        >
                                            {profileStatusLabel(
                                                tenant.profileStatus,
                                            )}
                                        </span>
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${leaseBadgeClass(
                                                tenant.leaseStatus,
                                            )}`}
                                        >
                                            {leaseStatusLabel(
                                                tenant.leaseStatus,
                                            )}
                                        </span>
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentBadgeClass(
                                                tenant.paymentStatus,
                                            )}`}
                                        >
                                            {paymentStatusLabel(
                                                tenant.paymentStatus,
                                            )}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDetailTenantId(tenant.id)
                                            }
                                            className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                                        >Detail</button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openEditModal(tenant)
                                            }
                                            className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                                        >Edit</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </>
                ) : null}
            </section>

            {isCreateModalOpen ? (
                <CrudModal
                    title="Tambah Penghuni"
                    description="Form ini memakai endpoint create occupant yang sudah tersedia di backend."
                    onClose={() => setIsCreateModalOpen(false)}
                >
                    <form className="space-y-4" onSubmit={handleCreateSubmit}>
                        {createError ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {createError}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Email
                                </span>
                                <input
                                    type="email"
                                    value={createForm.email}
                                    onChange={(event) => {
                                        setCreateForm((previous) => ({
                                            ...previous,
                                            email: event.target.value,
                                        }));
                                    }}
                                    required
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Password
                                </span>
                                <input
                                    type="password"
                                    value={createForm.password}
                                    onChange={(event) => {
                                        setCreateForm((previous) => ({
                                            ...previous,
                                            password: event.target.value,
                                        }));
                                    }}
                                    required
                                    minLength={6}
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Nama
                                </span>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(event) => {
                                        setCreateForm((previous) => ({
                                            ...previous,
                                            name: event.target.value,
                                        }));
                                    }}
                                    required
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Nomor HP
                                </span>
                                <input
                                    type="text"
                                    value={createForm.phoneNumber}
                                    onChange={(event) => {
                                        setCreateForm((previous) => ({
                                            ...previous,
                                            phoneNumber: event.target.value,
                                        }));
                                    }}
                                    required
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Occupation
                                </span>
                                <select
                                    value={createForm.occupation}
                                    onChange={(event) => {
                                        setCreateForm((previous) => ({
                                            ...previous,
                                            occupation: event.target
                                                .value as OccupantOccupation,
                                        }));
                                    }}
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                >
                                    <option value="BEKERJA">Bekerja</option>
                                    <option value="KULIAH">Kuliah</option>
                                </select>
                            </label>

                            <label className="flex flex-col gap-1 md:col-span-2">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Address</span>
                                <input
                                    type="text"
                                    value={createForm.address}
                                    onChange={(event) => {
                                        setCreateForm((previous) => ({
                                            ...previous,
                                            address: event.target.value,
                                        }));
                                    }}
                                    required
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Tanggal Masuk
                                </span>
                                <input
                                    type="date"
                                    value={createForm.moveInDate}
                                    onChange={(event) => {
                                        setCreateForm((previous) => ({
                                            ...previous,
                                            moveInDate: event.target.value,
                                        }));
                                    }}
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Tanggal Keluar
                                </span>
                                <input
                                    type="date"
                                    value={createForm.moveOutDate}
                                    onChange={(event) => {
                                        setCreateForm((previous) => ({
                                            ...previous,
                                            moveOutDate: event.target.value,
                                        }));
                                    }}
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting
                                    ? "Saving..."
                                    : "Simpan Penghuni"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreateForm(defaultCreateForm)}
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                            >
                                Reset Form
                            </button>
                        </div>
                    </form>
                </CrudModal>
            ) : null}

            {detailTenant ? (
                <CrudModal
                    title="Detail Penghuni"
                    description="Fokus pada informasi inti yang dibutuhkan untuk tindak lanjut."
                    onClose={() => setDetailTenantId(null)}
                >
                    <div className="space-y-4">
                        <article className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="grid grid-cols-1 gap-x-4 gap-y-3 px-4 py-3 md:grid-cols-2 xl:grid-cols-3">
                                <div>
                                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                                        Nama
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {detailTenant.name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                                        Email
                                    </p>
                                    <p className="text-sm text-gray-900">
                                        {detailTenant.email}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                                        Nomor HP
                                    </p>
                                    <p className="text-sm text-gray-900">
                                        {detailTenant.phoneNumber}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                                        Occupation
                                    </p>
                                    <p className="text-sm text-gray-900">
                                        {occupationLabel(
                                            detailTenant.occupation,
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                                        Status Akun
                                    </p>
                                    <p className="text-sm text-gray-900">
                                        {profileStatusLabel(
                                            detailTenant.profileStatus,
                                        )}
                                    </p>
                                </div>
                                <div className="md:col-span-2 xl:col-span-1">
                                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">Address</p>
                                    <p className="text-sm text-gray-900">
                                        {detailTenant.address}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-gray-200" />

                            <div className="grid grid-cols-1 gap-x-4 gap-y-3 px-4 py-3 md:grid-cols-2 xl:grid-cols-3">
                                <div>
                                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                                        Kamar Aktif
                                    </p>
                                    <p className="text-sm text-gray-900">
                                        {detailTenant.roomCode}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                                        Status Sewa
                                    </p>
                                    <span
                                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${leaseBadgeClass(
                                            detailTenant.leaseStatus,
                                        )}`}
                                    >
                                        {leaseStatusLabel(
                                            detailTenant.leaseStatus,
                                        )}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                                        Status Tagihan
                                    </p>
                                    <span
                                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentBadgeClass(
                                            detailTenant.paymentStatus,
                                        )}`}
                                    >
                                        {paymentStatusLabel(
                                            detailTenant.paymentStatus,
                                        )}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                                        Tanggal Masuk / Keluar
                                    </p>
                                    <p className="text-sm text-gray-900">
                                        {formatDate(detailTenant.moveInDate)} -{" "}
                                        {formatDate(detailTenant.moveOutDate)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                                        Total Tagihan
                                    </p>
                                    <p className="text-sm font-semibold tabular-nums text-rose-700">
                                        {rupiahFormatter.format(
                                            detailTenant.outstandingAmount,
                                        )}
                                    </p>
                                </div>
                            </div>
                        </article>

                        <section className="rounded-xl border border-gray-200">
                            <header className="border-b border-gray-200 px-4 py-3">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Riwayat Tagihan
                                </h3>
                            </header>
                            <div className="divide-y divide-gray-200">
                                {unpaidInvoices.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-gray-500">
                                        Tidak ada tagihan dengan status belum
                                        bayar atau cicilan.
                                    </div>
                                ) : (
                                    unpaidInvoices.map((invoice) => (
                                        <div
                                            key={invoice.id}
                                            className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between"
                                        >
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {detailTenant.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formatDate(
                                                        invoice.periodStart,
                                                    )}{" "}
                                                    -{" "}
                                                    {formatDate(
                                                        invoice.periodEnd,
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                                                <span className="font-semibold tabular-nums text-gray-900">
                                                    Tagihan:{" "}
                                                    {rupiahFormatter.format(
                                                        invoice.monthlyRent,
                                                    )}
                                                </span>
                                                <span className="font-semibold tabular-nums text-emerald-700">
                                                    Bayar:{" "}
                                                    {rupiahFormatter.format(
                                                        invoice.paidNominal,
                                                    )}
                                                </span>
                                                <span className="font-semibold tabular-nums text-rose-700">
                                                    Sisa:{" "}
                                                    {rupiahFormatter.format(
                                                        invoice.outstandingAmount,
                                                    )}
                                                </span>
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentBadgeClass(
                                                        invoice.paymentStatus,
                                                    )}`}
                                                >
                                                    {paymentStatusLabel(
                                                        invoice.paymentStatus,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <section className="rounded-xl border border-gray-200">
                            <header className="border-b border-gray-200 px-4 py-3">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    List Pembayaran
                                </h3>
                            </header>
                            <div>
                                {isPaymentTransactionsLoading ? (
                                    <div className="px-4 py-3 text-sm text-gray-500">
                                        Memuat transaksi pembayaran...
                                    </div>
                                ) : paymentTransactions.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-gray-500">
                                        Belum ada data pembayaran untuk penghuni
                                        ini.
                                    </div>
                                ) : (
                                    <>
                                        <div className="hidden overflow-x-auto xl:block">
                                            <table className="min-w-full border-collapse text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-200 bg-gray-50">
                                                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Tenant</th>
                                                        <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                                            Nominal Transaksi
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                                            Tgl Bayar
                                                        </th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                                            Metode
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {paymentTransactions.map(
                                                        (transaction) => (
                                                            <tr
                                                                key={
                                                                    transaction.id
                                                                }
                                                                className="align-top transition-colors hover:bg-gray-50"
                                                            >
                                                                <td className="min-w-0 px-4 py-4">
                                                                    <p className="wrap-break-word font-semibold text-gray-900">
                                                                        {
                                                                            transaction.tenantName
                                                                        }
                                                                    </p>
                                                                            {transactionPeriodLabels(
                                                                                transaction,
                                                                            ).length ===
                                                                            0 ? (
                                                                                <p className="mt-1 text-xs text-gray-500">
                                                                                    -
                                                                                </p>
                                                                            ) : (
                                                                                <div className="mt-1 space-y-1 text-xs text-gray-500">
                                                                                    {transactionPeriodLabels(
                                                                                        transaction,
                                                                                    ).map(
                                                                                        (
                                                                                            label,
                                                                                            index,
                                                                                        ) => (
                                                                                            <p
                                                                                                key={`${transaction.id}-period-${index}`}
                                                                                            >
                                                                                                {
                                                                                                    label
                                                                                                }
                                                                                            </p>
                                                                                        ),
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                </td>
                                                                <td className="px-4 py-4 text-right font-semibold tabular-nums text-emerald-600">
                                                                    {rupiahFormatter.format(
                                                                        transaction.paidNominal,
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-4 text-gray-700">
                                                                    {formatDate(
                                                                        transaction.paidDate,
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <span
                                                                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentMethodBadgeClass(
                                                                            transaction.paymentMethod,
                                                                        )}`}
                                                                    >
                                                                        {paymentMethodLabel(
                                                                            transaction.paymentMethod,
                                                                        )}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="space-y-3 bg-gray-50 p-4 xl:hidden">
                                            {paymentTransactions.map(
                                                (transaction) => (
                                                    <article
                                                        key={`${transaction.id}-mobile`}
                                                        className="rounded-xl border border-gray-200 bg-white p-4"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="wrap-break-word text-sm font-semibold text-gray-900">
                                                                    {
                                                                        transaction.tenantName
                                                                    }
                                                                </p>
                                                                {transactionPeriodLabels(
                                                                    transaction,
                                                                ).length === 0 ? (
                                                                    <p className="mt-1 text-xs text-gray-500">
                                                                        -
                                                                    </p>
                                                                ) : (
                                                                    <div className="mt-1 space-y-1 text-xs text-gray-500">
                                                                        {transactionPeriodLabels(
                                                                            transaction,
                                                                        ).map(
                                                                            (
                                                                                label,
                                                                                index,
                                                                            ) => (
                                                                                <p
                                                                                    key={`${transaction.id}-period-mobile-${index}`}
                                                                                >
                                                                                    {
                                                                                        label
                                                                                    }
                                                                                </p>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span
                                                                className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentMethodBadgeClass(
                                                                    transaction.paymentMethod,
                                                                )}`}
                                                            >
                                                                {paymentMethodLabel(
                                                                    transaction.paymentMethod,
                                                                )}
                                                            </span>
                                                        </div>

                                                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 text-sm">
                                                            <div>
                                                                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                                                    Nominal
                                                                    Transaksi
                                                                </p>
                                                                <p className="mt-1 font-semibold tabular-nums text-emerald-600">
                                                                    {rupiahFormatter.format(
                                                                        transaction.paidNominal,
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                                                    Tgl Bayar
                                                                </p>
                                                                <p className="mt-1 text-gray-700">
                                                                    {formatDate(
                                                                        transaction.paidDate,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 border-t border-gray-100 pt-4">
                                                            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                                                Catatan
                                                            </p>
                                                            <p className="mt-1 wrap-break-word text-sm text-gray-600">
                                                                {transaction.note ||
                                                                    "-"}
                                                            </p>
                                                        </div>
                                                    </article>
                                                ),
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>
                    </div>
                </CrudModal>
            ) : null}

            {editTenant ? (
                <CrudModal
                    title="Edit Penghuni"
                    description="Perubahan dikirim ke endpoint update occupant di backend."
                    onClose={() => setEditTenantId(null)}
                >
                    <form className="space-y-4" onSubmit={handleEditSubmit}>
                        {editError ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {editError}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Email
                                </span>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(event) => {
                                        setEditForm((previous) => ({
                                            ...previous,
                                            email: event.target.value,
                                        }));
                                    }}
                                    required
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Password Baru
                                </span>
                                <input
                                    type="password"
                                    value={editForm.password}
                                    onChange={(event) => {
                                        setEditForm((previous) => ({
                                            ...previous,
                                            password: event.target.value,
                                        }));
                                    }}
                                    minLength={6}
                                    placeholder="Kosongkan jika tidak diubah"
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Nama
                                </span>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(event) => {
                                        setEditForm((previous) => ({
                                            ...previous,
                                            name: event.target.value,
                                        }));
                                    }}
                                    required
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Nomor HP
                                </span>
                                <input
                                    type="text"
                                    value={editForm.phoneNumber}
                                    onChange={(event) => {
                                        setEditForm((previous) => ({
                                            ...previous,
                                            phoneNumber: event.target.value,
                                        }));
                                    }}
                                    required
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Status</span>
                                <select
                                    value={editForm.status}
                                    onChange={(event) => {
                                        setEditForm((previous) => ({
                                            ...previous,
                                            status: event.target
                                                .value as ProfileStatus,
                                        }));
                                    }}
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="DEACTIVE">Nonaktif</option>
                                </select>
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Occupation
                                </span>
                                <select
                                    value={editForm.occupation}
                                    onChange={(event) => {
                                        setEditForm((previous) => ({
                                            ...previous,
                                            occupation: event.target
                                                .value as OccupantOccupation,
                                        }));
                                    }}
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                >
                                    <option value="BEKERJA">Bekerja</option>
                                    <option value="KULIAH">Kuliah</option>
                                </select>
                            </label>

                            <label className="flex flex-col gap-1 md:col-span-2">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Address</span>
                                <input
                                    type="text"
                                    value={editForm.address}
                                    onChange={(event) => {
                                        setEditForm((previous) => ({
                                            ...previous,
                                            address: event.target.value,
                                        }));
                                    }}
                                    required
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Tanggal Masuk
                                </span>
                                <input
                                    type="date"
                                    value={editForm.moveInDate}
                                    onChange={(event) => {
                                        setEditForm((previous) => ({
                                            ...previous,
                                            moveInDate: event.target.value,
                                        }));
                                    }}
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Tanggal Keluar
                                </span>
                                <input
                                    type="date"
                                    value={editForm.moveOutDate}
                                    onChange={(event) => {
                                        setEditForm((previous) => ({
                                            ...previous,
                                            moveOutDate: event.target.value,
                                        }));
                                    }}
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                />
                            </label>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting
                                    ? "Saving..."
                                    : "Save Changes"}
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setEditForm(buildEditForm(editTenant))
                                }
                                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                            >
                                Reset Form
                            </button>
                        </div>
                    </form>
                </CrudModal>
            ) : null}
        </section>
    );
}
