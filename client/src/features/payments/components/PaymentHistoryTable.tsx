"use client";

import type { PaymentTransactionRecord } from "@/features/payments/types/payments";
import { formatCurrency } from "@/features/payments/utils/payments";

type PaymentHistoryTableVariant = "admin" | "occupant";

type PaymentHistoryTableProps = {
    transactions: PaymentTransactionRecord[];
    isLoading: boolean;
    pagination: { page: number; totalPages: number; total: number };
    onPageChange: (page: number) => void;
    variant?: PaymentHistoryTableVariant;
    embedded?: boolean;
};

const paymentDateFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

function formatShortDate(value?: string): string {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return paymentDateFormatter.format(date);
}

function formatTransactionInvoicePeriod(
    invoice: PaymentTransactionRecord["invoices"][number],
): string {
    const periodStart = formatShortDate(invoice.periodStart);
    const periodEnd = formatShortDate(invoice.periodEnd);

    if (periodStart && periodEnd) {
        return `${periodStart} - ${periodEnd}`;
    }

    if (periodStart) {
        return periodStart;
    }

    if (periodEnd) {
        return periodEnd;
    }

    return invoice.roomLabel || "-";
}

const paginationButtonClassName =
    "inline-flex h-9 touch-manipulation items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Returns a small badge color class for the payment method.
 */
function getMethodBadgeClass(method: string): string {
    switch (method) {
        case "Bank Transfer":
            return "bg-blue-50 text-blue-700 border-blue-200";
        case "Cash":
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "E-Wallet":
            return "bg-indigo-50 text-indigo-700 border-indigo-200";
        default:
            return "bg-gray-50 text-gray-600 border-gray-200";
    }
}

