"use client";

import { useEffect, useMemo, useState } from "react";
import { financialService } from "@/features/financial/services/financial.service";
import type {
    ExpenseCategory,
    FinancialRecord,
} from "@/features/financial/types/financial";

type ReportRow = {
    id: string;
    date: string;
    label: string;
    amount: number;
    subtitle?: string;
};

type YearlyReportRow = {
    id: string;
    monthIndex: number;
    monthLabel: string;
    incomeAmount: number;
    expenseAmount: number;
    balance: number;
};

const MONTH_NAMES = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
];

const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
    ASSET_REPAIR: "Perbaikan aset",
    LISTRIK: "Listrik",
    GAJI_PRT: "Gaji PRT",
    OPS_DAPUR: "Ops Dapur",
    BTN: "BTN",
    INTERNET: "Internet",
    LAIN_LAIN: "Lain-lain",
};

function padMonth(value: number) {
    return value.toString().padStart(2, "0");
}

function getCurrentMonthValue() {
    const now = new Date();
    return `${now.getFullYear()}-${padMonth(now.getMonth() + 1)}`;
}

function getCurrentYearValue() {
    return new Date().getFullYear();
}

function formatCurrency(value: number) {
    return `Rp ${new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 0,
    }).format(value)}`;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
    }).format(new Date(value));
}

function formatMonthHeading(monthValue: string) {
    const [year, month] = monthValue.split("-");
    const monthIndex = Number(month) - 1;
    return `${MONTH_NAMES[monthIndex] ?? month} ${year}`;
}

function parseMonthValue(monthValue: string) {
    const [year, month] = monthValue.split("-");
    return {
        year: Number(year),
        monthIndex: Number(month) - 1,
    };
}

function startOfSelectedMonth(monthValue: string) {
    const { year, monthIndex } = parseMonthValue(monthValue);
    return new Date(year, monthIndex, 1, 0, 0, 0, 0);
}

function endOfSelectedMonth(monthValue: string) {
    const { year, monthIndex } = parseMonthValue(monthValue);
    return new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
}

function startOfSelectedYear(yearValue: number) {
    return new Date(yearValue, 0, 1, 0, 0, 0, 0);
}

function endOfSelectedYear(yearValue: number) {
    return new Date(yearValue + 1, 0, 1, 0, 0, 0, 0);
}

function sumBalance(records: FinancialRecord[]) {
    return records.reduce((total, record) => {
        return (
            total + (record.type === "INCOME" ? record.amount : -record.amount)
        );
    }, 0);
}

function paymentMethodLabel(method?: string | null) {
    if (method === "TRANSFER") {
        return "Bank Transfer";
    }

    if (method === "E_WALLET") {
        return "E-Wallet";
    }

    if (method === "QRIS") {
        return "QRIS";
    }

    return "Cash";
}

function extractPaymentReference(record: FinancialRecord) {
    const description = record.description?.trim();

    if (description) {
        const payCode = description.match(/PAY-[A-Z0-9-]+/i)?.[0];
        return payCode ?? description;
    }

    return record.payment?.id ?? record.id;
}

function getIncomeLabel(record: FinancialRecord) {
    const occupantName = record.payment?.occupant.occupantDetails?.name?.trim();
    const occupantFallback = record.payment?.occupant.email?.trim();
    const occupantLabel = occupantName || occupantFallback || "Tenant";
    const roomNames = Array.from(
        new Set(
            (record.payment?.invoicePayments ?? [])
                .map((invoicePayment) => invoicePayment.invoice.room.name)
                .filter(Boolean),
        ),
    );

    const roomLabel = roomNames.length > 0 ? roomNames.join(", ") : "Room";
    return `${roomLabel} - ${occupantLabel}`;
}

function getIncomeSubtitle(record: FinancialRecord) {
    const method = paymentMethodLabel(record.payment?.paymentMethod);
    const reference = extractPaymentReference(record);
    return `${method} - Pembayaran ${reference}`;
}

function getExpenseLabel(record: FinancialRecord) {
    if (record.description?.trim()) {
        return record.description;
    }

    if (record.asset?.name && record.asset.room.name) {
        return `${record.asset.name} - ${record.asset.room.name}`;
    }

    return "Pengeluaran operasional";
}

function getExpenseSubtitle(record: FinancialRecord) {
    if (record.asset?.name && record.asset.room.name) {
        return `${record.asset.name} - ${record.asset.room.name}`;
    }

    return record.expenseCategory
        ? EXPENSE_CATEGORY_LABELS[record.expenseCategory]
        : "Biaya operasional";
}

