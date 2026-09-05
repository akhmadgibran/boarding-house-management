"use client";

import { useEffect, useMemo, useState } from "react";
import { complaintService } from "@/features/assets/services/complaint.service";
import type {
    AssetStatus,
    ComplaintStatus,
    OccupantAsset,
    Complaint,
    ComplaintCategory,
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

function getErrorMessage(error: unknown) {
    if (error instanceof ApiError) {
        return error.message;
    }
    return "Terjadi kesalahan saat memuat data.";
}

function assetStatusLabel(status: AssetStatus) {
    if (status === "GOOD") return "Baik";
    if (status === "MAINTENANCE") return "Maintenance";
    return "Rusak";
}

function assetStatusBadgeClass(status: AssetStatus) {
    if (status === "GOOD") return "bg-emerald-100 text-emerald-800";
    if (status === "MAINTENANCE") return "bg-amber-100 text-amber-800";
    return "bg-rose-100 text-rose-800";
}

function complaintStatusLabel(status: ComplaintStatus) {
    if (status === "PENDING") return "Menunggu";
    if (status === "PROCESSED") return "Diproses";
    return "Done";
}

function complaintStatusBadgeClass(status: ComplaintStatus) {
    if (status === "PENDING") return "bg-rose-100 text-rose-800";
    if (status === "PROCESSED") return "bg-amber-100 text-amber-800";
    return "bg-emerald-100 text-emerald-800";
}

export default function OccupantComplaintsPage() {
    const [assets, setAssets] = useState<OccupantAsset[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [category, setCategory] = useState<ComplaintCategory>("OTHERS");
    const [selectedAssetId, setSelectedAssetId] = useState<string>("");
    const [details, setDetails] = useState("");
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalGoodAssets = useMemo(
        () => assets.filter((asset) => asset.status === "GOOD").length,
        [assets],
    );

    const totalOpenComplaints = useMemo(
        () => complaints.filter((c) => c.status !== "RESOLVED").length,
        [complaints],
    );

    const fetchData = async () => {
        try {
            setLoading(true);
            const [assetsResponse, complaintsResponse] = await Promise.all([
                complaintService.getOccupantAssets(),
                complaintService.getOccupantComplaints(),
            ]);
            setAssets(assetsResponse.assets);
            setComplaints(complaintsResponse.complaints);
            setError(null);
        } catch (fetchError) {
            setError(getErrorMessage(fetchError));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            void fetchData();
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    const openComplaintModal = () => {
        setCategory("OTHERS");
        setSelectedAssetId("");
        setDetails("");
        setSubmitError(null);
        setShowModal(true);
    };

    const closeComplaintModal = () => {
        setShowModal(false);
        setIsSubmitting(false);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!details.trim()) return;
        if (category === "ASSET" && !selectedAssetId) {
            setSubmitError("Pilih aset yang ingin dilaporkan.");
            return;
        }

        try {
            setIsSubmitting(true);
            setSubmitError(null);
            await complaintService.submitComplaint({
                category,
                assetId: category === "ASSET" ? selectedAssetId : null,
                details: details.trim(),
            });
            closeComplaintModal();
            setFeedbackMessage("Komplain berhasil diajukan.");
            await fetchData();
        } catch (submitComplaintError) {
            setSubmitError(getErrorMessage(submitComplaintError));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="space-y-5">
            <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900">
                        Aset & Komplain
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 md:text-base">
                        Daftar aset di kamar Anda. Ajukan komplain jika ada
                        kerusakan atau masalah lain agar pengelola bisa segera
                        menindaklanjuti.
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setFeedbackMessage(null);
                            void fetchData();
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                    >Reload</button>
                    <button
                        type="button"
                        onClick={openComplaintModal}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-transparent bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 shadow-sm"
                    >
                        Buat Komplain Baru
                    </button>
                </div>
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

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Total Aset Kamar
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
                        {assets.length}
                    </p>
                </article>

                <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Aset Kondisi Baik
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-700">
                        {totalGoodAssets}
                    </p>
                </article>

                <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                        Komplain Aktif (Belum Selesai)
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-rose-700">
                        {totalOpenComplaints}
                    </p>
                </article>
            </section>

            {loading ? (
                <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-12 shadow-sm">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <span className="ml-3 text-gray-600">Memuat data...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Daftar Aset Kamar */}
                    <section className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
                            <h3 className="font-semibold text-gray-900">
                                Daftar Aset Kamar Anda
                            </h3>
                        </div>
                        <div className="p-5">
                            {assets.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    Kamar ini tidak memiliki aset terdaftar.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {assets.map((asset) => (
                                        <div
                                            key={asset.id}
                                            className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/50 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <AssetIcon className="h-4 w-4 text-gray-500" />
                                                    <h4 className="text-sm font-semibold text-gray-900">
                                                        {asset.name}
                                                    </h4>
                                                </div>
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${assetStatusBadgeClass(asset.status)}`}
                                                >
                                                    {assetStatusLabel(
                                                        asset.status,
                                                    )}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {asset.details ||
                                                    "Tidak ada detail tambahan."}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Riwayat Komplain */}
                    <section className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
                            <h3 className="font-semibold text-gray-900">
                                Riwayat Komplain Anda
                            </h3>
                        </div>
                        <div className="p-5">
                            {complaints.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    Belum ada riwayat komplain.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {complaints.map((complaint) => (
                                        <div
                                            key={complaint.id}
                                            className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                        {complaint.category ===
                                                        "ASSET" ? (
                                                            <span className="inline-flex items-center gap-1">
                                                                <AssetIcon className="h-3.5 w-3.5 text-gray-400" />
                                                                {complaint.asset
                                                                    ?.name ||
                                                                    "-"}
                                                            </span>
                                                        ) : (
                                                            "Lainnya"
                                                        )}
                                                    </span>
                                                    <span className="text-xs text-gray-400 mt-0.5">
                                                        {formatDate(
                                                            complaint.createdAt,
                                                        )}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${complaintStatusBadgeClass(complaint.status)}`}
                                                >
                                                    {complaintStatusLabel(
                                                        complaint.status,
                                                    )}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700">
                                                {complaint.detail}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Buat Komplain Baru
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Pilih kategori masalah dan jelaskan secara singkat.
                        </p>

                        {submitError && (
                            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {submitError}
                            </div>
                        )}

                        <form
                            onSubmit={handleSubmit}
                            className="mt-4 space-y-4"
                        >
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Kategori
                                </span>
                                <select
                                    value={category}
                                    onChange={(e) =>
                                        setCategory(
                                            e.target.value as ComplaintCategory,
                                        )
                                    }
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                >
                                    <option value="OTHERS">
                                        Lainnya (Fasilitas umum, keamanan, dll)
                                    </option>
                                    <option value="ASSET">
                                        Aset Kamar (AC, Lemari, dll)
                                    </option>
                                </select>
                            </label>

                            {category === "ASSET" && (
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                        Pilih Aset
                                    </span>
                                    <select
                                        value={selectedAssetId}
                                        onChange={(e) =>
                                            setSelectedAssetId(e.target.value)
                                        }
                                        required={category === "ASSET"}
                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                    >
                                        <option value="" disabled>
                                            -- Pilih Aset Kamar --
                                        </option>
                                        {assets
                                            .filter((a) => a.status === "GOOD")
                                            .map((asset) => (
                                                <option
                                                    key={asset.id}
                                                    value={asset.id}
                                                >
                                                    {asset.name}
                                                </option>
                                            ))}
                                    </select>
                                    {assets.filter((a) => a.status === "GOOD")
                                        .length === 0 && (
                                        <span className="text-xs text-rose-600">
                                            Tidak ada aset dalam kondisi baik
                                            yang bisa dilaporkan.
                                        </span>
                                    )}
                                </label>
                            )}

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                    Detail / Keterangan
                                </span>
                                <textarea
                                    required
                                    rows={4}
                                    value={details}
                                    onChange={(event) =>
                                        setDetails(event.target.value)
                                    }
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                    placeholder="Contoh: Lampu berkedip lalu mati total"
                                />
                            </label>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeComplaintModal}
                                    className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                                >Cancel</button>
                                <button
                                    type="submit"
                                    disabled={
                                        isSubmitting ||
                                        (category === "ASSET" &&
                                            assets.filter(
                                                (a) => a.status === "GOOD",
                                            ).length === 0)
                                    }
                                    className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmitting ? "Mengirim..." : "Laporkan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
