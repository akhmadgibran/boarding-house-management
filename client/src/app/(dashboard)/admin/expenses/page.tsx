"use client";

import { useState, useEffect } from "react";
import { financialService } from "@/features/financial/services/financial.service";
import type {
  ExpenseCategory,
  FinancialRecord,
  CreateExpensePayload,
  UpdateExpensePayload,
} from "@/features/financial/types/financial";
import { roomsService } from "@/features/rooms/services/rooms.service";
import { ApiError } from "@/lib/api/client";

// Re-export types from the shared types file
export type RoomStatus = "OCCUPIED" | "VACANT";
export type AssetStatus = "BROKEN" | "GOOD" | "MAINTENANCE";
export type MaintenanceStatus = "PROCESS" | "PENDING" | "FINISHED";
export type ExpensePaymentMethod = "TRANSFER" | "CASH" | "E_WALLET";

export type Room = {
  id: string;
  name: string;
  status: RoomStatus;
};

export type AssetMaster = {
  id: string;
  name: string;
};

export type Asset = {
  id: string;
  assetMasterId: string;
  roomId: string;
  name: string;
  details: string;
  status: AssetStatus;
  assetMaster: AssetMaster;
  room: Room;
};

export type AssetMaintenanceLog = {
  id: string;
  assetId: string;
  details: string;
  status: MaintenanceStatus;
};

export type ExpenseRecord = {
  id: string;
  maintenanceLog: AssetMaintenanceLog;
  asset: Asset;
  expenseDate: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  vendorName: string;
  referenceNo: string;
};

type ExpenseAssetOption = {
  id: string;
  name: string;
  roomName: string;
};

const EXPENSE_CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "ASSET_REPAIR", label: "Perbaikan Aset" },

  { value: "LISTRIK", label: "Listrik" },
  { value: "GAJI_PRT", label: "Gaji PRT" },
  { value: "OPS_DAPUR", label: "Ops Dapur" },
  { value: "BTN", label: "BTN" },
  { value: "INTERNET", label: "Internet" },
  { value: "LAIN_LAIN", label: "Lain-lain" },
];

function expenseCategoryLabel(category?: ExpenseCategory | null) {
  return (
    EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === category)
      ?.label || "Lainnya"
  );
}

