"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { PaymentHistoryTable } from "@/features/payments/components/PaymentHistoryTable";
import { PaymentSummaryCard } from "@/features/payments/components/PaymentSummaryCard";
import { useAdminPayments } from "@/features/payments/contexts/AdminPaymentsContext";
import { PaymentService } from "@/features/payments/services/payment.service";
import type { PaymentTransactionRecord } from "@/features/payments/types/payments";
import { formatCurrency } from "@/features/payments/utils/payments";

export function AdminPaymentHistoryView() {
  const pathname = usePathname();
  const basePath = pathname.startsWith("/operator") ? "/operator" : "/admin";

  const { openCreateModal } = useAdminPayments();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("ALL");
  
  const [transactions, setTransactions] = useState<PaymentTransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const currentYear = String(new Date().getFullYear());

  // Derive summary metrics from currently loaded transactions
  const totalCollected = transactions.reduce(
    (total, tx) => total + tx.amount,
    0
  );
  
  const completedThisYear = transactions.filter(
    (tx) => tx.paymentDate.startsWith(currentYear)
  ).length;

  const availableYears = useMemo(() => {
    // A simple fixed list or dynamically generated list of recent years
    // Since we now paginate backend data, we can't easily extract all years from the dataset
    // We provide current year and a few previous ones.
    const curr = new Date().getFullYear();
    return [curr, curr - 1, curr - 2].map(String);
  }, []);

  // Debounce Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const fetchTransactions = useCallback(async (page: number, search: string, year: string) => {
    setIsLoading(true);
    setHistoryError(null);
    try {
      const result = await PaymentService.getPaymentTransactions({
        page,
        limit: 10,
        search: search || undefined,
        year: year !== "ALL" ? year : undefined
      });
      setTransactions(result.transactions);
      setPagination(result.meta);
    } catch (error) {
      console.error("Failed to fetch payment transactions:", error);
      setHistoryError(
        error instanceof Error && error.message
          ? error.message
          : "Failed to load payment history. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger Fetch when filters change
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchTransactions(1, debouncedSearch, yearFilter);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [debouncedSearch, yearFilter, fetchTransactions]);

  const handlePageChange = (newPage: number) => {
    fetchTransactions(newPage, debouncedSearch, yearFilter);
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-blue-600 uppercase">
            Payment Archive
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900 md:text-3xl">
            Riwayat Transaksi
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 md:text-base">
            Telusuri arsip transaksi pembayaran untuk audit pemasukan dan
            
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`${basePath}/payments`}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >
              Kelola Aktif
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PaymentSummaryCard
          label="Transaksi (Halaman Ini)"
          value={transactions.length}
          helper={`Total data: ${pagination.total}`}
          tone="success"
        />
        <PaymentSummaryCard
          label="Total Pemasukan (Halaman Ini)"
          value={formatCurrency(totalCollected)}
          helper="Total nominal dari riwayat yang tampil"
          tone="success"
        />
        <PaymentSummaryCard
          label="Masuk Tahun Ini"
          value={completedThisYear}
          helper={`Payments recorded in ${currentYear}`}
          tone="info"
        />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-1 xl:col-span-3">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Cari Riwayat
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search room or tenant"
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Tahun
            </span>
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="ALL">Semua Tahun</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  Tahun {year}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setYearFilter("ALL");
              }}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </section>

      {historyError && !isLoading ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <p className="text-sm font-medium">{historyError}</p>
          <button
            type="button"
            onClick={() => {
              void fetchTransactions(pagination.page || 1, debouncedSearch, yearFilter);
            }}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Coba Lagi
          </button>
        </section>
      ) : (
        <PaymentHistoryTable
          transactions={transactions}
          isLoading={isLoading}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      )}
    </section>
  );
}
