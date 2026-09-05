"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { dashboardService } from "@/features/dashboard/services/dashboard.service";
import { financialService } from "@/features/financial/services/financial.service";
import type { DashboardSummaryResponse } from "@/features/dashboard/types/dashboard";
import type { FinancialRecord } from "@/features/financial/types/financial";

const EMPTY_RECENT_ACTIVITIES: DashboardSummaryResponse["recentActivities"] =
    [];
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

function formatCurrency(value: number) {
    return `Rp ${new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 0,
    }).format(value)}`;
}

function formatCompactCurrency(value: number) {
    return `Rp ${new Intl.NumberFormat("id-ID", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value)}`;
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function getCurrentYearValue() {
    return new Date().getFullYear();
}

function paymentMethodBadgeClass(method: string) {
    const normalized = method.toUpperCase();

    if (normalized.includes("TRANSFER")) {
        return "bg-blue-100 text-blue-800";
    }

    if (normalized.includes("QRIS")) {
        return "bg-emerald-100 text-emerald-800";
    }

    if (
        normalized.includes("E-WALLET") ||
        normalized.includes("EWALLET") ||
        normalized.includes("E_WALLET")
    ) {
        return "bg-indigo-100 text-indigo-800";
    }

    if (normalized.includes("CASH")) {
        return "bg-amber-100 text-amber-800";
    }

    return "bg-gray-100 text-gray-700";
}

export default function AdminDashboardPage() {
    const pathname = usePathname();
    const basePath = pathname.startsWith("/operator") ? "/operator" : "/admin";
    const dashboardTitle = pathname.startsWith("/operator")
        ? "Dashboard Operator"
        : "Dashboard Admin";
    const [data, setData] = useState<DashboardSummaryResponse | null>(null);
    const [incomeRecords, setIncomeRecords] = useState<FinancialRecord[]>([]);
    const [expenseRecords, setExpenseRecords] = useState<FinancialRecord[]>([]);
    const [monthlyOccupiedRooms, setMonthlyOccupiedRooms] = useState<number[]>(
        () => Array.from({ length: MONTH_NAMES.length }, () => 0),
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [isOccupancyHistoryLoading, setIsOccupancyHistoryLoading] =
        useState(true);
    const [isTriggeringSnapshot, setIsTriggeringSnapshot] = useState(false);
    const [isBackfillingSnapshot, setIsBackfillingSnapshot] = useState(false);
    const [error, setError] = useState("");
    const [historyError, setHistoryError] = useState("");
    const [occupancyHistoryError, setOccupancyHistoryError] = useState("");
    const [selectedYear, setSelectedYear] = useState(getCurrentYearValue);
    const [hoveredChartPoint, setHoveredChartPoint] = useState<{
        monthLabel: string;
        valueLabel: string;
        detailLabel: string;
        x: number;
        y: number;
    } | null>(null);
    const chartAreaRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let isActive = true;

        const fetchDashboard = async () => {
            try {
                setIsLoading(true);
                setIsHistoryLoading(true);
                setError("");
                setHistoryError("");

                const [dashboardResult, incomeResult, expenseResult] =
                    await Promise.allSettled([
                        dashboardService.getSummary(),
                        financialService.getAll("INCOME"),
                        financialService.getAll("EXPENSE"),
                    ]);

                if (!isActive) {
                    return;
                }

                if (dashboardResult.status === "fulfilled") {
                    setData(dashboardResult.value);
                } else {
                    setData(null);
                    setError(
                        dashboardResult.reason instanceof Error
                            ? dashboardResult.reason.message
                            : "Gagal memuat data dashboard",
                    );
                }

                if (incomeResult.status === "fulfilled") {
                    setIncomeRecords(
                        incomeResult.value.records.filter(
                            (record) => record.type === "INCOME",
                        ),
                    );
                } else {
                    setIncomeRecords([]);
                    setHistoryError(
                        "Histori pembayaran belum bisa dimuat saat ini.",
                    );
                }

                if (expenseResult.status === "fulfilled") {
                    setExpenseRecords(
                        expenseResult.value.records.filter(
                            (record) => record.type === "EXPENSE",
                        ),
                    );
                } else {
                    setExpenseRecords([]);
                    setHistoryError(
                        "Histori pembayaran belum bisa dimuat saat ini.",
                    );
                }
            } catch (err: unknown) {
                if (isActive) {
                    setData(null);
                    setIncomeRecords([]);
                    setExpenseRecords([]);
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Gagal memuat data dashboard",
                    );
                    setHistoryError(
                        "Histori pembayaran belum bisa dimuat saat ini.",
                    );
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                    setIsHistoryLoading(false);
                }
            }
        };

        void fetchDashboard();

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        let isActive = true;

        const fetchOccupancySnapshots = async () => {
            try {
                setIsOccupancyHistoryLoading(true);
                setOccupancyHistoryError("");

                const result = await dashboardService.getOccupancySnapshots(selectedYear);

                if (!isActive) return;

                // Map 12 snapshot (null → 0) ke array monthlyOccupiedRooms
                setMonthlyOccupiedRooms(
                    result.snapshots.map((s) => s?.occupiedRooms ?? 0),
                );
            } catch {
                if (isActive) {
                    setMonthlyOccupiedRooms(
                        Array.from({ length: MONTH_NAMES.length }, () => 0),
                    );
                    setOccupancyHistoryError(
                        "Histori okupansi belum bisa dimuat. Coba rekam snapshot terlebih dahulu.",
                    );
                }
            } finally {
                if (isActive) {
                    setIsOccupancyHistoryLoading(false);
                }
            }
        };

        void fetchOccupancySnapshots();

        return () => {
            isActive = false;
        };
    }, [selectedYear]);

    /**
     * Handler untuk tombol "Rekam Snapshot Sekarang".
     * Trigger snapshot bulan ini lalu refresh data okupansi.
     */
    const handleTriggerSnapshot = async () => {
        if (isTriggeringSnapshot) return;
        setIsTriggeringSnapshot(true);
        try {
            const now = new Date();
            await dashboardService.triggerOccupancySnapshot(
                now.getFullYear(),
                now.getMonth() + 1,
            );
            // Refresh data chart jika tahun yang dipilih = tahun ini
            if (selectedYear === now.getFullYear()) {
                const result = await dashboardService.getOccupancySnapshots(selectedYear);
                setMonthlyOccupiedRooms(
                    result.snapshots.map((s) => s?.occupiedRooms ?? 0),
                );
            }
        } catch (err) {
            console.error("Gagal merekam snapshot:", err);
        } finally {
            setIsTriggeringSnapshot(false);
        }
    };

    /**
     * Handler untuk tombol "Backfill Snapshot".
     * Menghitung ulang semua data historis dari awal, lalu refresh chart.
     */
    const handleBackfillSnapshot = async () => {
        if (isBackfillingSnapshot) return;
        setIsBackfillingSnapshot(true);
        try {
            await dashboardService.backfillOccupancySnapshots();
            // Selalu refresh chart setelah backfill
            const result = await dashboardService.getOccupancySnapshots(selectedYear);
            setMonthlyOccupiedRooms(
                result.snapshots.map((s) => s?.occupiedRooms ?? 0),
            );
        } catch (err) {
            console.error("Gagal backfill snapshot:", err);
        } finally {
            setIsBackfillingSnapshot(false);
        }
    };

    const summary = data?.summary;
    const recentActivities = data?.recentActivities ?? EMPTY_RECENT_ACTIVITIES;
    const occupancyRate =
        summary && summary.totalRooms > 0
            ? Math.round((summary.occupiedRooms / summary.totalRooms) * 100)
            : 0;
    const vacantRooms = summary
        ? Math.max(0, summary.totalRooms - summary.occupiedRooms)
        : 0;
    const endingBalanceClass =
        summary && summary.endingBalance < 0
            ? "text-rose-600"
            : "text-emerald-600";

    const sortedRecentActivities = useMemo(
        () =>
            [...recentActivities].sort(
                (left, right) =>
                    new Date(right.date).getTime() -
                    new Date(left.date).getTime(),
            ),
        [recentActivities],
    );

    const yearlyIncomeRecords = useMemo(
        () =>
            incomeRecords.filter(
                (record) =>
                    new Date(record.date).getFullYear() === selectedYear,
            ),
        [incomeRecords, selectedYear],
    );

    const yearlyExpenseRecords = useMemo(
        () =>
            expenseRecords.filter(
                (record) =>
                    new Date(record.date).getFullYear() === selectedYear,
            ),
        [expenseRecords, selectedYear],
    );

    const paymentChartData = useMemo(() => {
        const groupedByMonth = MONTH_NAMES.map((monthLabel, monthIndex) => ({
            id: `${selectedYear}-${monthIndex + 1}`,
            monthIndex,
            monthLabel,
            shortLabel: monthLabel.slice(0, 3),
            incomeAmount: 0,
            incomeTransactionCount: 0,
            expenseAmount: 0,
            expenseTransactionCount: 0,
            occupiedRooms: monthlyOccupiedRooms[monthIndex] ?? 0,
            occupancyRate: 0,
        }));

        yearlyIncomeRecords.forEach((record) => {
            const recordDate = new Date(record.date);
            const monthIndex = recordDate.getMonth();
            const monthBucket = groupedByMonth[monthIndex];

            if (monthBucket) {
                monthBucket.incomeAmount += record.amount;
                monthBucket.incomeTransactionCount += 1;
            }
        });

        yearlyExpenseRecords.forEach((record) => {
            const recordDate = new Date(record.date);
            const monthIndex = recordDate.getMonth();
            const monthBucket = groupedByMonth[monthIndex];

            if (monthBucket) {
                monthBucket.expenseAmount += record.amount;
                monthBucket.expenseTransactionCount += 1;
            }
        });

        return groupedByMonth.map((point) => ({
            ...point,
            occupancyRate:
                summary?.totalRooms && summary.totalRooms > 0
                    ? Math.round(
                          (point.occupiedRooms / summary.totalRooms) * 100,
                      )
                    : 0,
        }));
    }, [
        monthlyOccupiedRooms,
        selectedYear,
        summary,
        yearlyExpenseRecords,
        yearlyIncomeRecords,
    ]);

    const totalYearlyIncome = useMemo(
        () =>
            paymentChartData.reduce(
                (total, point) => total + point.incomeAmount,
                0,
            ),
        [paymentChartData],
    );

    const totalYearlyExpense = useMemo(
        () =>
            paymentChartData.reduce(
                (total, point) => total + point.expenseAmount,
                0,
            ),
        [paymentChartData],
    );

    const yearlyTransactionCount = useMemo(
        () =>
            paymentChartData.reduce(
                (total, point) => total + point.incomeTransactionCount,
                0,
            ),
        [paymentChartData],
    );

    const yearlyExpenseTransactionCount = useMemo(
        () =>
            paymentChartData.reduce(
                (total, point) => total + point.expenseTransactionCount,
                0,
            ),
        [paymentChartData],
    );

    const totalChartTransactions = useMemo(
        () => yearlyTransactionCount + yearlyExpenseTransactionCount,
        [yearlyExpenseTransactionCount, yearlyTransactionCount],
    );

    const averageOccupancyRate = useMemo(() => {
        const now = new Date();
        const visibleMonths = paymentChartData.filter((point) => {
            if (selectedYear < now.getFullYear()) {
                return true;
            }

            if (selectedYear > now.getFullYear()) {
                return false;
            }

            return point.monthIndex <= now.getMonth();
        });

        if (visibleMonths.length === 0) {
            return 0;
        }

        return Math.round(
            visibleMonths.reduce(
                (total, point) => total + point.occupancyRate,
                0,
            ) / visibleMonths.length,
        );
    }, [paymentChartData, selectedYear]);

    const activeMonthsCount = useMemo(
        () =>
            paymentChartData.filter(
                (point) =>
                    point.incomeTransactionCount > 0 ||
                    point.expenseTransactionCount > 0 ||
                    point.occupiedRooms > 0,
            ).length,
        [paymentChartData],
    );

    const hasChartData = useMemo(
        () =>
            totalChartTransactions > 0 ||
            paymentChartData.some((point) => point.occupiedRooms > 0),
        [paymentChartData, totalChartTransactions],
    );

    const chartMaxAmount = useMemo(
        () =>
            Math.max(
                1,
                ...paymentChartData.flatMap((point) => [
                    point.incomeAmount,
                    point.expenseAmount,
                ]),
            ),
        [paymentChartData],
    );

    const chartScaleValues = useMemo(
        () => [chartMaxAmount, Math.round(chartMaxAmount / 2), 0],
        [chartMaxAmount],
    );

    const chartGeometry = useMemo(() => {
        const width = 860;
        const height = 320;
        const leftPadding = 20;
        const rightPadding = 20;
        const topPadding = 18;
        const bottomPadding = 42;
        const plotWidth = width - leftPadding - rightPadding;
        const plotHeight = height - topPadding - bottomPadding;
        const denominator = Math.max(paymentChartData.length - 1, 1);
        const points = paymentChartData.map((point, index) => {
            const x = leftPadding + (plotWidth * index) / denominator;
            const incomeY =
                topPadding +
                (plotHeight * (chartMaxAmount - point.incomeAmount)) /
                    chartMaxAmount;
            const expenseY =
                topPadding +
                (plotHeight * (chartMaxAmount - point.expenseAmount)) /
                    chartMaxAmount;
            const occupancyY =
                topPadding + (plotHeight * (100 - point.occupancyRate)) / 100;

            return {
                ...point,
                x,
                incomeY,
                expenseY,
                occupancyY,
            };
        });

        const incomeLinePath = points
            .map(
                (point, index) =>
                    `${index === 0 ? "M" : "L"} ${point.x} ${point.incomeY}`,
            )
            .join(" ");
        const expenseLinePath = points
            .map(
                (point, index) =>
                    `${index === 0 ? "M" : "L"} ${point.x} ${point.expenseY}`,
            )
            .join(" ");
        const occupancyLinePath = points
            .map(
                (point, index) =>
                    `${index === 0 ? "M" : "L"} ${point.x} ${point.occupancyY}`,
            )
            .join(" ");
        const areaPath = `${incomeLinePath} L ${leftPadding + plotWidth} ${topPadding + plotHeight} L ${leftPadding} ${topPadding + plotHeight} Z`;

        return {
            width,
            height,
            leftPadding,
            rightPadding,
            topPadding,
            plotWidth,
            plotHeight,
            points,
            incomeLinePath,
            expenseLinePath,
            occupancyLinePath,
            areaPath,
        };
    }, [chartMaxAmount, paymentChartData]);

    const updateChartTooltip = (
        event: MouseEvent<SVGElement>,
        point: {
            monthLabel: string;
            valueLabel: string;
            detailLabel: string;
        },
    ) => {
        const chartBounds = chartAreaRef.current?.getBoundingClientRect();

        if (!chartBounds) {
            return;
        }

        const rawX = event.clientX - chartBounds.left;
        const rawY = event.clientY - chartBounds.top;
        const clampedX = Math.min(Math.max(rawX, 72), chartBounds.width - 72);
        const clampedY = Math.min(Math.max(rawY, 24), chartBounds.height - 16);

        setHoveredChartPoint({
            monthLabel: point.monthLabel,
            valueLabel: point.valueLabel,
            detailLabel: point.detailLabel,
            x: clampedX,
            y: clampedY,
        });
    };

    if (isLoading) {
        return (
            <section className="space-y-5 animate-pulse">
                <div className="space-y-2">
                    <div className="h-8 w-52 rounded bg-gray-200" />
                    <div className="h-4 w-80 max-w-full rounded bg-gray-100" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {[1, 2, 3, 4, 5].map((item) => (
                        <div
                            key={item}
                            className="h-36 rounded-xl border border-gray-200 bg-white"
                        />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <div className="h-96 rounded-2xl border border-gray-200 bg-white xl:col-span-2" />
                    <div className="h-96 rounded-2xl border border-gray-200 bg-white" />
                </div>
                <div className="h-80 rounded-2xl border border-gray-200 bg-white" />
            </section>
        );
    }

    if (error) {
        return (
            <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900">
                    {dashboardTitle}
                </h2>
                <p className="mt-2 text-sm text-rose-700">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                >Try Again</button>
            </section>
        );
    }

    if (!summary) {
        return null;
    }

    return (
        <section className="space-y-5">
            <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900">
                        {dashboardTitle}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500 md:text-base">
                        Ringkasan okupansi kamar, performa pembayaran terbaru,
                        dan akses cepat ke modul operasional utama.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href={`${basePath}/reports`}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        Lihat Laporan
                    </Link>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                    >Reload</button>
                </div>
            </header>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex justify-center">
                        <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {occupancyRate}% okupansi
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-3 text-center">
                            <p className="text-[10px] font-semibold tracking-wide text-emerald-700 uppercase">
                                Kamar Terisi
                            </p>
                            <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-700">
                                {summary.occupiedRooms}
                            </p>
                        </div>
                        <div className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-3 text-center">
                            <p className="text-[10px] font-semibold tracking-wide text-sky-700 uppercase">
                                Kamar Kosong
                            </p>
                            <p className="mt-1 text-xl font-semibold tabular-nums text-sky-700">
                                {vacantRooms}
                            </p>
                        </div>
                    </div>
                </article>

                <article className="flex min-h-36 flex-col rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Penghuni Aktif
                    </p>
                    <div className="flex flex-1 items-center justify-center">
                        <p className="text-2xl font-semibold tabular-nums text-gray-900">
                            {summary.totalActiveTenants}
                        </p>
                    </div>
                </article>

                <article className="flex min-h-36 flex-col rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Pendapatan Bulan Ini
                    </p>
                    <div className="flex flex-1 items-center justify-center">
                        <p className="text-xl font-semibold tabular-nums text-emerald-600">
                            {formatCurrency(summary.monthlyIncome)}
                        </p>
                    </div>
                </article>

                <article className="flex min-h-36 flex-col rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Tagihan Belum Dibayar
                    </p>
                    <div className="flex flex-1 items-center justify-center">
                        <p className="text-xl font-semibold tabular-nums text-amber-600">
                            {formatCurrency(summary.totalOutstanding)}
                        </p>
                    </div>
                </article>

                <article className="flex min-h-36 flex-col rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Saldo Akhir
                    </p>
                    <div className="flex flex-1 items-center justify-center">
                        <p
                            className={`text-xl font-semibold tabular-nums ${endingBalanceClass}`}
                        >
                            {formatCurrency(summary.endingBalance)}
                        </p>
                    </div>
                </article>
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Grafik Histori Pembayaran dan Okupansi
                            </h3>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                Lihat tren pemasukan, pengeluaran, dan okupansi
                                bulanan selama satu tahun untuk memantau
                                operasional lebih cepat.
                            </p>
                        </div>

                        <div className="flex flex-col gap-1 lg:min-w-55">
                            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Filter Tahun
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
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
                                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedYear(getCurrentYearValue())
                                    }
                                    disabled={
                                        selectedYear === getCurrentYearValue()
                                    }
                                    className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Tahun Ini
                                </button>
                            </div>
                        </div>
                        {/* Tombol rekam snapshot — hanya untuk admin */}
                        {basePath === "/admin" && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => void handleTriggerSnapshot()}
                                    disabled={isTriggeringSnapshot}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isTriggeringSnapshot ? (
                                        <>
                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                                            Merekam...
                                        </>
                                    ) : (
                                        "📸 Rekam Snapshot"
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleBackfillSnapshot()}
                                    disabled={isBackfillingSnapshot || isTriggeringSnapshot}
                                    title="Hitung ulang semua data historis okupansi dari awal"
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isBackfillingSnapshot ? (
                                        <>
                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                                            Backfill...
                                        </>
                                    ) : (
                                        "🔄 Backfill Semua"
                                    )}
                                </button>
                            </>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            Tahun {selectedYear}
                        </span>
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold tabular-nums text-emerald-700">
                            Pemasukan {formatCurrency(totalYearlyIncome)}
                        </span>
                        <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold tabular-nums text-rose-700">
                            Pengeluaran {formatCurrency(totalYearlyExpense)}
                        </span>
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            {yearlyTransactionCount} transaksi pemasukan
                        </span>
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            {yearlyExpenseTransactionCount} transaksi
                            pengeluaran
                        </span>
                        <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            {activeMonthsCount} bulan aktif
                        </span>
                        <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            Rata-rata okupansi {averageOccupancyRate}%
                        </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-600">
                        <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                            Pemasukan
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                            Pengeluaran
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Occupancy</span>
                    </div>

                    {historyError || occupancyHistoryError ? (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            {historyError || occupancyHistoryError}
                        </div>
                    ) : null}

                    {isHistoryLoading || isOccupancyHistoryLoading ? (
                        <div className="mt-5 flex min-h-72 flex-1 animate-pulse items-end gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                            {Array.from({ length: 7 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="flex min-w-0 flex-1 flex-col items-center justify-end"
                                >
                                    <div className="h-28 w-full rounded-t-2xl rounded-b-xl bg-gray-200" />
                                    <div className="mt-3 h-3 w-10 rounded bg-gray-200" />
                                </div>
                            ))}
                        </div>
                    ) : !hasChartData ? (
                        <div className="mt-5 flex min-h-72 flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                            Belum ada histori pemasukan, pengeluaran, atau
                            okupansi pada tahun {selectedYear}.
                        </div>
                    ) : (
                        <div className="mt-5 flex h-80 gap-3 overflow-x-auto overflow-y-visible rounded-2xl border border-gray-200 bg-linear-to-b from-gray-50 to-white px-4 pt-10 pb-4">
                            <div className="hidden w-14 shrink-0 sm:flex sm:flex-col sm:justify-between sm:pb-9">
                                {chartScaleValues.map((value, index) => (
                                    <span
                                        key={`${value}-${index}`}
                                        className="text-[11px] font-semibold tabular-nums text-gray-400"
                                    >
                                        {formatCompactCurrency(value)}
                                    </span>
                                ))}
                            </div>

                            <div
                                ref={chartAreaRef}
                                className="relative h-full min-w-88 flex-1"
                                onMouseLeave={() => setHoveredChartPoint(null)}
                            >
                                <div className="pointer-events-none absolute top-0 right-0 bottom-10 hidden w-14 flex-col justify-between sm:flex">
                                    {[100, 50, 0].map((value) => (
                                        <span
                                            key={`occupancy-scale-${value}`}
                                            className="text-right text-[11px] font-semibold tabular-nums text-amber-400"
                                        >
                                            {value}%
                                        </span>
                                    ))}
                                </div>

                                <div className="pointer-events-none absolute inset-0 bottom-10 flex flex-col justify-between">
                                    {chartScaleValues.map((value, index) => (
                                        <div
                                            key={`${value}-line-${index}`}
                                            className="border-t border-dashed border-gray-200"
                                        />
                                    ))}
                                </div>

                                {hoveredChartPoint ? (
                                    <div
                                        className="pointer-events-none absolute z-30 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap text-gray-700 shadow-sm"
                                        style={{
                                            left: hoveredChartPoint.x,
                                            top: hoveredChartPoint.y,
                                            transform:
                                                "translate(-50%, calc(-100% - 12px))",
                                        }}
                                    >
                                        <p>{hoveredChartPoint.monthLabel}</p>
                                        <p>{hoveredChartPoint.valueLabel}</p>
                                        <p>{hoveredChartPoint.detailLabel}</p>
                                    </div>
                                ) : null}

                                <svg
                                    viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                                    className="relative z-10 h-full w-full"
                                    role="img"
                                    aria-label={`Tren pembayaran dan okupansi tahun ${selectedYear}`}
                                >
                                    <path
                                        d={chartGeometry.areaPath}
                                        fill="url(#income-line-gradient)"
                                        className="opacity-80"
                                    />
                                    <path
                                        d={chartGeometry.incomeLinePath}
                                        fill="none"
                                        stroke="#2563eb"
                                        strokeWidth={3}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d={chartGeometry.expenseLinePath}
                                        fill="none"
                                        stroke="#f43f5e"
                                        strokeWidth={3}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d={chartGeometry.occupancyLinePath}
                                        fill="none"
                                        stroke="#f59e0b"
                                        strokeWidth={3}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeDasharray="8 8"
                                    />

                                    <defs>
                                        <linearGradient
                                            id="income-line-gradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="0%"
                                                stopColor="#93c5fd"
                                                stopOpacity="0.6"
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor="#dbeafe"
                                                stopOpacity="0.1"
                                            />
                                        </linearGradient>
                                    </defs>

                                    {chartGeometry.points
                                        .slice(1)
                                        .map((point, index) => {
                                            const previousPoint =
                                                chartGeometry.points[index];

                                            return (
                                                <line
                                                    key={`${point.id}-income-segment`}
                                                    x1={previousPoint.x}
                                                    y1={previousPoint.incomeY}
                                                    x2={point.x}
                                                    y2={point.incomeY}
                                                    stroke="transparent"
                                                    strokeWidth={18}
                                                    strokeLinecap="round"
                                                    pointerEvents="stroke"
                                                    className="cursor-pointer"
                                                    onMouseEnter={(event) =>
                                                        updateChartTooltip(
                                                            event,
                                                            {
                                                                monthLabel:
                                                                    previousPoint.monthLabel,
                                                                valueLabel:
                                                                    formatCurrency(
                                                                        previousPoint.incomeAmount,
                                                                    ),
                                                                detailLabel: `${previousPoint.incomeTransactionCount} transaksi pemasukan`,
                                                            },
                                                        )
                                                    }
                                                    onMouseMove={(event) =>
                                                        updateChartTooltip(
                                                            event,
                                                            {
                                                                monthLabel:
                                                                    previousPoint.monthLabel,
                                                                valueLabel:
                                                                    formatCurrency(
                                                                        previousPoint.incomeAmount,
                                                                    ),
                                                                detailLabel: `${previousPoint.incomeTransactionCount} transaksi pemasukan`,
                                                            },
                                                        )
                                                    }
                                                    onMouseLeave={() =>
                                                        setHoveredChartPoint(
                                                            null,
                                                        )
                                                    }
                                                />
                                            );
                                        })}

                                    {chartGeometry.points
                                        .slice(1)
                                        .map((point, index) => {
                                            const previousPoint =
                                                chartGeometry.points[index];

                                            return (
                                                <line
                                                    key={`${point.id}-expense-segment`}
                                                    x1={previousPoint.x}
                                                    y1={previousPoint.expenseY}
                                                    x2={point.x}
                                                    y2={point.expenseY}
                                                    stroke="transparent"
                                                    strokeWidth={18}
                                                    strokeLinecap="round"
                                                    pointerEvents="stroke"
                                                    className="cursor-pointer"
                                                    onMouseEnter={(event) =>
                                                        updateChartTooltip(
                                                            event,
                                                            {
                                                                monthLabel:
                                                                    previousPoint.monthLabel,
                                                                valueLabel:
                                                                    formatCurrency(
                                                                        previousPoint.expenseAmount,
                                                                    ),
                                                                detailLabel: `${previousPoint.expenseTransactionCount} transaksi pengeluaran`,
                                                            },
                                                        )
                                                    }
                                                    onMouseMove={(event) =>
                                                        updateChartTooltip(
                                                            event,
                                                            {
                                                                monthLabel:
                                                                    previousPoint.monthLabel,
                                                                valueLabel:
                                                                    formatCurrency(
                                                                        previousPoint.expenseAmount,
                                                                    ),
                                                                detailLabel: `${previousPoint.expenseTransactionCount} transaksi pengeluaran`,
                                                            },
                                                        )
                                                    }
                                                    onMouseLeave={() =>
                                                        setHoveredChartPoint(
                                                            null,
                                                        )
                                                    }
                                                />
                                            );
                                        })}

                                    {chartGeometry.points
                                        .slice(1)
                                        .map((point, index) => {
                                            const previousPoint =
                                                chartGeometry.points[index];

                                            return (
                                                <line
                                                    key={`${point.id}-occupancy-segment`}
                                                    x1={previousPoint.x}
                                                    y1={
                                                        previousPoint.occupancyY
                                                    }
                                                    x2={point.x}
                                                    y2={point.occupancyY}
                                                    stroke="transparent"
                                                    strokeWidth={18}
                                                    strokeLinecap="round"
                                                    pointerEvents="stroke"
                                                    className="cursor-pointer"
                                                    onMouseEnter={(event) =>
                                                        updateChartTooltip(
                                                            event,
                                                            {
                                                                monthLabel:
                                                                    previousPoint.monthLabel,
                                                                valueLabel: `${previousPoint.occupancyRate}% okupansi`,
                                                                detailLabel: `${previousPoint.occupiedRooms}/${summary.totalRooms} kamar terisi`,
                                                            },
                                                        )
                                                    }
                                                    onMouseMove={(event) =>
                                                        updateChartTooltip(
                                                            event,
                                                            {
                                                                monthLabel:
                                                                    previousPoint.monthLabel,
                                                                valueLabel: `${previousPoint.occupancyRate}% okupansi`,
                                                                detailLabel: `${previousPoint.occupiedRooms}/${summary.totalRooms} kamar terisi`,
                                                            },
                                                        )
                                                    }
                                                    onMouseLeave={() =>
                                                        setHoveredChartPoint(
                                                            null,
                                                        )
                                                    }
                                                />
                                            );
                                        })}

                                    {chartGeometry.points.map((point) => (
                                        <g key={point.id}>
                                            <circle
                                                cx={point.x}
                                                cy={point.incomeY}
                                                r={4.5}
                                                className="cursor-pointer fill-blue-600 transition hover:fill-blue-500"
                                                onMouseEnter={(event) =>
                                                    updateChartTooltip(event, {
                                                        monthLabel:
                                                            point.monthLabel,
                                                        valueLabel:
                                                            formatCurrency(
                                                                point.incomeAmount,
                                                            ),
                                                        detailLabel: `${point.incomeTransactionCount} transaksi pemasukan`,
                                                    })
                                                }
                                                onMouseMove={(event) =>
                                                    updateChartTooltip(event, {
                                                        monthLabel:
                                                            point.monthLabel,
                                                        valueLabel:
                                                            formatCurrency(
                                                                point.incomeAmount,
                                                            ),
                                                        detailLabel: `${point.incomeTransactionCount} transaksi pemasukan`,
                                                    })
                                                }
                                                onMouseLeave={() =>
                                                    setHoveredChartPoint(null)
                                                }
                                            />
                                            <circle
                                                cx={point.x}
                                                cy={point.expenseY}
                                                r={4.5}
                                                className="cursor-pointer fill-rose-500 transition hover:fill-rose-400"
                                                onMouseEnter={(event) =>
                                                    updateChartTooltip(event, {
                                                        monthLabel:
                                                            point.monthLabel,
                                                        valueLabel:
                                                            formatCurrency(
                                                                point.expenseAmount,
                                                            ),
                                                        detailLabel: `${point.expenseTransactionCount} transaksi pengeluaran`,
                                                    })
                                                }
                                                onMouseMove={(event) =>
                                                    updateChartTooltip(event, {
                                                        monthLabel:
                                                            point.monthLabel,
                                                        valueLabel:
                                                            formatCurrency(
                                                                point.expenseAmount,
                                                            ),
                                                        detailLabel: `${point.expenseTransactionCount} transaksi pengeluaran`,
                                                    })
                                                }
                                                onMouseLeave={() =>
                                                    setHoveredChartPoint(null)
                                                }
                                            />
                                            <circle
                                                cx={point.x}
                                                cy={point.occupancyY}
                                                r={4.5}
                                                className="cursor-pointer fill-amber-500 transition hover:fill-amber-400"
                                                onMouseEnter={(event) =>
                                                    updateChartTooltip(event, {
                                                        monthLabel:
                                                            point.monthLabel,
                                                        valueLabel: `${point.occupancyRate}% okupansi`,
                                                        detailLabel: `${point.occupiedRooms}/${summary.totalRooms} kamar terisi`,
                                                    })
                                                }
                                                onMouseMove={(event) =>
                                                    updateChartTooltip(event, {
                                                        monthLabel:
                                                            point.monthLabel,
                                                        valueLabel: `${point.occupancyRate}% okupansi`,
                                                        detailLabel: `${point.occupiedRooms}/${summary.totalRooms} kamar terisi`,
                                                    })
                                                }
                                                onMouseLeave={() =>
                                                    setHoveredChartPoint(null)
                                                }
                                            />
                                            <text
                                                x={point.x}
                                                y={
                                                    chartGeometry.topPadding +
                                                    chartGeometry.plotHeight +
                                                    24
                                                }
                                                textAnchor="middle"
                                                className="fill-gray-500 text-[10px] font-medium"
                                            >
                                                {point.shortLabel}
                                            </text>
                                        </g>
                                    ))}
                                </svg>
                            </div>
                        </div>
                    )}
                </article>

                <div className="space-y-5">
                    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Aksi Cepat
                        </h3>
                        <div className="mt-4 flex flex-col gap-2">
                            <Link
                                href={`${basePath}/tenants`}
                                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                            >
                                Tambah Penghuni
                                <span aria-hidden>&rarr;</span>
                            </Link>
                            <Link
                                href={`${basePath}/payments`}
                                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                            >
                                Catat Pembayaran
                                <span aria-hidden>&rarr;</span>
                            </Link>
                            <Link
                                href={`${basePath}/rooms`}
                                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                            >
                                Kelola Kamar
                                <span aria-hidden>&rarr;</span>
                            </Link>
                        </div>
                    </article>
                </div>
            </section>

            <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-5 py-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Pembayaran Terakhir
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Aktivitas pembayaran terbaru untuk inspeksi operasional
                        harian.
                    </p>
                </div>

                {sortedRecentActivities.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm text-gray-500">
                        Belum ada aktivitas pembayaran.
                    </div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="min-w-full border-collapse text-sm text-gray-600">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Date</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Tenant</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            Nominal
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            Metode
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {sortedRecentActivities.map((activity) => (
                                        <tr
                                            key={activity.id}
                                            className="transition-colors hover:bg-gray-50"
                                        >
                                            <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                                                {formatDateTime(activity.date)}
                                            </td>
                                            <td className="px-5 py-4 font-semibold text-gray-900">
                                                {activity.tenantName}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-gray-900">
                                                {formatCurrency(
                                                    activity.amount,
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentMethodBadgeClass(
                                                        activity.method,
                                                    )}`}
                                                >
                                                    {activity.method}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-3 p-4 md:hidden">
                            {sortedRecentActivities.map((activity) => (
                                <article
                                    key={`${activity.id}-mobile`}
                                    className="rounded-xl border border-gray-200 bg-white p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {activity.tenantName}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {formatDateTime(activity.date)}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentMethodBadgeClass(
                                                activity.method,
                                            )}`}
                                        >
                                            {activity.method}
                                        </span>
                                    </div>
                                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                            Nominal
                                        </p>
                                        <p className="mt-1 text-base font-semibold tabular-nums text-gray-900">
                                            {formatCurrency(activity.amount)}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </>
                )}
            </article>
        </section>
    );
}