export function PaymentHistoryTable({
    transactions,
    isLoading,
    pagination,
    onPageChange,
    variant = "admin",
    embedded = false,
}: PaymentHistoryTableProps) {
    const isOccupant = variant === "occupant";
    const wrapperClassName = embedded
        ? "overflow-hidden"
        : "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";
    const loadingClassName = embedded
        ? "p-4 md:p-5"
        : "rounded-2xl border border-gray-200 bg-white p-6 shadow-sm";
    const emptyStateClassName = embedded
        ? "m-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center md:m-5"
        : "rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center shadow-sm";

    const handleNextPage = () => {
        if (pagination.page < pagination.totalPages) {
            onPageChange(pagination.page + 1);
        }
    };

    const handlePrevPage = () => {
        if (pagination.page > 1) {
            onPageChange(pagination.page - 1);
        }
    };

    if (isLoading) {
        return (
            <section aria-live="polite" className={loadingClassName}>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex animate-pulse space-x-4">
                            <div className="flex-1 space-y-4 py-1">
                                <div className="h-4 w-3/4 rounded bg-gray-200"></div>
                                <div className="space-y-2">
                                    <div className="h-4 rounded bg-gray-200"></div>
                                    <div className="h-4 w-5/6 rounded bg-gray-200"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (transactions.length === 0) {
        return (
            <section className={emptyStateClassName}>
                <h2 className="text-lg font-semibold text-gray-900">
                    Empty Transaction History
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                    There is no transaction history that matches your
                    search criteria.
                </p>
            </section>
        );
    }

    if (isOccupant) {
        return (
            <section className={wrapperClassName}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-230 border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase md:px-5">
                                    Periode
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase md:px-5">
                                    ID Invoice
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase md:px-5">
                                    Metode
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase md:px-5">
                                    Nominal
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase md:px-5">
                                    Tgl Bayar
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase md:px-5">
                                    Ringkasan
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {transactions.map((tx) => {
                                const methodBadge = getMethodBadgeClass(
                                    tx.paymentMethod,
                                );
                                const paidDateFormatted =
                                    paymentDateFormatter.format(
                                        new Date(tx.paymentDate),
                                    );

                                return (
                                    <tr
                                        key={tx.id}
                                        className="align-top transition-colors hover:bg-gray-50"
                                    >
                                        <td className="min-w-0 px-4 py-4 md:px-5">
                                            <div className="flex flex-wrap gap-1">
                                                {tx.invoices.length > 0 ? (
                                                    tx.invoices.map(
                                                        (inv, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="inline-flex rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700"
                                                            >
                                                                {formatTransactionInvoicePeriod(
                                                                    inv,
                                                                )}
                                                            </span>
                                                        ),
                                                    )
                                                ) : (
                                                    <span className="text-sm text-gray-500">
                                                        -
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 md:px-5">
                                            <div className="flex flex-col gap-1">
                                                {tx.invoices.length > 0 ? (
                                                    tx.invoices.map(
                                                        (inv, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="break-all font-mono text-[11px] text-gray-500"
                                                            >
                                                                {inv.invoiceId}
                                                            </span>
                                                        ),
                                                    )
                                                ) : (
                                                    <span className="text-sm text-gray-500">
                                                        -
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 md:px-5">
                                            <span
                                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${methodBadge}`}
                                            >
                                                {tx.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right font-semibold tabular-nums text-emerald-600 md:px-5">
                                            {formatCurrency(tx.amount)}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-700 md:px-5">
                                            {paidDateFormatted}
                                        </td>
                                        <td className="px-4 py-4 md:px-5">
                                            <div className="space-y-1 text-sm text-gray-600">
                                                <p className="wrap-break-word">
                                                    {tx.note || "-"}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-5 py-3">
                        <span className="text-sm text-gray-500">
                            Page {pagination.page} of{" "}
                            {pagination.totalPages} (Total: {pagination.total})
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handlePrevPage}
                                disabled={pagination.page <= 1}
                                className={paginationButtonClassName}
                            >
                                Sebelumnya
                            </button>
                            <button
                                type="button"
                                onClick={handleNextPage}
                                disabled={
                                    pagination.page >= pagination.totalPages
                                }
                                className={paginationButtonClassName}
                            >
                                Selanjutnya
                            </button>
                        </div>
                    </div>
                )}
            </section>
        );
    }

    return (
        <section className={wrapperClassName}>
            <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                ID Transaksi
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Penghuni
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Periode
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                ID Invoice
                            </th>
                            <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Nominal Transaksi
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Tgl Bayar
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Metode
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Catatan
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {transactions.map((tx) => {
                            const methodBadge = getMethodBadgeClass(
                                tx.paymentMethod,
                            );
                            const paidDateFormatted =
                                paymentDateFormatter.format(
                                    new Date(tx.paymentDate),
                                );

                            return (
                                <tr
                                    key={tx.id}
                                    className="align-top transition-colors hover:bg-gray-50"
                                >
                                    <td className="px-5 py-4">
                                        <p className="font-mono text-xs font-medium text-gray-500">
                                            {tx.id.split("-")[1] ||
                                                tx.id.substring(0, 8)}
                                        </p>
                                    </td>
                                    <td className="min-w-0 px-5 py-4">
                                        <p className="wrap-break-word font-semibold text-gray-900">
                                            {tx.tenantName}
                                        </p>
                                    </td>
                                    <td className="min-w-0 px-5 py-4">
                                        <div className="flex flex-col gap-1">
                                            {tx.invoices.map((inv, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex w-fit rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700"
                                                >
                                                    {formatTransactionInvoicePeriod(
                                                        inv,
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="min-w-0 px-5 py-4">
                                        <div className="flex flex-col gap-1">
                                            {tx.invoices.length > 0 ? (
                                                tx.invoices.map((inv, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="break-all font-mono text-[11px] text-gray-500"
                                                    >
                                                        {inv.invoiceId}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-sm text-gray-500">
                                                    -
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-emerald-600">
                                        {formatCurrency(tx.amount)}
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-700">
                                        {paidDateFormatted}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span
                                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${methodBadge}`}
                                        >
                                            {tx.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="wrap-break-word text-sm text-gray-600">
                                            {tx.note || "-"}
                                        </p>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="space-y-3 bg-gray-50 p-4 xl:hidden">
                {transactions.map((tx) => {
                    const methodBadge = getMethodBadgeClass(tx.paymentMethod);
                    const paidDateFormatted = paymentDateFormatter.format(
                        new Date(tx.paymentDate),
                    );

                    return (
                        <article
                            key={`${tx.id}-mobile`}
                            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-mono text-xs text-gray-500">
                                        ID:{" "}
                                        {tx.id.split("-")[1] ||
                                            tx.id.substring(0, 8)}
                                    </p>
                                    <p className="mt-1 wrap-break-word text-sm font-semibold text-gray-900">
                                        {tx.tenantName}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span
                                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${methodBadge}`}
                                    >
                                        {tx.paymentMethod}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 text-sm">
                                <div className="col-span-2">
                                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                        Periode
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {tx.invoices.map((inv, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700"
                                            >
                                                {formatTransactionInvoicePeriod(
                                                    inv,
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                        ID Invoice
                                    </p>
                                    <div className="mt-1 flex flex-col gap-1">
                                        {tx.invoices.length > 0 ? (
                                            tx.invoices.map((inv, idx) => (
                                                <span
                                                    key={idx}
                                                    className="break-all font-mono text-[11px] text-gray-500"
                                                >
                                                    {inv.invoiceId}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-sm text-gray-500">
                                                -
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                        Nominal Transaksi
                                    </p>
                                    <p className="mt-1 font-semibold tabular-nums text-emerald-600">
                                        {formatCurrency(tx.amount)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                        Tgl Bayar
                                    </p>
                                    <p className="mt-1 text-sm text-gray-700">
                                        {paidDateFormatted}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 border-t border-gray-100 pt-4">
                                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Catatan
                                </p>
                                <p className="mt-1 wrap-break-word text-sm text-gray-600">
                                    {tx.note || "-"}
                                </p>
                            </div>
                        </article>
                    );
                })}
            </div>

            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-5 py-3">
                    <span className="text-sm text-gray-500">
                        Page {pagination.page} of {pagination.totalPages}{" "}
                        (Total: {pagination.total})
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handlePrevPage}
                            disabled={pagination.page <= 1}
                            className={paginationButtonClassName}
                        >
                            Sebelumnya
                        </button>
                        <button
                            type="button"
                            onClick={handleNextPage}
                            disabled={pagination.page >= pagination.totalPages}
                            className={paginationButtonClassName}
                        >
                            Selanjutnya
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
