"use client";

import { type FormEvent, useEffect, useState, useMemo, useCallback } from "react";
import { CrudModal } from "@/components/ui/CrudModal";
import { maintenanceService } from "@/features/assets/services/maintenance.service";
import type {
    AssetMaintenanceLog,
    MaintenanceAssetDetail,
    CreateMaintenanceLogPayload,
    UpdateMaintenanceLogPayload,
} from "@/features/assets/types/maintenance";
import type {
    AssetStatus,
    MaintenanceStatus,
} from "@/features/rooms/types/rooms";
import { ApiError } from "@/lib/api/client";

function AssetIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 3l8 4-8 4-8-4 8-4z" />
            <path d="M4 7v6l8 4 8-4V7" />
        </svg>
    );
}

function getErrorMessage(error: unknown) {
    if (error instanceof ApiError) {
        return error.message;
    }
    return "An error occurred while processing data.";
}

function assetStatusBadgeClass(status: AssetStatus) {
    if (status === "GOOD") return "bg-emerald-100 text-emerald-800";
    if (status === "MAINTENANCE") return "bg-amber-100 text-amber-800";
    return "bg-rose-100 text-rose-800";
}

function assetStatusLabel(status: AssetStatus) {
    if (status === "GOOD") return "Baik";
    if (status === "MAINTENANCE") return "Maintenance";
    return "Rusak";
}

function maintenanceStatusBadgeClass(status: MaintenanceStatus) {
    if (status === "PROCESS" || status === "PENDING")
        return "bg-amber-100 text-amber-800";
    return "bg-emerald-100 text-emerald-800";
}

function maintenanceStatusLabel(status: MaintenanceStatus) {
    if (status === "PENDING") return "Pending";
    if (status === "PROCESS") return "Proses";
    return "Selesai";
}

function formatDate(dateString: string) {
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(dateString));
}

interface AssetMaintenanceModalProps {
    assetId: string;
    onClose: () => void;
}