function formatCurrency(value: number) {
  return `Rp. ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatRupiahInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "");

  if (digitsOnly.length === 0) {
    return "";
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Number(digitsOnly));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
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

function getExpenseMonthKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-");
  const monthIndex = Number(month) - 1;
  const date = new Date(Number(year), monthIndex, 1);

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<FinancialRecord[]>([]);
  const [availableAssets, setAvailableAssets] = useState<ExpenseAssetOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] =
    useState<FinancialRecord | null>(null);
  const [createForm, setCreateForm] = useState<CreateExpensePayload>({
    amount: 0,
    description: "",
    expenseCategory: "LAIN_LAIN",
  });
  const [editForm, setEditForm] = useState<UpdateExpensePayload>({
    amount: 0,
    description: "",
    expenseCategory: "LAIN_LAIN",
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await financialService.getAll("EXPENSE");
      setExpenses(response.records);
      setError(null);
    } catch (err) {
      setError("Gagal memuat data pengeluaran");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      setAssetsLoading(true);
      const response = await roomsService.getAll();
      const assets = response.rooms.flatMap((room) =>
        room.assets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          roomName: room.name,
        })),
      );
      setAvailableAssets(assets);
    } catch (err) {
      console.error("Gagal memuat daftar aset:", err);
    } finally {
      setAssetsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchExpenses();
      void fetchAssets();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CreateExpensePayload = {
      amount: createForm.amount,
      description: createForm.description,
      expenseCategory: createForm.expenseCategory,
      ...(createForm.expenseCategory === "ASSET_REPAIR" && createForm.assetId
        ? { assetId: createForm.assetId }
        : {}),
    };

    if (payload.expenseCategory === "ASSET_REPAIR" && !payload.assetId) {
      setCreateError("Pilih aset untuk kategori Perbaikan Aset.");
      return;
    }

    if (payload.amount <= 0) {
      setCreateError("Nominal pengeluaran harus diisi dan lebih besar dari 0.");
      return;
    }

    try {
      setCreateError(null);
      setSuccessMessage(null);
      await financialService.createExpense(payload);
      setShowCreateModal(false);
      setCreateForm({ amount: 0, description: "", expenseCategory: "LAIN_LAIN" });
      setCreateError(null);
      await fetchExpenses();
      setSuccessMessage("Pengeluaran berhasil dicatat.");
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message);
      } else {
        setCreateError("Gagal membuat pengeluaran.");
      }
      console.error("Gagal membuat pengeluaran:", err);
    }
  };

  const handleOpenDetailModal = (expense: FinancialRecord) => {
    setSelectedExpense(expense);
    setShowDetailModal(true);
  };

  const handleOpenEditModal = (expense: FinancialRecord) => {
    setSelectedExpense(expense);
    setEditError(null);
    setEditForm({
      amount: expense.amount,
      description: expense.description,
      expenseCategory: expense.expenseCategory || "LAIN_LAIN",
      assetId:
        expense.expenseCategory === "ASSET_REPAIR"
          ? expense.asset?.id
          : undefined,
    });
    setShowEditModal(true);
    void fetchAssets();
  };

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedExpense) {
      return;
    }

    const payload: UpdateExpensePayload = {
      amount: editForm.amount,
      description: editForm.description,
      expenseCategory: editForm.expenseCategory,
      ...(editForm.expenseCategory === "ASSET_REPAIR" && editForm.assetId
        ? { assetId: editForm.assetId }
        : {}),
    };

    if (payload.expenseCategory === "ASSET_REPAIR" && !payload.assetId) {
      setEditError("Pilih aset untuk kategori Perbaikan Aset.");
      return;
    }

    if (payload.amount <= 0) {
      setEditError("Nominal pengeluaran harus diisi dan lebih besar dari 0.");
      return;
    }

    try {
      setEditLoading(true);
      setEditError(null);
      setSuccessMessage(null);
      await financialService.updateExpense(selectedExpense.id, payload);
      setShowEditModal(false);
      setSelectedExpense(null);
      await fetchExpenses();
      setSuccessMessage("Pengeluaran berhasil diperbarui.");
    } catch (err) {
      if (err instanceof ApiError) {
        setEditError(err.message);
      } else {
        setEditError("Gagal memperbarui pengeluaran.");
      }
      console.error("Gagal memperbarui pengeluaran:", err);
    } finally {
      setEditLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      searchQuery === "" ||
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expenseCategoryLabel(expense.expenseCategory)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "" ||
      (expense.expenseCategory &&
        expense.expenseCategory.toLowerCase() === statusFilter.toLowerCase());

    const matchesPeriod =
      periodFilter === "" || getExpenseMonthKey(expense.date) === periodFilter;

    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const availablePeriods = Array.from(
    new Set(
      expenses
        .map((expense) => getExpenseMonthKey(expense.date))
        .filter((value) => value !== ""),
    ),
  ).sort((left, right) => right.localeCompare(left));

  const totalExpenseAmount = filteredExpenses.reduce(
    (total, expense) => total + expense.amount,
    0,
  );
  const topExpenseCategories = Object.values(
    filteredExpenses.reduce(
      (categories, expense) => {
        const category = expense.expenseCategory || "LAIN_LAIN";
        const currentCategory = categories[category] || {
          category,
          totalAmount: 0,
          count: 0,
        };

        currentCategory.totalAmount += expense.amount;
        currentCategory.count += 1;
        categories[category] = currentCategory;

        return categories;
      },
      {} as Record<
        ExpenseCategory,
        { category: ExpenseCategory; totalAmount: number; count: number }
      >,
    ),
  )
    .sort((left, right) => right.totalAmount - left.totalAmount)
    .slice(0, 3);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Memuat data pengeluaran...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-rose-700">{error}</p>
          <button
            onClick={fetchExpenses}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >Try Again</button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Pengeluaran</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 md:text-base">
            Catat biaya operasional dan perbaikan aset agar pengeluaran per
            kamar serta tindak lanjut maintenance mudah dipantau.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setSuccessMessage(null);
              setShowCreateModal(true);
              fetchAssets();
            }}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Catat Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSuccessMessage(null);
              void fetchExpenses();
              void fetchAssets();
            }}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
          >Reload</button>
        </div>
      </header>

      {successMessage && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p>{successMessage}</p>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-emerald-200 bg-white text-xs font-semibold text-emerald-700"
            aria-label="Tutup notifikasi"
          >
            x
          </button>
        </div>
      )}

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Ringkasan Pengeluaran
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Total pengeluaran dan 3 kategori terbesar pada filter aktif
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Total Pengeluaran
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Akumulasi nominal sesuai filter aktif
          </p>
          <div className="mt-6 flex flex-1 items-end">
            <p className="text-2xl font-semibold tabular-nums text-rose-700">
              {formatCurrency(totalExpenseAmount)}
            </p>
          </div>
        </article>

          {Array.from({ length: 3 }, (_, index) => {
            const category = topExpenseCategories[index];

            if (!category) {
              return (
                <article
                  key={`top-category-empty-${index + 1}`}
                  className="flex min-h-40 flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Top {index + 1}
                  </span>
                  <div className="mt-6 flex flex-1 items-end">
                    <div>
                      <p className="text-lg font-semibold text-gray-400">
                        -
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium">Belum ada data</p>
                    <p className="mt-1 text-xs leading-5">
                      Tambahkan atau ubah filter untuk melihat kategori teratas.
                    </p>
                  </div>
                </article>
              );
            }

            const percentage =
              totalExpenseAmount > 0
                ? (category.totalAmount / totalExpenseAmount) * 100
                : 0;

            return (
              <article
                key={category.category}
                className="flex min-h-40 flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Top {index + 1}
                </span>

                <div className="mt-6 min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800">
                    {expenseCategoryLabel(category.category)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {category.count} transaksi ({percentage.toFixed(1)}%)
                  </p>
                </div>

                <div className="mt-auto pt-6">
                  <p className="text-lg font-semibold tabular-nums text-rose-700">
                    {formatCurrency(category.totalAmount)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-1 xl:col-span-2">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Pencarian
            </span>
            <input
              type="text"
              placeholder="Cari deskripsi atau kategori"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Kategori
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="">Semua Kategori</option>
              {EXPENSE_CATEGORY_OPTIONS.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Periode
            </span>
            <select
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="">Semua Periode</option>
              {availablePeriods.map((period) => (
                <option key={period} value={period}>
                  {formatMonthLabel(period)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("");
                setPeriodFilter("");
              }}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Date</th>
                <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Kategori
                </th>
                <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Description</th>
                <th className="border-r border-gray-200 px-4 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Nominal
                </th>
                <th className="w-44 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Tidak ada pengeluaran yang cocok dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-gray-200 transition hover:bg-gray-50"
                  >
                    <td className="border-r border-gray-200 px-4 py-3 align-top text-sm text-gray-700">
                      {formatDate(expense.date)}
                    </td>
                    <td className="border-r border-gray-200 px-4 py-3 align-top">
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                        {expenseCategoryLabel(expense.expenseCategory)}
                      </span>
                    </td>
                    <td className="border-r border-gray-200 px-4 py-3 align-top">
                      <p className="text-sm text-gray-700">
                        {expense.description}
                      </p>
                    </td>
                    <td className="border-r border-gray-200 px-4 py-3 align-top text-right font-semibold tabular-nums text-rose-700">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="grid w-full grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(expense)}
                          className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                        >Detail</button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(expense)}
                          className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-blue-600 px-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                        >Edit</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-4 lg:hidden">
          {filteredExpenses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              Tidak ada pengeluaran yang cocok dengan filter saat ini.
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <article
                key={expense.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {expenseCategoryLabel(expense.expenseCategory)}
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-rose-700">
                    {formatCurrency(expense.amount)}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <p className="text-gray-600">Date</p>
                  <p className="text-right text-gray-900">
                    {formatDate(expense.date)}
                  </p>
                  <p className="text-gray-600">Kategori</p>
                  <p className="text-right text-gray-900">
                    {expenseCategoryLabel(expense.expenseCategory)}
                  </p>
                </div>

                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Description</p>
                  <p className="mt-2 text-sm text-gray-700">
                    {expense.description}
                  </p>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenDetailModal(expense)}
                    className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                  >Detail</button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(expense)}
                    className="inline-flex h-8 flex-1 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >Edit</button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Detail Expense Modal */}
      {showDetailModal && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Detail Pengeluaran
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedExpense(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l8 8M6 14l8-8" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Date</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {formatDate(selectedExpense.date)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Kategori
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {expenseCategoryLabel(selectedExpense.expenseCategory)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Nominal
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-rose-700">
                    {formatCurrency(selectedExpense.amount)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Aset Terkait
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {selectedExpense.asset
                      ? `${selectedExpense.asset.name} (${selectedExpense.asset.room.name})`
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Description</p>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {selectedExpense.description}
                </p>
              </div>

              <p className="text-xs text-gray-500">
                Dibuat: {formatDateTime(selectedExpense.createdAt)} |
                Diperbarui: {formatDateTime(selectedExpense.updatedAt)}
              </p>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedExpense(null);
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >Close</button>
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  handleOpenEditModal(selectedExpense);
                }}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Edit Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditModal && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Pengeluaran
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditError(null);
                  setShowEditModal(false);
                  setSelectedExpense(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l8 8M6 14l8-8" />
                </svg>
              </button>
            </div>

            {editError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kategori
                </label>
                <select
                  value={editForm.expenseCategory}
                  onChange={(e) => {
                    const nextCategory = e.target
                      .value as UpdateExpensePayload["expenseCategory"];
                    setEditForm((prev) => ({
                      ...prev,
                      expenseCategory: nextCategory,
                      assetId:
                        nextCategory === "ASSET_REPAIR"
                          ? prev.assetId
                          : undefined,
                    }));
                    setEditError(null);
                  }}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                >
                  {EXPENSE_CATEGORY_OPTIONS.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {editForm.expenseCategory === "ASSET_REPAIR" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pilih Aset
                  </label>
                  <select
                    value={editForm.assetId || ""}
                    onChange={(e) => {
                      setEditForm({ ...editForm, assetId: e.target.value });
                      setEditError(null);
                    }}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    required
                    disabled={assetsLoading || availableAssets.length === 0}
                  >
                    <option value="">
                      {assetsLoading
                        ? "Memuat daftar aset..."
                        : "Pilih aset..."}
                    </option>
                    {availableAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} - {asset.roomName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nominal
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    Rp.
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatRupiahInput(String(editForm.amount))}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      setEditForm({
                        ...editForm,
                        amount: digitsOnly ? Number(digitsOnly) : 0,
                      });
                    }}
                    placeholder="0"
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  placeholder="Deskripsi pengeluaran..."
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditError(null);
                    setShowEditModal(false);
                    setSelectedExpense(null);
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Expense Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Catat Pengeluaran
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l8 8M6 14l8-8" />
                </svg>
              </button>
            </div>

            {createError && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kategori
                </label>
                <select
                  value={createForm.expenseCategory}
                  onChange={(e) => {
                    const nextCategory = e.target
                      .value as CreateExpensePayload["expenseCategory"];
                    setCreateForm((prev) => ({
                      ...prev,
                      expenseCategory: nextCategory,
                      assetId:
                        nextCategory === "ASSET_REPAIR"
                          ? prev.assetId
                          : undefined,
                    }));
                    setCreateError(null);
                  }}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                >
                  {EXPENSE_CATEGORY_OPTIONS.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {createForm.expenseCategory === "ASSET_REPAIR" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pilih Aset
                  </label>
                  <select
                    value={createForm.assetId || ""}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, assetId: e.target.value });
                      setCreateError(null);
                    }}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    required
                    disabled={assetsLoading || availableAssets.length === 0}
                  >
                    <option value="">
                      {assetsLoading
                        ? "Memuat daftar aset..."
                        : "Pilih aset..."}
                    </option>
                    {availableAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} - {asset.roomName}
                      </option>
                    ))}
                  </select>
                  {!assetsLoading && availableAssets.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      Belum ada aset terdaftar. Tambahkan aset dulu di menu
                      Kamar.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nominal
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    Rp.
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatRupiahInput(String(createForm.amount))}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      setCreateForm({
                        ...createForm,
                        amount: digitsOnly ? Number(digitsOnly) : 0,
                      });
                    }}
                    placeholder="0"
                    className="block w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Deskripsi pengeluaran..."
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCreateError(null);
                    setShowCreateModal(false);
                  }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                >Cancel</button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
