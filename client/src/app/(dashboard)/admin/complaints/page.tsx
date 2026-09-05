"use client";

import { useCallback, useEffect, useState } from "react";
import { CrudModal } from "@/components/ui/CrudModal";
import { complaintService } from "@/features/assets/services/complaint.service";
import type {
    Complaint,
    ComplaintStatus,
} from "@/features/assets/types/complaint";
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

function formatDate(value: string) {
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function statusLabel(status: ComplaintStatus) {
    if (status === "PENDING") return "Menunggu";
    if (status === "PROCESSED") return "Diproses";
    return "Done";
}

function statusBadgeClass(status: ComplaintStatus) {
    if (status === "PENDING") return "bg-rose-100 text-rose-800";
    if (status === "PROCESSED") return "bg-amber-100 text-amber-800";
    return "bg-emerald-100 text-emerald-800";
}

function getErrorMessage(error: unknown) {
    if (error instanceof ApiError) return error.message;
    return "Gagal memuat data komplain.";
}

export default function AdminComplaintsPage() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [processingComplaint, setProcessingComplaint] =
        useState<Complaint | null>(null);
    const [maintenanceDetails, setMaintenanceDetails] = useState("");
    const [maintenanceError, setMaintenanceError] = useState<string | null>(
        null,
    );

    const [error, setError] = useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState("ALL");
    const [sortOrder, setSortOrder] = useState("desc");

    const fetchComplaints = useCallback(async () => {
        try {
            setLoading(true);
            const response = await complaintService.getAllComplaints(
                statusFilter,
                sortOrder,
            );
            setComplaints(response.complaints);
            setError(null);
        } catch (fetchError) {
            setError(getErrorMessage(fetchError));
        } finally {
            setLoading(false);
        }
    }, [sortOrder, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void fetchComplaints();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchComplaints]);

    const handleUpdateStatus = async (
        id: string,
        newStatus: ComplaintStatus,
    ) => {
        try {
            setIsSubmitting(true);
            setError(null);
            setFeedbackMessage(null);
            await complaintService.processComplaint(id, { status: newStatus });
            setFeedbackMessage(
                `Status komplain berhasil diubah menjadi ${statusLabel(newStatus)}.`,
            );
            await fetchComplaints();
        } catch (processError) {
            setError(getErrorMessage(processError));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetFilter = () => {
        setStatusFilter("ALL");
        setSortOrder("desc");
    };

    const openProcessModal = (complaint: Complaint) => {
        setProcessingComplaint(complaint);
        setMaintenanceDetails("");
        setMaintenanceError(null);
    };

    const closeProcessModal = () => {
        setProcessingComplaint(null);
        setMaintenanceDetails("");
        setMaintenanceError(null);
    };

    const handleProcessComplaint = async () => {
        if (!processingComplaint) return;

        if (
            processingComplaint.category === "ASSET" &&
            maintenanceDetails.trim() === ""
        ) {
            setMaintenanceError(
                "Detail maintenance wajib diisi untuk komplain aset.",
            );
            return;
        }

        try {
            setIsSubmitting(true);
            setMaintenanceError(null);
            setError(null);
            setFeedbackMessage(null);

            await complaintService.processComplaint(processingComplaint.id, {
                status: "PROCESSED",
                ...(maintenanceDetails.trim()
                    ? { maintenanceDetails: maintenanceDetails.trim() }
                    : {}),
            });

            setFeedbackMessage(
                "Status komplain berhasil diubah menjadi Diproses.",
            );
            closeProcessModal();
            await fetchComplaints();
        } catch (processError) {
            setError(getErrorMessage(processError));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="space-y-5">
            <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900">
                        Manajemen Komplain
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 md:text-base">
                        Kelola komplain kerusakan aset maupun keluhan lain yang
                        dilaporkan penghuni.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setFeedbackMessage(null);
                        void fetchComplaints();
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                >Reload</button>
            </header>

            {feedbackMessage ? (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {feedbackMessage}
                </section>
            ) : null}

            {error ? (
                <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </section>
            ) : null}

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Status Komplain
                        </span>
                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        >
                            <option value="ALL">Semua Status</option>
                            <option value="PENDING">Menunggu</option>
                            <option value="PROCESSED">Diproses</option>
                            <option value="RESOLVED">Done</option>
                        </select>
                    </label>

                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                            Urutan
                        </span>
                        <select
                            value={sortOrder}
                            onChange={(event) =>
                                setSortOrder(event.target.value)
                            }
                            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                        >
                            <option value="desc">Terbaru</option>
                            <option value="asc">Terlama</option>
                        </select>
                    </label>

                    <div className="flex items-end md:col-span-2 xl:col-span-1">
                        <button
                            type="button"
                            onClick={handleResetFilter}
                            className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                        >
                            Reset Filter
                        </button>
                    </div>
                </div>
            </section>

            <p className="text-sm text-gray-500">
                Menampilkan{" "}
                <span className="font-semibold text-gray-900">
                    {complaints.length}
                </span>{" "}
                komplain.
            </p>

            {loading ? (
                <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-12 shadow-sm">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <span className="ml-3 text-gray-600">
                        Memuat komplain...
                    </span>
                </div>
            ) : complaints.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500 shadow-sm">
                    Belum ada komplain yang dilaporkan.
                </div>
            ) : (
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="border-r border-gray-200 px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Date</th>
                                    <th className="border-r border-gray-200 px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                        Kategori / Terkait
                                    </th>
                                    <th className="border-r border-gray-200 px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                        Pelapor
                                    </th>
                                    <th className="border-r border-gray-200 px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Detail</th>
                                    <th className="border-r border-gray-200 px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">Status</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {complaints.map((complaint) => (
                                    <tr
                                        key={complaint.id}
                                        className="transition-colors hover:bg-gray-50"
                                    >
                                        <td className="border-r border-gray-200 px-5 py-4 text-sm text-gray-500">
                                            {formatDate(complaint.createdAt)}
                                        </td>
                                        <td className="border-r border-gray-200 px-5 py-4">
                                            {complaint.category === "ASSET" ? (
                                                <>
                                                    <span className="inline-flex rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 uppercase mb-1">
                                                        Aset Kamar
                                                    </span>
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                                        <AssetIcon className="h-4 w-4 text-gray-500" />
                                                        {complaint.asset
                                                            ?.name || "-"}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Kamar:{" "}
                                                        {complaint.asset?.room
                                                            .name || "-"}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="inline-flex rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 uppercase">
                                                    Lainnya
                                                </span>
                                            )}
                                        </td>
                                        <td className="border-r border-gray-200 px-5 py-4">
                                            <div className="text-sm text-gray-900">
                                                {complaint.reportedBy
                                                    ?.occupantDetails?.name ||
                                                    "-"}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {complaint.reportedBy?.email ||
                                                    "-"}
                                            </div>
                                        </td>
                                        <td className="border-r border-gray-200 px-5 py-4 text-sm text-gray-600">
                                            <p className="line-clamp-2">
                                                {complaint.detail}
                                            </p>
                                        </td>
                                        <td className="border-r border-gray-200 px-5 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(complaint.status)}`}
                                            >
                                                {statusLabel(complaint.status)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                {complaint.status ===
                                                    "PENDING" && (
                                                    <button
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={() =>
                                                            openProcessModal(
                                                                complaint,
                                                            )
                                                        }
                                                        className="inline-flex h-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >Process</button>
                                                )}

                                                {complaint.status ===
                                                    "PROCESSED" && (
                                                    <button
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={() =>
                                                            handleUpdateStatus(
                                                                complaint.id,
                                                                "RESOLVED",
                                                            )
                                                        }
                                                        className="inline-flex h-8 items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >Done</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {processingComplaint ? (
                <CrudModal
                    title="Proses Komplain"
                    description="Masukkan detail maintenance agar log otomatis tercatat."
                    onClose={closeProcessModal}
                >
                    <div className="space-y-4">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                Aset Terkait
                            </p>
                            <p className="mt-1 flex items-center gap-2 font-semibold text-gray-900">
                                <AssetIcon className="h-4 w-4 text-gray-500" />
                                {processingComplaint.asset?.name ?? "-"}
                            </p>
                            <p className="text-xs text-gray-500">
                                Kamar:{" "}
                                {processingComplaint.asset?.room?.name ?? "-"}
                            </p>
                        </div>

                        {processingComplaint.category === "ASSET" ? (
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Detail Maintenance
                                </span>
                                <textarea
                                    rows={4}
                                    value={maintenanceDetails}
                                    onChange={(event) =>
                                        setMaintenanceDetails(
                                            event.target.value,
                                        )
                                    }
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                    placeholder="Contoh: Ganti engsel lemari dan kunci baru"
                                    required
                                />
                            </label>
                        ) : null}

                        {maintenanceError ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {maintenanceError}
                            </div>
                        ) : null}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={closeProcessModal}
                                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                            >Cancel</button>
                            <button
                                type="button"
                                onClick={handleProcessComplaint}
                                disabled={isSubmitting}
                                className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? "Processing..." : "Process"}
                            </button>
                        </div>
                    </div>
                </CrudModal>
            ) : null}
        </section>
    );
}
