"use client";

import { type FormEvent, useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { CrudModal } from "@/components/ui/CrudModal";
import { assetMastersService } from "@/features/assets/services/asset-masters.service";
import { roomsService } from "@/features/rooms/services/rooms.service";
import type { RoomListItem, AssetStatus } from "@/features/rooms/types/rooms";
import type { AssetMaster } from "@/features/assets/types/assets";
import { ApiError } from "@/lib/api/client";

type UsageFilter = "ALL" | "USED" | "UNUSED";
type SortFilter = "NAME_ASC" | "USAGE_DESC";

type AssetMasterForm = {
  name: string;
};

const defaultAssetMasterForm: AssetMasterForm = {
  name: "",
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Terjadi kesalahan saat memproses data aset.";
}

function usageBadgeClass(assetCount: number) {
  if (assetCount > 0) {
    return "bg-emerald-100 text-emerald-800";
  }

  return "bg-gray-100 text-gray-700";
}

function usageLabel(assetCount: number) {
  if (assetCount > 0) {
    return "Digunakan";
  }

  return "Belum Dipakai";
}

function assetStatusLabel(status: string) {
  if (status === "GOOD") return "Baik";
  if (status === "MAINTENANCE") return "Maintenance";
  return "Rusak";
}

function assetStatusBadgeClass(status: string) {
  if (status === "GOOD") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "MAINTENANCE") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

export default function AdminAssetsPage() {
  const [assetMasters, setAssetMasters] = useState<AssetMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("ALL");
  const [sortFilter, setSortFilter] = useState<SortFilter>("NAME_ASC");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editAssetMasterId, setEditAssetMasterId] = useState<string | null>(null);
  const [deleteAssetMasterId, setDeleteAssetMasterId] = useState<string | null>(null);
  const [detailAssetMasterId, setDetailAssetMasterId] = useState<string | null>(null);

  const [rooms, setRooms] = useState<RoomListItem[]>([]);

  const [createForm, setCreateForm] = useState<AssetMasterForm>(defaultAssetMasterForm);
  const [editForm, setEditForm] = useState<AssetMasterForm>(defaultAssetMasterForm);

  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const loadAssetMasters = useCallback(async () => {
    try {
      const [mastersResponse, roomsResponse] = await Promise.all([
        assetMastersService.getAll(),
        roomsService.getAll(),
      ]);
      setAssetMasters(mastersResponse.assetMasters);
      setRooms(roomsResponse.rooms);
      setFetchError("");
    } catch (error) {
      setFetchError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAssetMasters();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAssetMasters]);

  const filteredAssetMasters = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    let data = [...assetMasters];

    if (normalizedQuery) {
      data = data.filter((assetMaster) =>
        assetMaster.name.toLowerCase().includes(normalizedQuery),
      );
    }

    if (usageFilter === "USED") {
      data = data.filter((assetMaster) => assetMaster._count.assets > 0);
    }

    if (usageFilter === "UNUSED") {
      data = data.filter((assetMaster) => assetMaster._count.assets === 0);
    }

    if (sortFilter === "USAGE_DESC") {
      data.sort((left, right) => right._count.assets - left._count.assets);
    } else {
      data.sort((left, right) => left.name.localeCompare(right.name, "id"));
    }

    return data;
  }, [assetMasters, searchQuery, sortFilter, usageFilter]);

  const editAssetMaster = useMemo(
    () => assetMasters.find((assetMaster) => assetMaster.id === editAssetMasterId) ?? null,
    [assetMasters, editAssetMasterId],
  );

  const deleteAssetMaster = useMemo(
    () =>
      assetMasters.find((assetMaster) => assetMaster.id === deleteAssetMasterId) ?? null,
    [assetMasters, deleteAssetMasterId],
  );

  const detailAssetMaster = useMemo(
    () => assetMasters.find((assetMaster) => assetMaster.id === detailAssetMasterId) ?? null,
    [assetMasters, detailAssetMasterId],
  );

  const matchingAssets = useMemo(() => {
    if (!detailAssetMasterId) return [];
    return rooms.flatMap((room) =>
      room.assets
        .filter((asset) => asset.assetMasterId === detailAssetMasterId)
        .map((asset) => ({
          ...asset,
          roomName: room.name,
        }))
    );
  }, [rooms, detailAssetMasterId]);

  const totalAssetMasters = assetMasters.length;
  const usedAssetMasters = assetMasters.filter(
    (assetMaster) => assetMaster._count.assets > 0,
  ).length;
  const unusedAssetMasters = assetMasters.filter(
    (assetMaster) => assetMaster._count.assets === 0,
  ).length;
  const totalInstalledAssets = assetMasters.reduce(
    (total, assetMaster) => total + assetMaster._count.assets,
    0,
  );

  const handleResetFilters = () => {
    setSearchQuery("");
    setUsageFilter("ALL");
    setSortFilter("NAME_ASC");
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    setFeedbackMessage("");
    setIsSubmitting(true);

    try {
      const response = await assetMastersService.create({
        name: createForm.name.trim(),
      });

      setFeedbackMessage(response.message);
      setCreateForm(defaultAssetMasterForm);
      setIsCreateModalOpen(false);
      setIsLoading(true);
      await loadAssetMasters();
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editAssetMaster) {
      return;
    }

    setEditError("");
    setFeedbackMessage("");
    setIsSubmitting(true);

    try {
      const response = await assetMastersService.update(editAssetMaster.id, {
        name: editForm.name.trim(),
      });

      setFeedbackMessage(response.message);
      setEditAssetMasterId(null);
      setIsLoading(true);
      await loadAssetMasters();
    } catch (error) {
      setEditError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteAssetMaster || deleteAssetMaster._count.assets > 0) {
      return;
    }

    setDeleteError("");
    setFeedbackMessage("");
    setIsSubmitting(true);

    try {
      const response = await assetMastersService.remove(deleteAssetMaster.id);
      setFeedbackMessage(response.message);
      setDeleteAssetMasterId(null);
      setIsLoading(true);
      await loadAssetMasters();
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
          <h2 className="text-2xl font-semibold text-gray-900">Manajemen Asset Master</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 md:text-base">
            Kelola daftar asset master yang menjadi template aset kamar dan pantau
            pemakaiannya di seluruh properti.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFeedbackMessage("");
                setCreateError("");
                setCreateForm(defaultAssetMasterForm);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Tambah Asset Master
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setFetchError("");
                void loadAssetMasters();
              }}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >Reload</button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Total Master
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {totalAssetMasters}
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Master Dipakai
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {usedAssetMasters}
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Belum Dipakai
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {unusedAssetMasters}
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Total Aset Terpasang
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {totalInstalledAssets}
          </p>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Hasil Filter
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
            {filteredAssetMasters.length}
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-1 xl:col-span-2">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Cari Asset Master
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
              }}
              placeholder="Cari nama asset master"
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Penggunaan
            </span>
            <select
              value={usageFilter}
              onChange={(event) => {
                setUsageFilter(event.target.value as UsageFilter);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="ALL">All</option>
              <option value="USED">Sedang Dipakai</option>
              <option value="UNUSED">Belum Dipakai</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Urutkan
            </span>
            <select
              value={sortFilter}
              onChange={(event) => {
                setSortFilter(event.target.value as SortFilter);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="NAME_ASC">Nama A-Z</option>
              <option value="USAGE_DESC">Penggunaan Terbanyak</option>
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

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            Memuat data asset master...
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Nama Asset Master
                    </th>
                    <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Pemakaian
                    </th>
                    <th className="border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssetMasters.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                        Tidak ada asset master yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAssetMasters.map((assetMaster) => (
                      <tr
                        key={assetMaster.id}
                        className="border-b border-gray-200 transition hover:bg-gray-50"
                      >
                        <td className="border-r border-gray-200 px-4 py-3 align-top">
                          <p className="text-sm font-semibold text-gray-900">
                            {assetMaster.name}
                          </p>
                        </td>
                        <td className="border-r border-gray-200 px-4 py-3 align-top">
                          <p className="text-sm text-gray-900">
                            <span className="tabular-nums">{assetMaster._count.assets}</span>{" "}
                            aset kamar
                          </p>
                        </td>
                        <td className="border-r border-gray-200 px-4 py-3 align-top">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${usageBadgeClass(
                              assetMaster._count.assets,
                            )}`}
                          >
                            {usageLabel(assetMaster._count.assets)}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackMessage("");
                                setDetailAssetMasterId(assetMaster.id);
                              }}
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                            >Detail</button>
                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackMessage("");
                                setEditError("");
                                setEditForm({ name: assetMaster.name });
                                setEditAssetMasterId(assetMaster.id);
                              }}
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                            >Edit</button>
                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackMessage("");
                                setDeleteError("");
                                setDeleteAssetMasterId(assetMaster.id);
                              }}
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                            >Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {filteredAssetMasters.length === 0 ? (
                <article className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
                  Tidak ada asset master yang cocok dengan filter.
                </article>
              ) : (
                filteredAssetMasters.map((assetMaster) => (
                  <article
                    key={`${assetMaster.id}-mobile`}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {assetMaster.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          <span className="tabular-nums">{assetMaster._count.assets}</span> aset
                          kamar
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${usageBadgeClass(
                          assetMaster._count.assets,
                        )}`}
                      >
                        {usageLabel(assetMaster._count.assets)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackMessage("");
                          setDetailAssetMasterId(assetMaster.id);
                        }}
                        className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      >Detail</button>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackMessage("");
                          setEditError("");
                          setEditForm({ name: assetMaster.name });
                          setEditAssetMasterId(assetMaster.id);
                        }}
                        className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                      >Edit</button>
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackMessage("");
                          setDeleteError("");
                          setDeleteAssetMasterId(assetMaster.id);
                        }}
                        className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                      >Delete</button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </>
        )}
      </section>

      {isCreateModalOpen ? (
        <CrudModal
          title="Tambah Asset Master"
          description="Jenis aset baru akan langsung tersedia di form pembuatan kamar."
          onClose={() => setIsCreateModalOpen(false)}
        >
          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            {createError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {createError}
              </div>
            ) : null}

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Nama Asset Master
              </span>
              <input
                type="text"
                value={createForm.name}
                onChange={(event) => {
                  setCreateForm({ name: event.target.value });
                }}
                required
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                placeholder="Contoh: Meja Belajar"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateForm(defaultAssetMasterForm);
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

      {editAssetMaster ? (
        <CrudModal
          title="Edit Asset Master"
          description="Perubahan nama akan memengaruhi label asset master di seluruh sistem."
          onClose={() => setEditAssetMasterId(null)}
        >
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            {editError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {editError}
              </div>
            ) : null}

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Nama Asset Master
              </span>
              <input
                type="text"
                value={editForm.name}
                onChange={(event) => {
                  setEditForm({ name: event.target.value });
                }}
                required
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </label>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Jumlah aset kamar yang sudah memakai jenis ini:{" "}
              <span className="font-semibold tabular-nums text-gray-900">
                {editAssetMaster._count.assets}
              </span>
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
                onClick={() => setEditAssetMasterId(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
              >Close</button>
            </div>
          </form>
        </CrudModal>
      ) : null}

      {deleteAssetMaster ? (
        <CrudModal
          title="Hapus Asset Master"
          description="Asset master hanya bisa dihapus saat tidak lagi dipakai oleh aset kamar."
          onClose={() => setDeleteAssetMasterId(null)}
          maxWidthClass="max-w-xl"
        >
          <div className="space-y-4">
            {deleteError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {deleteError}
              </div>
            ) : null}

            <p className="text-sm text-gray-700">
              Anda akan menghapus asset master{" "}
              <span className="font-semibold text-gray-900">{deleteAssetMaster.name}</span>.
            </p>

            {deleteAssetMaster._count.assets > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Asset master ini masih dipakai oleh{" "}
                <span className="font-semibold tabular-nums">
                  {deleteAssetMaster._count.assets}
                </span>{" "}
                aset di kamar, jadi backend akan menolak penghapusan.
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                Belum ada aset kamar yang memakai jenis ini. Penghapusan aman dilakukan.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={deleteAssetMaster._count.assets > 0 || isSubmitting}
                onClick={() => {
                  void handleDeleteConfirm();
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteAssetMasterId(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
              >Cancel</button>
            </div>
          </div>
        </CrudModal>
      ) : null}

      {detailAssetMasterId && detailAssetMaster ? (
        <CrudModal
          title={`Detail Aset - ${detailAssetMaster.name}`}
          description="Daftar aset aktif yang menggunakan jenis asset master ini."
          onClose={() => setDetailAssetMasterId(null)}
          maxWidthClass="max-w-4xl"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Menampilkan daftar aset di seluruh kamar yang terhubung dengan template ini.
            </p>

            {matchingAssets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                Belum ada aset kamar yang terpasang untuk asset master ini.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nama Aset</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Room</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {matchingAssets.map((asset) => (
                        <tr key={asset.id} className="transition hover:bg-gray-50 align-top">
                          <td className="px-4 py-3 text-sm text-gray-900">{asset.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{asset.roomName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${assetStatusBadgeClass(asset.status)}`}>
                              {assetStatusLabel(asset.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/admin/assets/maintenance/${asset.id}`}
                              className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                            >
                              Kelola
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 bg-gray-50 p-4 lg:hidden">
                  {matchingAssets.map((asset) => (
                    <article key={asset.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{asset.name}</p>
                          <p className="mt-1 text-xs text-gray-500">Kamar: {asset.roomName}</p>
                        </div>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${assetStatusBadgeClass(asset.status)}`}>
                              {assetStatusLabel(asset.status)}
                            </span>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Link
                          href={`/admin/assets/maintenance/${asset.id}`}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
                        >
                          Kelola Maintenance
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailAssetMasterId(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
              >Close</button>
            </div>
          </div>
        </CrudModal>
      ) : null}
    </section>
  );
}
