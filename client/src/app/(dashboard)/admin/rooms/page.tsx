"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { CrudModal } from "@/components/ui/CrudModal";
import { assetMastersService } from "@/features/assets/services/asset-masters.service";
import type { AssetMaster } from "@/features/assets/types/assets";
import { roomsService } from "@/features/rooms/services/rooms.service";
import type {
  AssetStatus,
  MaintenanceStatus,
  PaymentMethod,
  PaymentStatus,
  RoomDetail,
  RoomDetailAsset,
  RoomListItem,
  RoomPayment,
  RoomStatus,
} from "@/features/rooms/types/rooms";
import { ApiError } from "@/lib/api/client";

type RoomStatusFilter = "ALL" | RoomStatus;
type AssetConditionFilter = "ALL" | "NORMAL" | "NEEDS_ATTENTION" | "WITHOUT_ASSETS";
type PaymentHistoryFilter = "ALL" | "WITH_HISTORY" | "WITHOUT_HISTORY";

type CreateRoomAssetDraft = {
  assetMasterId: string;
  assetMasterName: string;
  selected: boolean;
  name: string;
  details: string;
};

type CreateRoomForm = {
  name: string;
  price: string;
  assets: CreateRoomAssetDraft[];
};

type EditRoomAssetDraft = {
  id?: string;
  assetMasterId: string;
  assetMasterName: string;
  selected: boolean;
  name: string;
  details: string;
  isExisting: boolean;
};

type EditRoomForm = {
  name: string;
  price: string;
  status: RoomStatus;
  assets: EditRoomAssetDraft[];
};

type DetailViewTab = "ASSETS" | "PAYMENTS";

function buildCreateRoomForm(assetMasters: AssetMaster[]): CreateRoomForm {
  return {
    name: "",
    price: "",
    assets: assetMasters.map((assetMaster) => ({
      assetMasterId: assetMaster.id,
      assetMasterName: assetMaster.name,
      selected: false,
      name: "",
      details: "",
    })),
  };
}


