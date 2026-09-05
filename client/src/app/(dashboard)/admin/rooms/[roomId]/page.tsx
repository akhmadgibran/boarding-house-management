"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { roomsService } from "@/features/rooms/services/rooms.service";
import { PaymentService } from "@/features/payments/services/payment.service";
import { PaymentHistoryTable } from "@/features/payments/components/PaymentHistoryTable";
import { AssetMaintenanceModal } from "@/features/assets/components/AssetMaintenanceModal";
import type {
  RoomDetail,
  RoomListItem,
} from "@/features/rooms/types/rooms";
import type { PaymentTransactionRecord } from "@/features/payments/types/payments";
import { ApiError } from "@/lib/api/client";

// Types and helper functions needed for the page
type DetailViewTab = "ASSETS" | "PAYMENTS";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Terjadi kesalahan saat memproses data.";
}

function formatCurrency(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function roomStatusLabel(status: string) {
  if (status === "OCCUPIED") return "Occupied";
  return "Vacant";
}

function roomStatusBadgeClass(status: string) {
  if (status === "OCCUPIED") return "bg-emerald-100 text-emerald-800";
  return "bg-gray-100 text-gray-700";
}

function assetStatusLabel(status: string) {
  if (status === "GOOD") return "Baik";
  if (status === "MAINTENANCE") return "Maintenance";
  return "Rusak";
}

function assetStatusBadgeClass(status: string) {
  if (status === "GOOD") return "bg-emerald-100 text-emerald-800";
  if (status === "MAINTENANCE") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function getRoomAssetSummary(room: Pick<RoomListItem, "assets">) {
  const totalAssets = room.assets.length;
  const goodAssets = room.assets.filter((asset) => asset.status === "GOOD").length;
  const maintenanceAssets = room.assets.filter((asset) => asset.status === "MAINTENANCE").length;
  const brokenAssets = room.assets.filter((asset) => asset.status === "BROKEN").length;

  return {
    totalAssets,
    goodAssets,
    maintenanceAssets,
    brokenAssets,
    needsAttention: maintenanceAssets + brokenAssets,
  };
}

function getAssetHealthPercentage(summary: ReturnType<typeof getRoomAssetSummary>) {
  if (summary.totalAssets <= 0) return 0;
  return Math.round((summary.goodAssets / summary.totalAssets) * 100);
}

function getAssetDisplayName(assetName: string, roomName: string) {
  const suffix = ` - ${roomName}`;
  if (roomName && assetName.endsWith(suffix)) {
    return assetName.slice(0, -suffix.length).trimEnd();
  }
  return assetName;
}

export default function RoomDetailPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const [detailRoom, setDetailRoom] = useState<RoomDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState("");
  const [detailViewTab, setDetailViewTab] = useState<DetailViewTab>("ASSETS");

  // Transaction-based payment history state
  const [transactions, setTransactions] = useState<PaymentTransactionRecord[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [transactionsPagination, setTransactionsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // State for the maintenance modal
  const [selectedAssetForMaintenance, setSelectedAssetForMaintenance] = useState<string | null>(null);

  const loadRoomDetail = useCallback(async () => {
    setIsDetailLoading(true);
    try {
      const response = await roomsService.getById(roomId);
      setDetailRoom(response.room);
      setDetailError("");
    } catch (error) {
      setDetailError(getErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  }, [roomId]);

  const fetchTransactions = useCallback(
    async (page: number) => {
      setIsTransactionsLoading(true);
      try {
        const result = await PaymentService.getPaymentTransactions({
          page,
          limit: 10,
          roomId,
        });
        setTransactions(result.transactions);
        setTransactionsPagination(result.meta);
      } catch (error) {
        console.error("Failed to fetch room payment transactions:", error);
      } finally {
        setIsTransactionsLoading(false);
      }
    },
    [roomId],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRoomDetail();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadRoomDetail]);

  // Load transactions when switching to PAYMENTS tab
  useEffect(() => {
    if (detailViewTab === "PAYMENTS") {
      const timeoutId = window.setTimeout(() => {
        void fetchTransactions(1);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [detailViewTab, fetchTransactions]);

  const handleTransactionPageChange = (newPage: number) => {
    fetchTransactions(newPage);
  };

  const detailAssetSummary = detailRoom ? getRoomAssetSummary(detailRoom) : null;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2">
            <Link
              href="/admin/rooms"
              className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              &larr; Kembali ke Daftar Kamar
            </Link>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Detail Kamar {detailRoom ? `- ${detailRoom.name}` : ""}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 md:text-base">
            Pantau aset kamar dan riwayat pembayaran secara terpisah.
          </p>
        </div>
      </header>

      {isDetailLoading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
                <div className="h-3 w-20 animate-pulse rounded-full bg-gray-200" />
                <div className="mt-3 h-4 w-24 animate-pulse rounded-full bg-gray-200" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-1">
            <div className="grid grid-cols-2 gap-1">
              <div className="h-9 animate-pulse rounded-lg bg-white" />
              <div className="h-9 animate-pulse rounded-lg bg-gray-200" />
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="hidden divide-y divide-gray-200 xl:block">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="grid grid-cols-6 gap-4 px-5 py-4">
                  <div className="h-4 animate-pulse rounded-full bg-gray-200" />
                  <div className="h-4 animate-pulse rounded-full bg-gray-200" />
                  <div className="h-5 animate-pulse rounded-full bg-gray-200" />
                  <div className="h-5 animate-pulse rounded-full bg-gray-200" />
                  <div className="h-4 animate-pulse rounded-full bg-gray-200" />
                  <div className="h-4 animate-pulse rounded-full bg-gray-200" />
                </div>
              ))}
            </div>
            <div className="space-y-3 bg-gray-50 p-4 xl:hidden">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="h-4 w-32 animate-pulse rounded-full bg-gray-200" />
                  <div className="mt-3 h-16 animate-pulse rounded-xl bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : detailError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {detailError}
        </div>
      ) : detailRoom && detailAssetSummary ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Room</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{detailRoom.name}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Price</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatCurrency(detailRoom.price)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Status</p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${roomStatusBadgeClass(
                  detailRoom.status,
                )}`}
              >
                {roomStatusLabel(detailRoom.status)}
              </span>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Kondisi Aset
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-gray-900">
                {getAssetHealthPercentage(detailAssetSummary)}%
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Transaksi
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-gray-900">
                {transactionsPagination.total}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setDetailViewTab("ASSETS")}
                className={`inline-flex h-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
                  detailViewTab === "ASSETS"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                Aset & Kondisi
              </button>
              <button
                type="button"
                onClick={() => setDetailViewTab("PAYMENTS")}
                className={`inline-flex h-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
                  detailViewTab === "PAYMENTS"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                Riwayat Pembayaran
              </button>
            </div>
          </div>

          {detailViewTab === "ASSETS" ? (
            <section>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h4 className="text-sm font-semibold text-gray-900">Aset Kamar</h4>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                  {detailRoom.assets.length} aset
                </span>
              </div>

              {detailRoom.assets.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  Belum ada aset pada kamar ini.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="hidden overflow-x-auto xl:block">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Nama Aset
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Status</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Detail</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {detailRoom.assets.map((asset) => {
                          return (
                            <tr
                              key={asset.id}
                              className="align-top transition-colors hover:bg-gray-50"
                            >
                              <td className="px-5 py-4">
                                <p className="font-semibold text-gray-900">
                                  {getAssetDisplayName(asset.name, detailRoom.name)}
                                </p>
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${assetStatusBadgeClass(
                                    asset.status,
                                  )}`}
                                >
                                  {assetStatusLabel(asset.status)}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm text-gray-700">
                                {asset.details}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedAssetForMaintenance(asset.id)}
                                  className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-gray-900 shadow-sm"
                                >
                                  Kelola Maintenance
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 bg-gray-50 p-4 xl:hidden">
                    {detailRoom.assets.map((asset) => {
                      return (
                        <article
                          key={`${asset.id}-mobile`}
                          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {getAssetDisplayName(asset.name, detailRoom.name)}
                              </p>
                            </div>

                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${assetStatusBadgeClass(
                                asset.status,
                              )}`}
                            >
                              {assetStatusLabel(asset.status)}
                            </span>
                          </div>

                          <p className="mt-3 text-sm text-gray-700">{asset.details}</p>

                          <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
                            <button
                              type="button"
                              onClick={() => setSelectedAssetForMaintenance(asset.id)}
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm"
                            >
                              Kelola Maintenance
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h4 className="text-sm font-semibold text-gray-900">Riwayat Transaksi</h4>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                  {transactionsPagination.total} transaksi
                </span>
              </div>

              <PaymentHistoryTable
                transactions={transactions}
                isLoading={isTransactionsLoading}
                pagination={transactionsPagination}
                onPageChange={handleTransactionPageChange}
                embedded={false}
              />
            </section>
          )}
        </div>
      ) : null}

      {/* MODAL MAINTENANCE */}
      {selectedAssetForMaintenance && (
        <AssetMaintenanceModal 
            assetId={selectedAssetForMaintenance} 
            onClose={() => {
                setSelectedAssetForMaintenance(null);
                // Reload room data to reflect asset condition changes if any
                void loadRoomDetail();
            }} 
        />
      )}
    </section>
  );
}
