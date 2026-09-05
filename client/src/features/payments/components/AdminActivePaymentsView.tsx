"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ActivePaymentsTable } from "@/features/payments/components/ActivePaymentsTable";
import { PaymentSummaryCard } from "@/features/payments/components/PaymentSummaryCard";
import { useAdminPayments } from "@/features/payments/contexts/AdminPaymentsContext";
import {
    formatCurrency,
    getRemainingAmount,
} from "@/features/payments/utils/payments";

type AttentionFilter = "ALL" | "OVERDUE" | "UNPAID" | "WAITING_CHECKOUT";

export function AdminActivePaymentsView() {
    const pathname = usePathname();
    const basePath = pathname.startsWith("/operator") ? "/operator" : "/admin";

    const {
        payments,
        activePayments,
        rooms,
        openCreateModal,
        fetchPayments,
        pagination,
    } = useAdminPayments();

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [roomFilter, setRoomFilter] = useState("ALL");
    const [attentionFilter, setAttentionFilter] =
        useState<AttentionFilter>("ALL");

    // Summary counts (Note: this is only for the current page since backend paginates.
    // For accurate global summary, a separate summary endpoint is ideal. But we use current page for now as a demo)
    const totalOutstanding = activePayments.reduce(
        (total, payment) => total + getRemainingAmount(payment),
        0,
    );
    const overdueCount = activePayments.filter(
        (payment) => payment.status === "NUNGGAK",
    ).length;
    const unpaidCount = activePayments.filter(
        (payment) => payment.status === "BELUM_BAYAR",
    ).length;
    const waitingCheckoutCount = activePayments.filter(
        (payment) => payment.waitingForRoomVacant,
    ).length;

    // Debounce Search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchQuery]);

    // Trigger Fetch when filters change
    useEffect(() => {
        let mappedStatus: string | undefined = undefined;
        if (attentionFilter === "OVERDUE") mappedStatus = "NOT_FULLY_PAID"; // Matches Backend PaymentStatus
        if (attentionFilter === "UNPAID") mappedStatus = "UNPAID";

        // Note: WAITING_CHECKOUT filter requires backend support. If backend doesn't support it,
        // we would filter it client side, but since we use pagination, backend must support it.
        // For now, if we can't filter WAITING_CHECKOUT backend-side, we might just skip it or add it later.
        // Let's pass what we have.

        fetchPayments({
            page: 1, // Reset to page 1 on filter change
            status: mappedStatus,
            roomId: roomFilter !== "ALL" ? roomFilter : undefined,
            search: debouncedSearch || undefined,
        });
    }, [debouncedSearch, roomFilter, attentionFilter, fetchPayments]);

    // Client-side filtering for specific attention filters if backend lacks it (e.g., WAITING_CHECKOUT)
    // Since we already pass status to backend, we only need to filter WAITING_CHECKOUT here if needed.
    // But doing it client-side breaks pagination. Ideally backend handles it.
    const displayPayments =
        attentionFilter === "WAITING_CHECKOUT"
            ? activePayments.filter((p) => p.waitingForRoomVacant)
            : activePayments;

    return (
        <section className="space-y-5">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-blue-600 uppercase">
                        Daily Payments
                    </p>
                    <h1 className="mt-2 text-2xl font-semibold text-gray-900 md:text-3xl">
                        Active Payments
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 md:text-base">
                        Kelola tagihan aktif, tunggakan, dan pembayaran yang
                        
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                        href={`${basePath}/payments/history`}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                    >
                        Lihat Riwayat
                    </Link>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        Create New Invoice
                    </button>
                </div>
            </header>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <PaymentSummaryCard
                    label="Total Invoices"
                    value={pagination.total}
                    helper={`Sesuai filter saat ini`}
                    tone="default"
                />
                <PaymentSummaryCard
                    label="Remaining Invoices"
                    value={formatCurrency(totalOutstanding)}
                    helper="Akumulasi piutang dari data tabel di bawah"
                    tone="danger"
                />
                <PaymentSummaryCard
                    label="Perlu Follow-up"
                    value={overdueCount}
                    helper="Invoices not fully paid"
                    tone="warning"
                />
                <PaymentSummaryCard
                    label="Waiting for Checkout"
                    value={waitingCheckoutCount}
                    helper={`${unpaidCount} tagihan belum dibayar sama sekali`}
                    tone="info"
                />
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <label className="flex flex-col gap-1 xl:col-span-2">
                        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Cari Invoice
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
                            }
                            placeholder="Search room or tenant"
                            className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        />
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Room
                        </span>
                        <select
                            value={roomFilter}
                            onChange={(event) =>
                                setRoomFilter(event.target.value)
                            }
                            className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        >
                            <option value="ALL">All Rooms</option>
                            {rooms.map((room) => (
                                <option key={room.id} value={room.id}>
                                    {room.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Prioritas
                        </span>
                        <select
                            value={attentionFilter}
                            onChange={(event) =>
                                setAttentionFilter(
                                    event.target.value as AttentionFilter,
                                )
                            }
                            className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        >
                            <option value="ALL">Semua Aktif</option>
                            <option value="OVERDUE">
                                Belum Lunas (Belum Penuh)
                            </option>
                            <option value="UNPAID">Belum Bayar</option>
                            <option value="WAITING_CHECKOUT">
                                Waiting for Checkout
                            </option>
                        </select>
                    </label>

                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery("");
                                setRoomFilter("ALL");
                                setAttentionFilter("ALL");
                            }}
                            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                        >
                            Reset Filter
                        </button>
                    </div>
                </div>
            </section>

            <ActivePaymentsTable payments={displayPayments} />
        </section>
    );
}
