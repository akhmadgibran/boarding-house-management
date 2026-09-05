"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { PaymentHistoryTable } from "@/features/payments/components/PaymentHistoryTable";
import { PaymentSummaryCard } from "@/features/payments/components/PaymentSummaryCard";
import { PaymentService } from "@/features/payments/services/payment.service";
import type {
    InvoiceRecord,
    PaymentStatus,
    PaymentTransactionRecord,
} from "@/features/payments/types/payments";
import {
    formatCurrency,
    formatDate,
    getPaymentBadge,
    getRemainingAmount,
} from "@/features/payments/utils/payments";

type InvoiceFilter = "ALL" | PaymentStatus;

const INVOICE_FILTER_OPTIONS: Array<{ value: InvoiceFilter; label: string }> = [
    { value: "ALL", label: "All Statuses" },
    { value: "LUNAS", label: "Paid" },
    { value: "NUNGGAK", label: "Unpaid" },
    { value: "BELUM_BAYAR", label: "Unpaid" },
];

const fieldClassName =
    "h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 transition placeholder:text-gray-400 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:outline-none";

const actionButtonClassName =
    "inline-flex h-11 touch-manipulation items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20";

export function OccupantPaymentHistoryView() {
    const { user } = useAuth();

    const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
    const [transactions, setTransactions] = useState<
        PaymentTransactionRecord[]
    >([]);
    const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [yearFilter, setYearFilter] = useState("ALL");
    const [invoiceLoading, setInvoiceLoading] = useState(true);
    const [transactionLoading, setTransactionLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [transactionPagination, setTransactionPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
    });

    const fetchInvoices = useCallback(async () => {
        setInvoiceLoading(true);
        try {
            const result = await PaymentService.getMyPayments({
                page: 1,
                limit: 100,
            });
            setInvoices(result.payments);
            setErrorMessage(null);
        } catch (error) {
            console.error("Failed to fetch occupant invoices:", error);
            setErrorMessage("Invoice history cannot be loaded at this time.");
        } finally {
            setInvoiceLoading(false);
        }
    }, []);

    const fetchTransactions = useCallback(
        async (page: number, year: string) => {
            setTransactionLoading(true);
            try {
                const result = await PaymentService.getMyPaymentTransactions({
                    page,
                    limit: 10,
                    year: year !== "ALL" ? year : undefined,
                });
                setTransactions(result.transactions);
                setTransactionPagination(result.meta);
                setErrorMessage(null);
            } catch (error) {
                console.error(
                    "Failed to fetch occupant payment transactions:",
                    error,
                );
                setErrorMessage(
                    "Transaction history cannot be loaded at this time.",
                );
            } finally {
                setTransactionLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchInvoices();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [fetchInvoices]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchTransactions(1, yearFilter);
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [fetchTransactions, yearFilter]);

    const availableYears = useMemo(() => {
        const years = new Set<string>();

        invoices.forEach((invoice) => {
            const year = new Date(invoice.startDateISO).getFullYear();
            if (!Number.isNaN(year)) {
                years.add(String(year));
            }
        });

        transactions.forEach((transaction) => {
            const year = new Date(transaction.paymentDate).getFullYear();
            if (!Number.isNaN(year)) {
                years.add(String(year));
            }
        });

        return Array.from(years).sort((a, b) => Number(b) - Number(a));
    }, [invoices, transactions]);

    const filteredInvoices = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        return invoices.filter((invoice) => {
            if (invoiceFilter !== "ALL" && invoice.status !== invoiceFilter) {
                return false;
            }

            if (!normalizedQuery) {
                return true;
            }

            return [
                invoice.roomLabel,
                invoice.periodLabel,
                invoice.priorOccupantName ?? "",
            ]
                .join(" ")
                .toLowerCase()
                .includes(normalizedQuery);
        });
    }, [invoiceFilter, invoices, searchQuery]);

    const totalBills = invoices.reduce(
        (sum, invoice) => sum + invoice.billAmount,
        0,
    );
    const totalPaid = invoices.reduce(
        (sum, invoice) => sum + invoice.paidAmount,
        0,
    );
    const totalRemaining = invoices.reduce(
        (sum, invoice) => sum + getRemainingAmount(invoice),
        0,
    );
    const paidInvoicesCount = invoices.filter(
        (invoice) => invoice.status === "LUNAS",
    ).length;
    const hasActiveInvoiceFilters =
        searchQuery.trim().length > 0 || invoiceFilter !== "ALL";

    const latestPaymentDate = useMemo(() => {
        const dates = invoices.flatMap((invoice) =>
            (invoice.paymentHistory ?? [])
                .map((payment) => payment.paidDate)
                .filter(Boolean),
        );

        if (dates.length === 0) {
            return "-";
        }

        const latest = dates.sort((left, right) => {
            return new Date(right).getTime() - new Date(left).getTime();
        })[0];

        return formatDate(latest);
    }, [invoices]);

    return (
        <section className="space-y-5">
            <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-[0.18em] text-blue-600 uppercase">
                        Occupant Payments
                    </p>
                    <h1 className="mt-2 text-2xl font-semibold text-gray-900 text-pretty md:text-3xl">
                        Your Payment History
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 md:text-base">
                        Monitor active invoices, installments, and transactions that have been
                        recorded for account{" "}
                        <span className="font-semibold text-gray-900">
                            {user?.occupantDetails?.name ??
                                user?.email ??
                                "occupant"}
                        </span>
                        .
                    </p>
                </div>
            </header>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <PaymentSummaryCard
                    label="Total Invoices"
                    value={invoices.length}
                    helper="All invoices connected to your account"
                    tone="info"
                />
                <PaymentSummaryCard
                    label="Paid Off"
                    value={paidInvoicesCount}
                    helper="Invoices that have been paid in full"
                    tone="success"
                />
                <PaymentSummaryCard
                    label="Total Paid"
                    value={formatCurrency(totalPaid)}
                    helper={`Accumulation of ${formatCurrency(totalBills)} total invoices`}
                    tone="success"
                />
                <PaymentSummaryCard
                    label="Remaining Obligation"
                    value={formatCurrency(totalRemaining)}
                    helper={`Last payment: ${latestPaymentDate}`}
                    tone={totalRemaining > 0 ? "warning" : "default"}
                />
            </section>

            {errorMessage ? (
                <section
                    aria-live="polite"
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm"
                >
                    <p className="font-semibold">
                        Payment data not yet available
                    </p>
                    <p className="mt-1">{errorMessage}</p>
                </section>
            ) : null}

            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-4 py-4 md:px-5 md:py-5">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Invoice History
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            {filteredInvoices.length} invoices displayed
                            based on the current filter.
                        </p>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="flex min-w-0 flex-col gap-1 lg:col-span-2">
                            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Search Invoices
                            </span>
                            <input
                                name="invoice-search"
                                type="text"
                                autoComplete="off"
                                value={searchQuery}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                placeholder={"Search room or period\u2026"}
                                className={fieldClassName}
                            />
                        </label>

                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Status
                            </span>
                            <select
                                name="invoice-status"
                                value={invoiceFilter}
                                onChange={(event) =>
                                    setInvoiceFilter(
                                        event.target.value as InvoiceFilter,
                                    )
                                }
                                className={fieldClassName}
                            >
                                {INVOICE_FILTER_OPTIONS.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold tracking-wide text-transparent uppercase select-none">
                                Aksi
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setInvoiceFilter("ALL");
                                }}
                                className={`${actionButtonClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                                disabled={!hasActiveInvoiceFilters}
                            >
                                Reset Filter
                            </button>
                        </div>
                    </div>
                </div>

                {invoiceLoading ? (
                    <div aria-live="polite" className="space-y-4 p-4 md:p-5">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-48 animate-pulse rounded-2xl border border-gray-200 bg-gray-50"
                            />
                        ))}
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="m-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center md:m-5">
                        <h3 className="text-base font-semibold text-gray-900">
                            No matching invoices yet
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                            Try changing keywords or status filters to
                            see other history.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-230 border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase md:px-5">
                                        Room & Period
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase md:px-5">
                                        ID Invoice
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase md:px-5">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase md:px-5">
                                        Invoice
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase md:px-5">
                                        Dibayar
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase md:px-5">
                                        Sisa
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase md:px-5">
                                        Ringkasan
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredInvoices.map((invoice) => {
                                    const badge = getPaymentBadge(invoice);
                                    const remaining =
                                        getRemainingAmount(invoice);
                                    const paymentHistory =
                                        invoice.paymentHistory ?? [];
                                    const latestInvoicePayment =
                                        paymentHistory.length > 0
                                            ? formatDate(
                                                  [...paymentHistory].sort(
                                                      (left, right) =>
                                                          new Date(
                                                              right.paidDate,
                                                          ).getTime() -
                                                          new Date(
                                                              left.paidDate,
                                                          ).getTime(),
                                                  )[0]?.paidDate ?? null,
                                              )
                                            : "-";

                                    return (
                                        <tr
                                            key={invoice.id}
                                            className="align-top transition-colors hover:bg-gray-50"
                                        >
                                            <td className="min-w-0 px-4 py-4 md:px-5">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900">
                                                        {invoice.roomLabel}
                                                    </p>
                                                    <p className="mt-1 text-sm text-gray-600">
                                                        {invoice.periodLabel}
                                                    </p>
                                                    {invoice.priorOccupantName ? (
                                                        <p className="mt-1 wrap-break-word text-xs text-gray-500">
                                                            Waiting for relocation
                                                            from{" "}
                                                            {
                                                                invoice.priorOccupantName
                                                            }
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 md:px-5">
                                                <span className="break-all font-mono text-xs text-gray-500">
                                                    {invoice.id}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 md:px-5">
                                                <div className="flex flex-col items-start gap-2">
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                                                    >
                                                        {badge.label}
                                                    </span>
                                                    {invoice.waitingForRoomVacant ? (
                                                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                                            Waiting for vacant room
                                                            
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right font-semibold tabular-nums text-gray-900 md:px-5">
                                                {formatCurrency(
                                                    invoice.billAmount,
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right font-semibold tabular-nums text-emerald-700 md:px-5">
                                                {formatCurrency(
                                                    invoice.paidAmount,
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right font-semibold tabular-nums text-amber-700 md:px-5">
                                                {formatCurrency(remaining)}
                                            </td>
                                            <td className="px-4 py-4 md:px-5">
                                                <div className="space-y-1 text-sm text-gray-600">
                                                    <p>
                                                        <span className="font-semibold text-gray-900">
                                                            {
                                                                paymentHistory.length
                                                            }
                                                        </span>{" "}
                                                        transactions recorded
                                                    </p>
                                                    <p>
                                                        Last payment:{" "}
                                                        {latestInvoicePayment}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-gray-200 px-4 py-4 md:flex-row md:items-end md:justify-between md:px-5 md:py-5">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Recorded Transactions
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Chronological archive of payments that have entered the
                            system.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Tahun
                            </span>
                            <select
                                name="transaction-year"
                                value={yearFilter}
                                onChange={(event) =>
                                    setYearFilter(event.target.value)
                                }
                                className={`${fieldClassName} min-w-44`}
                            >
                                <option value="ALL">All Years</option>
                                {availableYears.map((year) => (
                                    <option key={year} value={year}>
                                        Year {year}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {yearFilter !== "ALL" ? (
                            <button
                                type="button"
                                onClick={() => setYearFilter("ALL")}
                                className={actionButtonClassName}
                            >
                                Reset Tahun
                            </button>
                        ) : null}
                    </div>
                </div>

                <PaymentHistoryTable
                    transactions={transactions}
                    isLoading={transactionLoading}
                    pagination={transactionPagination}
                    onPageChange={(page) => fetchTransactions(page, yearFilter)}
                    variant="occupant"
                    embedded
                />
            </section>
        </section>
    );
}