function buildEditRoomForm(room: RoomListItem, assetMasters: AssetMaster[]): EditRoomForm {
  return {
    name: room.name,
    price: formatPriceInput(String(room.price)),
    status: room.status,
    assets: assetMasters.map((assetMaster) => {
      // Find if the room already has an asset for this assetMaster
      const existingAsset = room.assets.find(
        (a) => a.assetMasterId === assetMaster.id
      );

      if (existingAsset) {
        return {
          id: existingAsset.id,
          assetMasterId: assetMaster.id,
          assetMasterName: assetMaster.name,
          selected: true,
          isExisting: true,
          name: existingAsset.name,
          details: existingAsset.details,
        };
      }

      return {
        assetMasterId: assetMaster.id,
        assetMasterName: assetMaster.name,
        selected: false,
        isExisting: false,
        name: "",
        details: "",
      };
    }),
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Terjadi kesalahan saat memproses data kamar.";
}

function formatCurrency(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function normalizePriceInput(value: string) {
  return value.replace(/\D/g, "");
}

function formatPriceInput(value: string) {
  const normalized = normalizePriceInput(value);

  if (!normalized) {
    return "";
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Number(normalized));
}

function parsePriceInput(value: string) {
  const normalized = normalizePriceInput(value);

  if (!normalized) {
    return Number.NaN;
  }

  return Number(normalized);
}

function formatDate(value: string | null) {
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

function formatDateRange(start: string, end: string) {
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function roomStatusLabel(status: RoomStatus) {
  if (status === "OCCUPIED") {
    return "Occupied";
  }

  return "Vacant";
}

function roomStatusBadgeClass(status: RoomStatus) {
  if (status === "OCCUPIED") {
    return "bg-emerald-100 text-emerald-800";
  }

  return "bg-gray-100 text-gray-700";
}

function assetStatusLabel(status: AssetStatus) {
  if (status === "GOOD") {
    return "Baik";
  }

  if (status === "MAINTENANCE") {
    return "Maintenance";
  }

  return "Rusak";
}

function assetStatusBadgeClass(status: AssetStatus) {
  if (status === "GOOD") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "MAINTENANCE") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-rose-100 text-rose-800";
}

function maintenanceStatusLabel(status: MaintenanceStatus) {
  if (status === "PROCESS") {
    return "Process";
  }

  if (status === "PENDING") {
    return "Menunggu";
  }

  return "Done";
}

function maintenanceStatusBadgeClass(status: MaintenanceStatus) {
  if (status === "PROCESS") {
    return "bg-amber-100 text-amber-800";
  }

  if (status === "PENDING") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-emerald-100 text-emerald-800";
}

function paymentStatusLabel(status: PaymentStatus) {
  if (status === "PAID") {
    return "Lunas";
  }

  if (status === "NOT_FULLY_PAID") {
    return "Cicilan";
  }

  return "Belum Bayar";
}

function paymentStatusBadgeClass(status: PaymentStatus) {
  if (status === "PAID") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "NOT_FULLY_PAID") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-rose-100 text-rose-800";
}

function paymentMethodLabel(method: PaymentMethod | null) {
  if (method === "E_WALLET") {
    return "E-Wallet";
  }

  if (method === "QRIS") {
    return "QRIS";
  }

  if (method === "TRANSFER") {
    return "Transfer";
  }

  if (method === "CASH") {
    return "Cash";
  }

  return "-";
}

function getRoomAssetSummary(room: Pick<RoomListItem, "assets">) {
  const totalAssets = room.assets.length;
  const goodAssets = room.assets.filter((asset) => asset.status === "GOOD").length;
  const maintenanceAssets = room.assets.filter(
    (asset) => asset.status === "MAINTENANCE",
  ).length;
  const brokenAssets = room.assets.filter((asset) => asset.status === "BROKEN").length;

  return {
    totalAssets,
    goodAssets,
    maintenanceAssets,
    brokenAssets,
    needsAttention: maintenanceAssets + brokenAssets,
  };
}

function buildRoomSearchIndex(room: RoomListItem) {
  return [
    room.name,
    room.activeOccupant?.name ?? "",
    room.activeOccupant?.email ?? "",
    ...room.assets.map((asset) => asset.name),
    ...room.assets.map((asset) => asset.assetMaster.name),
  ]
    .join(" ")
    .toLowerCase();
}

function getLatestMaintenanceLog(asset: RoomDetailAsset) {
  if (asset.maintenanceLog.length === 0) {
    return null;
  }

  return asset.maintenanceLog[asset.maintenanceLog.length - 1];
}

function getOpenMaintenanceCount(asset: RoomDetailAsset) {
  return asset.maintenanceLog.filter((log) => log.status !== "FINISHED").length;
}

function getPaymentProgress(payment: RoomPayment) {
  if (payment.priceApplied <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((payment.paidNominal / payment.priceApplied) * 100));
}

function getAssetHealthPercentage(summary: ReturnType<typeof getRoomAssetSummary>) {
  if (summary.totalAssets <= 0) {
    return 0;
  }

  return Math.round((summary.goodAssets / summary.totalAssets) * 100);
}

function getAssetDisplayName(assetName: string, roomName: string) {
  const suffix = ` - ${roomName}`;

  if (roomName && assetName.endsWith(suffix)) {
    return assetName.slice(0, -suffix.length).trimEnd();
  }

  return assetName;
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [assetMasters, setAssetMasters] = useState<AssetMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [roomStatusFilter, setRoomStatusFilter] = useState<RoomStatusFilter>("ALL");
  const [assetConditionFilter, setAssetConditionFilter] =
    useState<AssetConditionFilter>("ALL");
  const [paymentHistoryFilter, setPaymentHistoryFilter] =
    useState<PaymentHistoryFilter>("ALL");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editRoomId, setEditRoomId] = useState<string | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateRoomForm>(buildCreateRoomForm([]));
  const [editForm, setEditForm] = useState<EditRoomForm>({
    name: "",
    price: "",
    status: "VACANT",
    assets: [],
  });

  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteError, setDeleteError] = useState("");


  const loadData = async () => {
    try {
      const [roomsResponse, assetMastersResponse] = await Promise.all([
        roomsService.getAll(),
        assetMastersService.getAll(),
      ]);

      setRooms(roomsResponse.rooms);
      setAssetMasters(assetMastersResponse.assetMasters);
      setFetchError("");
    } catch (error) {
      setFetchError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);


  const filteredRooms = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    let data = [...rooms];

    if (normalizedQuery) {
      data = data.filter((room) => buildRoomSearchIndex(room).includes(normalizedQuery));
    }

    if (roomStatusFilter !== "ALL") {
      data = data.filter((room) => room.status === roomStatusFilter);
    }

    if (assetConditionFilter === "NORMAL") {
      data = data.filter((room) => {
        const summary = getRoomAssetSummary(room);
        return summary.totalAssets > 0 && summary.needsAttention === 0;
      });
    }

    if (assetConditionFilter === "NEEDS_ATTENTION") {
      data = data.filter((room) => getRoomAssetSummary(room).needsAttention > 0);
    }

    if (assetConditionFilter === "WITHOUT_ASSETS") {
      data = data.filter((room) => room.assets.length === 0);
    }

    if (paymentHistoryFilter === "WITH_HISTORY") {
      data = data.filter((room) => room._count.payments > 0);
    }

    if (paymentHistoryFilter === "WITHOUT_HISTORY") {
      data = data.filter((room) => room._count.payments === 0);
    }

    data.sort((left, right) => left.name.localeCompare(right.name, "id"));

    return data;
  }, [assetConditionFilter, paymentHistoryFilter, roomStatusFilter, rooms, searchQuery]);

  const editRoom = useMemo(
    () => rooms.find((room) => room.id === editRoomId) ?? null,
    [editRoomId, rooms],
  );

  const deleteRoom = useMemo(
    () => rooms.find((room) => room.id === deleteRoomId) ?? null,
    [deleteRoomId, rooms],
  );


  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((room) => room.status === "OCCUPIED").length;
  const vacantRooms = rooms.filter((room) => room.status === "VACANT").length;
  const totalAssets = rooms.reduce((total, room) => total + room.assets.length, 0);
  const assetsNeedAttention = rooms.reduce(
    (total, room) => total + getRoomAssetSummary(room).needsAttention,
    0,
  );

  const handleResetFilters = () => {
    setSearchQuery("");
    setRoomStatusFilter("ALL");
    setAssetConditionFilter("ALL");
    setPaymentHistoryFilter("ALL");
  };


  const updateCreateAssetDraft = (
    assetMasterId: string,
    updater: (current: CreateRoomAssetDraft) => CreateRoomAssetDraft,
  ) => {
    setCreateForm((previous) => ({
      ...previous,
      assets: previous.assets.map((asset) =>
        asset.assetMasterId === assetMasterId ? updater(asset) : asset,
      ),
    }));
  };

  const updateEditAssetDraft = (
    assetMasterId: string,
    updater: (current: EditRoomAssetDraft) => EditRoomAssetDraft,
  ) => {
    setEditForm((previous) => ({
      ...previous,
      assets: previous.assets.map((asset) =>
        asset.assetMasterId === assetMasterId ? updater(asset) : asset,
      ),
    }));
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    setFeedbackMessage("");

    const name = createForm.name.trim();
    const price = parsePriceInput(createForm.price);

    if (!name) {
      setCreateError("Nama kamar wajib diisi.");
      return;
    }

    if (Number.isNaN(price)) {
      setCreateError("Harga kamar wajib berupa angka.");
      return;
    }

    const selectedAssets = createForm.assets.filter((asset) => asset.selected);
    const invalidAsset = selectedAssets.find(
      (asset) => !asset.name.trim() || !asset.details.trim(),
    );

    if (invalidAsset) {
      setCreateError(
        `Lengkapi nama aset dan detail untuk jenis aset ${invalidAsset.assetMasterName}.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name,
        price,
        assets: selectedAssets.map((asset) => ({
          assetMasterId: asset.assetMasterId,
          name: asset.name.trim(),
          details: asset.details.trim(),
        })),
      };

      const response = await roomsService.create(
        payload.assets.length > 0 ? payload : { name, price },
      );

      setFeedbackMessage(response.message);
      setCreateForm(buildCreateRoomForm(assetMasters));
      setIsCreateModalOpen(false);
      setIsLoading(true);
      await loadData();
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editRoom) {
      return;
    }

    setEditError("");
    setFeedbackMessage("");

    const name = editForm.name.trim();
    const price = parsePriceInput(editForm.price);

    if (!name) {
      setEditError("Nama kamar wajib diisi.");
      return;
    }

    if (Number.isNaN(price)) {
      setEditError("Harga kamar wajib berupa angka.");
      return;
    }

    const selectedAssets = editForm.assets.filter((asset) => asset.selected);
    const invalidAsset = selectedAssets.find(
      (asset) => !asset.name.trim() || !asset.details.trim(),
    );

    if (invalidAsset) {
      setEditError(
        `Lengkapi nama aset dan detail untuk jenis aset ${invalidAsset.assetMasterName}.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await roomsService.update(editRoom.id, {
        name,
        price,
        status: editForm.status,
        assets: selectedAssets.map((asset) => ({
          ...(asset.id ? { id: asset.id } : {}),
          assetMasterId: asset.assetMasterId,
          name: asset.name.trim(),
          details: asset.details.trim(),
        })),
      });

      setFeedbackMessage(response.message);
      setEditRoomId(null);
      setIsLoading(true);
      await loadData();
    } catch (error) {
      setEditError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRoom || deleteRoom._count.invoices > 0) {
      return;
    }

    setDeleteError("");
    setFeedbackMessage("");
    setIsSubmitting(true);

    try {
      const response = await roomsService.remove(deleteRoom.id);
      setFeedbackMessage(response.message);
      setDeleteRoomId(null);
      setIsLoading(true);
      await loadData();
    } catch (error) {
      setDeleteError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Manajemen Kamar</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 md:text-base">
            Pantau ketersediaan kamar, detail aset terpasang, dan akses cepat ke
            riwayat pembayaran setiap kamar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFeedbackMessage("");
                setCreateError("");
                setCreateForm(buildCreateRoomForm(assetMasters));
                setIsCreateModalOpen(true);
              }}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Tambah Kamar
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setFetchError("");
                void loadData();
              }}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >Reload</button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Total Kamar
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {totalRooms}
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Kamar Terisi
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {occupiedRooms}
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Kamar Kosong
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {vacantRooms}
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Total Aset
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {totalAssets}
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Aset Perlu Perhatian
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {assetsNeedAttention}
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="flex flex-col gap-1 xl:col-span-2">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Cari Kamar
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
              }}
              placeholder="Cari nama kamar atau nama aset"
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Status Kamar
            </span>
            <select
              value={roomStatusFilter}
              onChange={(event) => {
                setRoomStatusFilter(event.target.value as RoomStatusFilter);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="VACANT">Vacant</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Kondisi Aset
            </span>
            <select
              value={assetConditionFilter}
              onChange={(event) => {
                setAssetConditionFilter(event.target.value as AssetConditionFilter);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="ALL">Semua Kondisi</option>
              <option value="NORMAL">Semua Aset Baik</option>
              <option value="NEEDS_ATTENTION">Perlu Perhatian</option>
              <option value="WITHOUT_ASSETS">Belum Ada Aset</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Riwayat Bayar
            </span>
            <select
              value={paymentHistoryFilter}
              onChange={(event) => {
                setPaymentHistoryFilter(event.target.value as PaymentHistoryFilter);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="ALL">All</option>
              <option value="WITH_HISTORY">Sudah Ada Riwayat</option>
              <option value="WITHOUT_HISTORY">Belum Ada Riwayat</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      {fetchError ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {fetchError}
        </section>
      ) : null}

      {feedbackMessage ? (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {feedbackMessage}
        </section>
      ) : null}

      <p className="text-sm text-gray-500">
        Menampilkan <span className="font-semibold text-gray-900">{filteredRooms.length}</span>{" "}
        dari <span className="font-semibold text-gray-900">{rooms.length}</span> kamar.
      </p>

      <section className="space-y-4">
        {isLoading ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="hidden xl:block">
              <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
                <div className="h-4 w-44 animate-pulse rounded-full bg-gray-200" />
              </div>
              <div className="divide-y divide-gray-200">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1.4fr_0.8fr_1.2fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4"
                  >
                    <div className="space-y-2">
                      <div className="h-4 w-28 animate-pulse rounded-full bg-gray-200" />
                      <div className="h-3 w-36 animate-pulse rounded-full bg-gray-100" />
                    </div>
                    <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-4 w-32 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-4 w-24 animate-pulse rounded-full bg-gray-200 justify-self-end" />
                    <div className="h-4 w-24 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-4 w-28 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-200 justify-self-end" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 bg-gray-50 p-4 xl:hidden">
              {Array.from({ length: 3 }).map((_, index) => (
                <article
                  key={index}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="h-4 w-28 animate-pulse rounded-full bg-gray-200" />
                      <div className="h-3 w-24 animate-pulse rounded-full bg-gray-100" />
                      <div className="h-3 w-40 animate-pulse rounded-full bg-gray-100" />
                    </div>
                    <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
                    <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <div className="h-9 flex-1 animate-pulse rounded-lg bg-gray-200" />
                    <div className="h-9 flex-1 animate-pulse rounded-lg bg-gray-200" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500 shadow-sm">
            Tidak ada kamar yang cocok dengan filter.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="hidden overflow-x-auto xl:block">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="border-r border-gray-200 px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Room</th>
                    <th className="border-r border-gray-200 px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Status</th>
                    <th className="border-r border-gray-200 px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Tenant</th>
                    <th className="border-r border-gray-200 px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Harga Sewa
                    </th>
                    <th className="border-r border-gray-200 px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Kondisi Aset
                    </th>
                    <th className="border-r border-gray-200 px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Riwayat Bayar
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRooms.map((room) => {
                    const summary = getRoomAssetSummary(room);
                    const assetHealth = getAssetHealthPercentage(summary);
                    const occupantName = room.activeOccupant?.name ?? room.activeOccupant?.email;

                    return (
                      <tr
                        key={room.id}
                        className="align-top transition-colors hover:bg-gray-50"
                      >
                        <td className="border-r border-gray-200 px-5 py-4">
                          <p className="font-semibold text-gray-900">{room.name}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {summary.totalAssets} aset terdata
                          </p>
                        </td>
                        <td className="border-r border-gray-200 px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${roomStatusBadgeClass(
                              room.status,
                            )}`}
                          >
                            {roomStatusLabel(room.status)}
                          </span>
                        </td>
                        <td className="border-r border-gray-200 px-5 py-4 text-sm text-gray-900">
                          {room.status === "OCCUPIED" ? (
                            <>
                              <p className="font-medium text-gray-900">
                                {occupantName ?? "Data penghuni belum tersedia"}
                              </p>
                              {room.activeOccupant?.email ? (
                                <p className="mt-1 text-xs text-gray-500">
                                  {room.activeOccupant.email}
                                </p>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-gray-500">Belum ada</span>
                          )}
                        </td>
                        <td className="border-r border-gray-200 px-5 py-4 text-right text-sm font-semibold tabular-nums text-gray-900">
                          {formatCurrency(room.price)}
                        </td>
                        <td className="border-r border-gray-200 px-5 py-4">
                          {summary.totalAssets === 0 ? (
                            <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                              Belum Ada Aset
                            </span>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="font-semibold tabular-nums text-gray-900">
                                  {assetHealth}% baik
                                </span>
                                <span className="text-gray-500">
                                  {summary.totalAssets} unit
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className="h-full rounded-full bg-emerald-500"
                                  style={{ width: `${assetHealth}%` }}
                                />
                              </div>
                              <div className="flex flex-wrap gap-2 text-[11px] font-medium">
                                <span className="text-emerald-700">
                                  {summary.goodAssets} Baik
                                </span>
                                <span className="text-amber-700">
                                  {summary.maintenanceAssets} Maint.
                                </span>
                                <span className="text-rose-700">
                                  {summary.brokenAssets} Rusak
                                </span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="border-r border-gray-200 px-5 py-4">
                          <p className="text-sm font-semibold tabular-nums text-gray-900">
                            {room._count.payments} transaksi
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/admin/rooms/${room.id}`}
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                            >Detail</Link>
                            <button
                              type="button"
                              onClick={() => {
                                setEditError("");
                                setFeedbackMessage("");
                                setEditForm(buildEditRoomForm(room, assetMasters));
                                setEditRoomId(room.id);
                              }}
                              className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                            >Edit</button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError("");
                                setFeedbackMessage("");
                                setDeleteRoomId(room.id);
                              }}
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                            >Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 bg-gray-50 p-4 xl:hidden">
              {filteredRooms.map((room) => {
                const summary = getRoomAssetSummary(room);
                const assetHealth = getAssetHealthPercentage(summary);
                const occupantName = room.activeOccupant?.name ?? room.activeOccupant?.email;

                return (
                  <article
                    key={`${room.id}-mobile`}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-gray-900">{room.name}</p>
                        <p className="mt-1 text-sm font-medium tabular-nums text-gray-600">
                          {formatCurrency(room.price)}
                        </p>
                        <p className="mt-1 text-xs font-medium text-gray-500">
                          {room.status === "OCCUPIED"
                            ? `Penghuni: ${occupantName ?? "Data penghuni belum tersedia"}`
                            : "Penghuni: Belum ada"}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${roomStatusBadgeClass(
                          room.status,
                        )}`}
                      >
                        {roomStatusLabel(room.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <section className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Asset</p>
                          <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                            {summary.totalAssets} unit
                          </span>
                        </div>

                        {summary.totalAssets === 0 ? (
                          <p className="mt-1 text-xs text-gray-500">Tidak ada aset</p>
                        ) : (
                          <div className="mt-1.5">
                            <div className="mb-1 flex justify-between text-[10px] text-gray-600">
                              <span>Kondisi:</span>
                              <span className="font-semibold">{assetHealth}% baik</span>
                            </div>
                            <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${assetHealth}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-emerald-700">
                                {summary.goodAssets} Baik
                              </span>
                              <span className="text-amber-700">
                                {summary.maintenanceAssets} Maint.
                              </span>
                              <span className="text-rose-700">
                                {summary.brokenAssets} Rusak
                              </span>
                            </div>
                          </div>
                        )}
                      </section>

                      <section className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Payment</p>
                        </div>

                        <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
                          {room._count.payments}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">transaksi</p>
                      </section>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Link
                        href={`/admin/rooms/${room.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                      >Detail</Link>
                      <button
                        type="button"
                        onClick={() => {
                          setEditError("");
                          setFeedbackMessage("");
                          setEditForm(buildEditRoomForm(room, assetMasters));
                          setEditRoomId(room.id);
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                      >Edit</button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError("");
                          setFeedbackMessage("");
                          setDeleteRoomId(room.id);
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                      >Delete</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {isCreateModalOpen ? (
        <CrudModal
          title="Tambah Kamar Baru"
          description="Pilih asset master yang ingin dipasang saat kamar dibuat."
          onClose={() => setIsCreateModalOpen(false)}
          maxWidthClass="max-w-4xl"
        >
          <form className="space-y-5" onSubmit={handleCreateSubmit}>
            {createError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {createError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Nama Kamar
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
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  placeholder="Contoh: Kamar 105"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Harga Sewa
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-gray-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={createForm.price}
                    onChange={(event) => {
                      setCreateForm((previous) => ({
                        ...previous,
                        price: formatPriceInput(event.target.value),
                      }));
                    }}
                    required
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white pr-3 pl-11 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    placeholder="1.500.000"
                  />
                </div>
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Aset Awal Kamar</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Centang asset master yang ingin langsung dibuat sebagai aset kamar.
                  </p>
                </div>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                  {createForm.assets.filter((asset) => asset.selected).length} dipilih
                </span>
              </div>

              {createForm.assets.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  Belum ada asset master. Kamar tetap bisa dibuat tanpa aset.
                </div>
              ) : (
                <div className="space-y-3">
                  {createForm.assets.map((asset) => (
                    <div
                      key={asset.assetMasterId}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={asset.selected}
                          onChange={(event) => {
                            updateCreateAssetDraft(asset.assetMasterId, (current) => ({
                              ...current,
                              selected: event.target.checked,
                            }));
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {asset.assetMasterName}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Gunakan jenis aset ini pada kamar baru.
                          </p>
                        </div>
                      </label>

                      {asset.selected ? (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                              Nama Aset
                            </span>
                            <input
                              type="text"
                              value={asset.name}
                              onChange={(event) => {
                                updateCreateAssetDraft(
                                  asset.assetMasterId,
                                  (current) => ({
                                    ...current,
                                    name: event.target.value,
                                  }),
                                );
                              }}
                              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                              placeholder={`Contoh: ${asset.assetMasterName} Kamar 105`}
                            />
                          </label>

                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Detail</span>
                            <input
                              type="text"
                              value={asset.details}
                              onChange={(event) => {
                                updateCreateAssetDraft(
                                  asset.assetMasterId,
                                  (current) => ({
                                    ...current,
                                    details: event.target.value,
                                  }),
                                );
                              }}
                              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                              placeholder="Deskripsi singkat aset"
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Simpan Kamar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateForm(buildCreateRoomForm(assetMasters));
                  setCreateError("");
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
              >
                Reset Form
              </button>
            </div>
          </form>
        </CrudModal>
      ) : null}

      {editRoom ? (
        <CrudModal
          title="Edit Kamar"
          description="Status kamar sekarang dihitung otomatis dari okupansi aktif. Edit kamar hanya mengubah nama dan harga."
          onClose={() => setEditRoomId(null)}
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
                  Nama Kamar
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
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Harga Sewa
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-gray-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editForm.price}
                    onChange={(event) => {
                      setEditForm((previous) => ({
                        ...previous,
                        price: formatPriceInput(event.target.value),
                      }));
                    }}
                    required
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white pr-3 pl-11 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    placeholder="1.500.000"
                  />
                </div>
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Aset Kamar</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Centang asset master yang ingin ditambahkan atau dipertahankan. Hapus centang untuk menghapus aset dari kamar.
                  </p>
                </div>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                  {editForm.assets.filter((asset) => asset.selected).length} dipilih
                </span>
              </div>

              {editForm.assets.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  Belum ada asset master. Kamar tetap bisa diedit tanpa aset.
                </div>
              ) : (
                <div className="space-y-3">
                  {editForm.assets.map((asset) => (
                    <div
                      key={asset.assetMasterId}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={asset.selected}
                          onChange={(event) => {
                            updateEditAssetDraft(asset.assetMasterId, (current) => ({
                              ...current,
                              selected: event.target.checked,
                            }));
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {asset.assetMasterName}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Gunakan jenis aset ini pada kamar.
                          </p>
                        </div>
                      </label>

                      {asset.selected ? (
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                              Nama Aset
                            </span>
                            <input
                              type="text"
                              value={asset.name}
                              onChange={(event) => {
                                updateEditAssetDraft(
                                  asset.assetMasterId,
                                  (current) => ({
                                    ...current,
                                    name: event.target.value,
                                  }),
                                );
                              }}
                              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                              placeholder={`Contoh: ${asset.assetMasterName} Kamar 105`}
                            />
                          </label>

                          <label className="flex flex-col gap-1">
                            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Detail</span>
                            <input
                              type="text"
                              value={asset.details}
                              onChange={(event) => {
                                updateEditAssetDraft(
                                  asset.assetMasterId,
                                  (current) => ({
                                    ...current,
                                    details: event.target.value,
                                  }),
                                );
                              }}
                              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                              placeholder="Deskripsi singkat aset"
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditRoomId(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
              >Close</button>
            </div>
          </form>
        </CrudModal>
      ) : null}

      {deleteRoom ? (
        <CrudModal
          title="Hapus Kamar"
          description="Penghapusan hanya diizinkan jika kamar belum punya tagihan."
          onClose={() => setDeleteRoomId(null)}
          maxWidthClass="max-w-xl"
        >
          <div className="space-y-4">
            {deleteError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {deleteError}
              </div>
            ) : null}

            <p className="text-sm text-gray-700">
              Anda akan menghapus kamar{" "}
              <span className="font-semibold text-gray-900">{deleteRoom.name}</span>.
            </p>

            {deleteRoom._count.invoices > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Kamar ini sudah memiliki{" "}
                <span className="font-semibold tabular-nums">
                  {deleteRoom._count.invoices}
                </span>{" "}
                tagihan, jadi backend akan menolak penghapusan.
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                Kamar ini belum memiliki tagihan. Seluruh aset terkait juga
                akan ikut terhapus sesuai proses backend.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={deleteRoom._count.invoices > 0 || isSubmitting}
                onClick={() => {
                  void handleDeleteConfirm();
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteRoomId(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
              >Cancel</button>
            </div>
          </div>
        </CrudModal>
      ) : null}
    </section>
  );
}