function mapRecordToRow(record: FinancialRecord): ReportRow {
    if (record.type === "INCOME") {
        return {
            id: record.id,
            date: record.date,
            label: getIncomeLabel(record),
            amount: record.amount,
            subtitle: getIncomeSubtitle(record),
        };
    }

    return {
        id: record.id,
        date: record.date,
        label: getExpenseLabel(record),
        amount: record.amount,
        subtitle: getExpenseSubtitle(record),
    };
}

function ReportTable({
    title,
    emptyLabel,
    rows,
    total,
    accentClass,
}: {
    title: string;
    emptyLabel: string;
    rows: ReportRow[];
    total: number;
    accentClass: string;
}) {
    return (
        <section className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
                <h3 className="text-sm font-semibold tracking-wide text-gray-700 uppercase">
                    {title}
                </h3>
            </div>

            <div className="hidden flex-1 lg:flex lg:flex-col">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="w-12 border-b border-r border-gray-200 px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">
                                No
                            </th>
                            <th className="w-24 border-b border-r border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                            <th className="border-b border-r border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">
                                {title}
                            </th>
                            <th className="w-36 border-b border-gray-200 px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">
                                Jumlah
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-4 py-10 text-center text-sm text-gray-400"
                                >
                                    {emptyLabel}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, index) => (
                                <tr
                                    key={row.id}
                                    className="transition hover:bg-gray-50/60"
                                >
                                    <td className="border-b border-r border-gray-100 px-3 py-2.5 text-center text-sm text-gray-600">
                                        {index + 1}
                                    </td>
                                    <td className="border-b border-r border-gray-100 px-3 py-2.5 text-sm text-gray-600">
                                        {formatDate(row.date)}
                                    </td>
                                    <td className="border-b border-r border-gray-100 px-3 py-2.5 align-top">
                                        <p className="text-sm font-medium text-gray-900">
                                            {row.label}
                                        </p>
                                        {row.subtitle ? (
                                            <p className="mt-0.5 text-xs text-gray-400">
                                                {row.subtitle}
                                            </p>
                                        ) : null}
                                    </td>
                                    <td className="border-b border-gray-100 px-3 py-2.5 text-right text-sm tabular-nums text-gray-900">
                                        {formatCurrency(row.amount)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <div className="mt-auto border-t border-gray-200 bg-gray-50/80 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold italic text-gray-900">Total</span>
                        <span
                            className={`text-sm font-bold tabular-nums ${accentClass}`}
                        >
                            {formatCurrency(total)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
                {rows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
                        {emptyLabel}
                    </div>
                ) : (
                    rows.map((row, index) => (
                        <article
                            key={row.id}
                            className="rounded-xl border border-gray-200 bg-white p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
                                        {title} #{index + 1}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-gray-900">
                                        {row.label}
                                    </p>
                                </div>
                                <p
                                    className={`text-sm font-semibold tabular-nums ${accentClass}`}
                                >
                                    {formatCurrency(row.amount)}
                                </p>
                            </div>
                            <dl className="mt-3 grid grid-cols-2 gap-1.5 text-sm">
                                <dt className="text-gray-400">Date</dt>
                                <dd className="text-right text-gray-900">
                                    {formatDate(row.date)}
                                </dd>
                                <dt className="text-gray-400">Detail</dt>
                                <dd className="text-right text-gray-900">
                                    {row.subtitle || "-"}
                                </dd>
                            </dl>
                        </article>
                    ))
                )}

                <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold italic text-gray-900">Total</span>
                        <span
                            className={`text-sm font-bold tabular-nums ${accentClass}`}
                        >
                            {formatCurrency(total)}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}

function LoadingSkeleton() {
    return (
        <section className="space-y-5 animate-pulse">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="h-4 w-32 rounded bg-gray-200" />
                    <div className="mt-3 h-7 w-48 rounded bg-gray-200" />
                    <div className="mt-3 h-4 w-72 rounded bg-gray-100" />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="h-16 w-44 rounded-xl bg-gray-100" />
                    <div className="h-11 w-28 rounded-xl bg-gray-100" />
                </div>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                    <div
                        key={index}
                        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                    >
                        <div className="h-4 w-28 rounded bg-gray-200" />
                        <div className="mt-4 space-y-3">
                            {Array.from({ length: 5 }).map((__, rowIndex) => (
                                <div
                                    key={rowIndex}
                                    className="h-12 rounded bg-gray-50"
                                />
                            ))}
                        </div>
                        <div className="mt-4 h-8 rounded bg-gray-100" />
                    </div>
                ))}
            </div>
        </section>
    );
}