export function AssetMaintenanceModal({ assetId, onClose }: AssetMaintenanceModalProps) {
    const [assetDetail, setAssetDetail] = useState<MaintenanceAssetDetail | null>(null);
    const [logs, setLogs] = useState<AssetMaintenanceLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fetchError, setFetchError] = useState("");
    const [feedbackMessage, setFeedbackMessage] = useState("");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editLogId, setEditLogId] = useState<string | null>(null);
    const [deleteLogId, setDeleteLogId] = useState<string | null>(null);

    const [formDetails, setFormDetails] = useState("");
    const [formStatus, setFormStatus] = useState<MaintenanceStatus>("PENDING");
    const [formAssetStatus, setFormAssetStatus] = useState<AssetStatus | "">("");

    const [formError, setFormError] = useState("");

    const loadData = useCallback(async () => {
        try {
            const res = await maintenanceService.getLogsByAssetId(assetId);
            setAssetDetail(res.asset);
            setLogs(res.logs);
            setFetchError("");
        } catch (error) {
            setFetchError(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }, [assetId]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadData();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [loadData]);

    const editLog = useMemo(
        () => logs.find((l) => l.id === editLogId) ?? null,
        [logs, editLogId],
    );
    const deleteLog = useMemo(
        () => logs.find((l) => l.id === deleteLogId) ?? null,
        [logs, deleteLogId],
    );

    const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError("");
        setFeedbackMessage("");
        setIsSubmitting(true);

        try {
            const payload: CreateMaintenanceLogPayload = {
                details: formDetails,
                status: formStatus,
            };
            if (formAssetStatus) payload.assetStatus = formAssetStatus;

            const res = await maintenanceService.createLog(assetId, payload);
            setFeedbackMessage(res.message);
            setIsCreateModalOpen(false);
            setIsLoading(true);
            await loadData();
        } catch (error) {
            setFormError(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editLogId) return;

        setFormError("");
        setFeedbackMessage("");
        setIsSubmitting(true);

        try {
            const payload: UpdateMaintenanceLogPayload = {
                assetId,
                details: formDetails,
                status: formStatus,
            };
            if (formAssetStatus) payload.assetStatus = formAssetStatus;

            const res = await maintenanceService.updateLog(editLogId, payload);
            setFeedbackMessage(res.message);
            setEditLogId(null);
            setIsLoading(true);
            await loadData();
        } catch (error) {
            setFormError(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteLogId) return;
        setFormError("");
        setFeedbackMessage("");
        setIsSubmitting(true);

        try {
            const res = await maintenanceService.deleteLog(deleteLogId);
            setFeedbackMessage(res.message);
            setDeleteLogId(null);
            setIsLoading(true);
            await loadData();
        } catch (error) {
            setFormError(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const openCreateModal = () => {
        setFormError("");
        setFeedbackMessage("");
        setFormDetails("");
        setFormStatus("PENDING");
        setFormAssetStatus(assetDetail?.status || "");
        setIsCreateModalOpen(true);
    };

    const openEditModal = (log: AssetMaintenanceLog) => {
        setFormError("");
        setFeedbackMessage("");
        setFormDetails(log.details);
        setFormStatus(log.status);
        setFormAssetStatus(assetDetail?.status || "");
        setEditLogId(log.id);
    };

    return (
        <CrudModal
            title="Manage Maintenance Log"
            description="Record maintenance history and update this asset's condition manually."
            onClose={onClose}
            maxWidthClass="max-w-4xl"
        >
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    {assetDetail && (
                        <div className="flex gap-4">
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 shadow-sm min-w-[200px]">
                                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Aset
                                </p>
                                <p className="mt-1 flex items-center gap-2 text-base font-semibold text-gray-900">
                                    <AssetIcon className="h-4 w-4 text-gray-500" />
                                    {assetDetail.name}
                                </p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 shadow-sm min-w-[150px]">
                                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Status Aset
                                </p>
                                <div className="mt-1">
                                    <span
                                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${assetStatusBadgeClass(assetDetail.status)}`}
                                    >
                                        {assetStatusLabel(assetDetail.status)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                            Tambah Log
                        </button>
                    </div>
                </div>

                {fetchError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {fetchError}
                    </div>
                )}
                {feedbackMessage && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                        {feedbackMessage}
                    </div>
                )}

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="px-4 py-10 text-center text-sm text-gray-500">
                            Memuat riwayat maintenance...
                        </div>
                    ) : (
                        <div className="max-h-[50vh] overflow-y-auto">
                            <table className="min-w-full border-collapse">
                                <thead className="sticky top-0 bg-gray-50 z-10">
                                    <tr className="border-b border-gray-200">
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                            Tanggal
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                            Status Maintenance
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                                            Detail Pekerjaan
                                        </th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-5 py-8 text-center text-sm text-gray-500"
                                            >
                                                Belum ada riwayat perbaikan untuk aset ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr
                                                key={log.id}
                                                className="transition hover:bg-gray-50 align-top"
                                            >
                                                <td className="px-5 py-3 text-sm text-gray-900">
                                                    {formatDate(log.createdAt)}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${maintenanceStatusBadgeClass(log.status)}`}
                                                    >
                                                        {maintenanceStatusLabel(
                                                            log.status,
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-gray-700">
                                                    {log.details}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEditModal(log)
                                                            }
                                                            className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDeleteLogId(log.id)
                                                            }
                                                            className="inline-flex h-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* CREATE MODAL (Nested) */}
                {isCreateModalOpen && (
                    <CrudModal
                        title="Add Maintenance Log"
                        description="Record the maintenance process and update this asset's condition."
                        onClose={() => setIsCreateModalOpen(false)}
                    >
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            {formError && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                                    {formError}
                                </div>
                            )}

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Detail Perbaikan
                                </span>
                                <textarea
                                    value={formDetails}
                                    onChange={(e) => setFormDetails(e.target.value)}
                                    required
                                    className="rounded-lg border border-gray-300 p-3 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none min-h-[100px]"
                                    placeholder="Describe the damage and maintenance actions..."
                                />
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                        Status Maintenance
                                    </span>
                                    <select
                                        value={formStatus}
                                        onChange={(e) =>
                                            setFormStatus(
                                                e.target.value as MaintenanceStatus,
                                            )
                                        }
                                        className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="PENDING" className="text-gray-900 bg-white">
                                            Pending
                                        </option>
                                        <option value="PROCESS" className="text-gray-900 bg-white">
                                            Proses
                                        </option>
                                        <option value="FINISHED" className="text-gray-900 bg-white">
                                            Selesai
                                        </option>
                                    </select>
                                </label>

                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                        Update Kondisi Aset
                                    </span>
                                    <select
                                        value={formAssetStatus}
                                        onChange={(e) =>
                                            setFormAssetStatus(
                                                e.target.value as AssetStatus | "",
                                            )
                                        }
                                        className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="" className="text-gray-900 bg-white">
                                            -- Jangan Ubah --
                                        </option>
                                        <option value="GOOD" className="text-gray-900 bg-white">
                                            Baik
                                        </option>
                                        <option value="MAINTENANCE" className="text-gray-900 bg-white">
                                            Maintenance
                                        </option>
                                        <option value="BROKEN" className="text-gray-900 bg-white">
                                            Rusak
                                        </option>
                                    </select>
                                </label>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="h-10 px-4 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {isSubmitting ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </CrudModal>
                )}

                {/* EDIT MODAL (Nested) */}
                {editLogId && editLog && (
                    <CrudModal
                        title="Edit Maintenance Log"
                        description="Change maintenance details or its status."
                        onClose={() => setEditLogId(null)}
                    >
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            {formError && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                                    {formError}
                                </div>
                            )}

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Detail Perbaikan
                                </span>
                                <textarea
                                    value={formDetails}
                                    onChange={(e) => setFormDetails(e.target.value)}
                                    required
                                    className="rounded-lg border border-gray-300 p-3 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none min-h-[100px]"
                                />
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                        Status Maintenance
                                    </span>
                                    <select
                                        value={formStatus}
                                        onChange={(e) =>
                                            setFormStatus(
                                                e.target.value as MaintenanceStatus,
                                            )
                                        }
                                        className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="PENDING" className="text-gray-900 bg-white">
                                            Pending
                                        </option>
                                        <option value="PROCESS" className="text-gray-900 bg-white">
                                            Proses
                                        </option>
                                        <option value="FINISHED" className="text-gray-900 bg-white">
                                            Selesai
                                        </option>
                                    </select>
                                </label>

                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                        Update Kondisi Aset
                                    </span>
                                    <select
                                        value={formAssetStatus}
                                        onChange={(e) =>
                                            setFormAssetStatus(
                                                e.target.value as AssetStatus | "",
                                            )
                                        }
                                        className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value="" className="text-gray-900 bg-white">
                                            -- Jangan Ubah --
                                        </option>
                                        <option value="GOOD" className="text-gray-900 bg-white">
                                            Baik
                                        </option>
                                        <option value="MAINTENANCE" className="text-gray-900 bg-white">
                                            Maintenance
                                        </option>
                                        <option value="BROKEN" className="text-gray-900 bg-white">
                                            Rusak
                                        </option>
                                    </select>
                                </label>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditLogId(null)}
                                    className="h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="h-10 px-4 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {isSubmitting
                                        ? "Menyimpan..."
                                        : "Simpan Perubahan"}
                                </button>
                            </div>
                        </form>
                    </CrudModal>
                )}

                {/* DELETE MODAL (Nested) */}
                {deleteLogId && deleteLog && (
                    <CrudModal
                        title="Delete Maintenance Log"
                        description="This history will be permanently deleted. Asset status will not be reverted automatically."
                        onClose={() => setDeleteLogId(null)}
                    >
                        <div className="space-y-4">
                            {formError && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                                    {formError}
                                </div>
                            )}

                            <p className="text-sm text-gray-700">
                                Apakah Anda yakin ingin menghapus log perbaikan ini?
                            </p>
                            <div className="rounded-lg bg-gray-50 p-3 text-sm italic text-gray-600">
                                &quot;{deleteLog.details}&quot;
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDeleteLogId(null)}
                                    className="h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={handleDeleteConfirm}
                                    className="h-10 px-4 rounded-lg bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                                >
                                    {isSubmitting ? "Deleting..." : "Yes, Delete"}
                                </button>
                            </div>
                        </div>
                    </CrudModal>
                )}
            </div>
        </CrudModal>
    );
}