export default function AdminReportsPage() {
    const [records, setRecords] = useState<FinancialRecord[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
    const [selectedYear, setSelectedYear] = useState(getCurrentYearValue);
    const [activeReport, setActiveReport] = useState<"monthly" | "yearly">(
        "monthly",
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                setLoading(true);
                const response = await financialService.getAll();
                setRecords(response.records);
                setError(null);
            } catch (err) {
                console.error("Gagal memuat data laporan:", err);
                setError("Gagal memuat data laporan. Silakan coba lagi.");
            } finally {
                setLoading(false);
            }
        };

        void fetchRecords();
    }, []);

    const reportData = useMemo(() => {
        const monthStart = startOfSelectedMonth(selectedMonth);
        const monthEnd = endOfSelectedMonth(selectedMonth);

        const previousRecords = records.filter(
            (record) => new Date(record.date) < monthStart,
        );
        const currentRecords = records
            .filter((record) => {
                const recordDate = new Date(record.date);
                return recordDate >= monthStart && recordDate < monthEnd;
            })
            .sort(
                (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime(),
            );

        const incomeRows = currentRecords
            .filter((record) => record.type === "INCOME")
            .map(mapRecordToRow);
        const expenseRows = currentRecords
            .filter((record) => record.type === "EXPENSE")
            .map(mapRecordToRow);

        const totalIncome = incomeRows.reduce(
            (total, row) => total + row.amount,
            0,
        );
        const totalExpense = expenseRows.reduce(
            (total, row) => total + row.amount,
            0,
        );
        const previousBalance = sumBalance(previousRecords);
        const netBalance = totalIncome - totalExpense;
        const endingBalance = previousBalance + netBalance;

        return {
            incomeRows,
            expenseRows,
            totalIncome,
            totalExpense,
            previousBalance,
            netBalance,
            endingBalance,
        };
    }, [records, selectedMonth]);

    const yearlyReportData = useMemo(() => {
        const yearStart = startOfSelectedYear(selectedYear);
        const yearEnd = endOfSelectedYear(selectedYear);
        const previousRecords = records.filter(
            (record) => new Date(record.date) < yearStart,
        );
        const startingBalance = sumBalance(previousRecords);
        const monthBuckets: YearlyReportRow[] = MONTH_NAMES.map(
            (monthLabel, monthIndex) => ({
                id: `${selectedYear}-${monthIndex + 1}`,
                monthIndex,
                monthLabel,
                incomeAmount: 0,
                expenseAmount: 0,
                balance: startingBalance,
            }),
        );

        records.forEach((record) => {
            const recordDate = new Date(record.date);
            if (recordDate < yearStart || recordDate >= yearEnd) {
                return;
            }

            const bucket = monthBuckets[recordDate.getMonth()];
            if (!bucket) {
                return;
            }

            if (record.type === "INCOME") {
                bucket.incomeAmount += record.amount;
            } else {
                bucket.expenseAmount += record.amount;
            }
        });

        const yearlyAccumulator = monthBuckets.reduce(
            (accumulator, row) => {
                const totalIncome =
                    accumulator.totalIncome + row.incomeAmount;
                const totalExpense =
                    accumulator.totalExpense + row.expenseAmount;
                const runningBalance =
                    accumulator.runningBalance +
                    row.incomeAmount -
                    row.expenseAmount;

                return {
                    rows: [
                        ...accumulator.rows,
                        {
                            ...row,
                            balance: runningBalance,
                        },
                    ],
                    totalIncome,
                    totalExpense,
                    runningBalance,
                };
            },
            {
                rows: [] as YearlyReportRow[],
                totalIncome: 0,
                totalExpense: 0,
                runningBalance: startingBalance,
            },
        );

        const netBalance =
            yearlyAccumulator.totalIncome - yearlyAccumulator.totalExpense;
        const endingBalance = yearlyAccumulator.runningBalance;

        return {
            rows: yearlyAccumulator.rows,
            totalIncome: yearlyAccumulator.totalIncome,
            totalExpense: yearlyAccumulator.totalExpense,
            netBalance,
            startingBalance,
            endingBalance,
        };
    }, [records, selectedYear]);

    const isMonthlyReport = activeReport === "monthly";

    if (loading) {
        return <LoadingSkeleton />;
    }

    if (error) {
        return (
            <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">
                    Laporan Bulanan
                </h2>
                <p className="mt-2 text-sm text-gray-600">{error}</p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                >Reload</button>
            </section>
        );
    }

    return (
        <section className="space-y-5">
            <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="text-xs font-semibold tracking-[0.24em] text-gray-500 uppercase">
                        {isMonthlyReport
                            ? "Laporan Bulanan"
                            : "Laporan Tahunan"}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                        {isMonthlyReport
                            ? formatMonthHeading(selectedMonth)
                            : `Tahun ${selectedYear}`}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500 md:text-base">
                        {isMonthlyReport
                            ? "Tinjau rekap pemasukan, pengeluaran, dan saldo berjalan untuk periode yang dipilih."
                            : "Ringkasan pemasukan, pengeluaran, dan saldo tahunan dengan rincian per bulan."}
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="inline-flex w-fit rounded-xl border border-gray-200 bg-white p-1">
                        <button
                            type="button"
                            onClick={() => setActiveReport("monthly")}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                isMonthlyReport
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            Bulanan
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveReport("yearly")}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                isMonthlyReport
                                    ? "text-gray-600 hover:bg-gray-100"
                                    : "bg-blue-600 text-white"
                            }`}
                        >
                            Tahunan
                        </button>
                    </div>

                    {isMonthlyReport ? (
                        <>
                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Filter Periode
                                </span>
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(event) =>
                                        setSelectedMonth(event.target.value)
                                    }
                                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedMonth(getCurrentMonthValue())
                                }
                                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                Bulan Ini
                            </button>
                        </>
                    ) : (
                        <>
                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Filter Tahun
                                </span>
                                <input
                                    type="number"
                                    min={2000}
                                    max={2100}
                                    value={selectedYear}
                                    onChange={(event) => {
                                        if (event.target.value === "") {
                                            return;
                                        }

                                        const parsedYear = Number(
                                            event.target.value,
                                        );
                                        if (Number.isInteger(parsedYear)) {
                                            setSelectedYear(parsedYear);
                                        }
                                    }}
                                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedYear(getCurrentYearValue())
                                }
                                disabled={
                                    selectedYear === getCurrentYearValue()
                                }
                                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Tahun Ini
                            </button>
                        </>
                    )}
                </div>
            </header>

            {isMonthlyReport ? (
                <>
                    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Saldo Sebelum Periode
                            </p>
                            <p
                                className={`mt-2 text-xl font-semibold tabular-nums ${
                                    reportData.previousBalance >= 0
                                        ? "text-blue-700"
                                        : "text-rose-700"
                                }`}
                            >
                                {formatCurrency(reportData.previousBalance)}
                            </p>
                        </article>

                        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Selisih Bersih
                            </p>
                            <p
                                className={`mt-2 text-xl font-semibold tabular-nums ${
                                    reportData.netBalance >= 0
                                        ? "text-emerald-600"
                                        : "text-rose-600"
                                }`}
                            >
                                {formatCurrency(reportData.netBalance)}
                            </p>
                        </article>

                        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Saldo Akhir
                            </p>
                            <p
                                className={`mt-2 text-xl font-semibold tabular-nums ${
                                    reportData.endingBalance >= 0
                                        ? "text-emerald-700"
                                        : "text-rose-700"
                                }`}
                            >
                                {formatCurrency(reportData.endingBalance)}
                            </p>
                        </article>
                    </section>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <ReportTable
                            title="Pemasukan"
                            emptyLabel="Belum ada data pemasukan pada periode ini."
                            rows={reportData.incomeRows}
                            total={reportData.totalIncome}
                            accentClass="text-emerald-600"
                        />
                        <ReportTable
                            title="Pengeluaran"
                            emptyLabel="Belum ada data pengeluaran pada periode ini."
                            rows={reportData.expenseRows}
                            total={reportData.totalExpense}
                            accentClass="text-rose-600"
                        />
                    </div>
                </>
            ) : (
                <>
                    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Saldo Awal Tahun
                            </p>
                            <p
                                className={`mt-2 text-xl font-semibold tabular-nums ${
                                    yearlyReportData.startingBalance >= 0
                                        ? "text-blue-700"
                                        : "text-rose-700"
                                }`}
                            >
                                {formatCurrency(
                                    yearlyReportData.startingBalance,
                                )}
                            </p>
                        </article>

                        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Selisih Bersih
                            </p>
                            <p
                                className={`mt-2 text-xl font-semibold tabular-nums ${
                                    yearlyReportData.netBalance >= 0
                                        ? "text-emerald-600"
                                        : "text-rose-600"
                                }`}
                            >
                                {formatCurrency(yearlyReportData.netBalance)}
                            </p>
                        </article>

                        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Saldo Akhir Tahun
                            </p>
                            <p
                                className={`mt-2 text-xl font-semibold tabular-nums ${
                                    yearlyReportData.endingBalance >= 0
                                        ? "text-emerald-700"
                                        : "text-rose-700"
                                }`}
                            >
                                {formatCurrency(yearlyReportData.endingBalance)}
                            </p>
                        </article>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-200 px-5 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Saldo {selectedYear}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Rekap pemasukan, pengeluaran, dan saldo
                                        per bulan.
                                    </p>
                                </div>
                                <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${
                                        yearlyReportData.endingBalance >= 0
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-rose-50 text-rose-700"
                                    }`}
                                >
                                    Saldo akhir{" "}
                                    {formatCurrency(
                                        yearlyReportData.endingBalance,
                                    )}
                                </span>
                            </div>
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="min-w-full border-collapse text-sm text-gray-600">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Date</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            Pemasukan
                                        </th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            Pengeluaran
                                        </th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            Saldo
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {yearlyReportData.rows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="transition-colors hover:bg-gray-50"
                                        >
                                            <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-gray-900">
                                                {row.monthLabel}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums text-emerald-600">
                                                {formatCurrency(
                                                    row.incomeAmount,
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums text-rose-600">
                                                {formatCurrency(
                                                    row.expenseAmount,
                                                )}
                                            </td>
                                            <td
                                                className={`whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums ${
                                                    row.balance >= 0
                                                        ? "text-emerald-700"
                                                        : "text-rose-700"
                                                }`}
                                            >
                                                {formatCurrency(row.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-gray-200 bg-gray-50">
                                        <td className="px-5 py-3 text-sm font-semibold text-gray-700">Total</td>
                                        <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-emerald-600">
                                            {formatCurrency(
                                                yearlyReportData.totalIncome,
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-rose-600">
                                            {formatCurrency(
                                                yearlyReportData.totalExpense,
                                            )}
                                        </td>
                                        <td
                                            className={`px-5 py-3 text-right text-sm font-semibold tabular-nums ${
                                                yearlyReportData.endingBalance >=
                                                0
                                                    ? "text-emerald-700"
                                                    : "text-rose-700"
                                            }`}
                                        >
                                            {formatCurrency(
                                                yearlyReportData.endingBalance,
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="space-y-3 p-4 md:hidden">
                            {yearlyReportData.rows.map((row) => (
                                <article
                                    key={`${row.id}-mobile`}
                                    className="rounded-xl border border-gray-200 bg-white p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {row.monthLabel}
                                        </p>
                                        <p
                                            className={`text-sm font-semibold tabular-nums ${
                                                row.balance >= 0
                                                    ? "text-emerald-700"
                                                    : "text-rose-700"
                                            }`}
                                        >
                                            {formatCurrency(row.balance)}
                                        </p>
                                    </div>
                                    <dl className="mt-3 grid grid-cols-2 gap-1.5 text-sm">
                                        <dt className="text-gray-400">
                                            Pemasukan
                                        </dt>
                                        <dd className="text-right font-semibold tabular-nums text-emerald-600">
                                            {formatCurrency(row.incomeAmount)}
                                        </dd>
                                        <dt className="text-gray-400">
                                            Pengeluaran
                                        </dt>
                                        <dd className="text-right font-semibold tabular-nums text-rose-600">
                                            {formatCurrency(row.expenseAmount)}
                                        </dd>
                                    </dl>
                                </article>
                            ))}

                            <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold italic text-gray-900">Total</span>
                                    <span
                                        className={`text-sm font-bold tabular-nums ${
                                            yearlyReportData.endingBalance >= 0
                                                ? "text-emerald-700"
                                                : "text-rose-700"
                                        }`}
                                    >
                                        {formatCurrency(
                                            yearlyReportData.endingBalance,
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">
                                        Pemasukan
                                    </span>
                                    <span className="font-semibold tabular-nums text-emerald-600">
                                        {formatCurrency(
                                            yearlyReportData.totalIncome,
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">
                                        Pengeluaran
                                    </span>
                                    <span className="font-semibold tabular-nums text-rose-600">
                                        {formatCurrency(
                                            yearlyReportData.totalExpense,
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </section>
    );
}
