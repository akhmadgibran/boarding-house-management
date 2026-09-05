"use client";

import { useMemo, type FormEvent } from "react";
import {
  PAYMENT_METHODS,
  type PaymentMode,
} from "@/features/payments/types/payments";
import { useAdminPayments } from "@/features/payments/contexts/AdminPaymentsContext";

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDotSeparator(value: string | number): string {
  const num = typeof value === "number" ? value : parseInt(value.replace(/\D/g, ""), 10);
  if (!num && num !== 0) return "";
  return num.toLocaleString("id-ID");
}

export function CreatePaymentModal() {
  const {
    rooms,
    availableOccupants,
    isCreateModalOpen,
    closeCreateModal,
    paymentForm,
    updatePaymentForm,
    cycleText,
    isDpForOccupiedRoom,
    isDpStartDateLoading,
    isPeriodRelationsLoading,
    isCreateModalDependenciesLoading,
    createModalLoadError,
    retryCreateModalDependencies,
    periodRelations,
    selectedRoomPeriodRelation,
    selectedRoom,
    createPayment,
  } = useAdminPayments();

  const roomRelationById = useMemo(() => {
    const map = new Map<string, (typeof periodRelations)[number]>();
    for (const relation of periodRelations) {
      if (!map.has(relation.roomId)) {
        map.set(relation.roomId, relation);
      }
    }
    return map;
  }, [periodRelations]);

  const selectedOccupantMissingFromOptions = useMemo(() => {
    if (!paymentForm.occupantId) {
      return false;
    }

    return !availableOccupants.some((occupant) => occupant.id === paymentForm.occupantId);
  }, [availableOccupants, paymentForm.occupantId]);

  const roomHelperText = useMemo(() => {
    if (isPeriodRelationsLoading) {
      return "Checking room relations in the period from the start date...";
    }

    if (isDpStartDateLoading) {
      return "Adjusting the start date based on the room's last period...";
    }

    return null;
  }, [isDpStartDateLoading, isPeriodRelationsLoading]);

  const occupantHelper = useMemo(() => {
    if (isPeriodRelationsLoading || isDpStartDateLoading) {
      return null;
    }

    if (paymentForm.paymentMode !== "DP" && selectedRoomPeriodRelation?.occupantId) {
      return {
        tone: "info" as const,
        text: "For non-DP invoices, the occupant follows the room relation in this period.",
      };
    }

    if (paymentForm.paymentMode !== "DP" && selectedRoom?.occupantId) {
      return {
        tone: "info" as const,
        text: "For non-DP invoices, the active occupant in this room is used automatically.",
      };
    }

    if (paymentForm.roomId && availableOccupants.length === 0) {
      return {
        tone: "warning" as const,
        text: "No occupants available for this room and period.",
      };
    }

    return null;
  }, [
    availableOccupants.length,
    isDpStartDateLoading,
    isPeriodRelationsLoading,
    paymentForm.paymentMode,
    paymentForm.roomId,
    selectedRoom,
    selectedRoomPeriodRelation,
  ]);

  const isOccupantSelectionLocked =
    paymentForm.paymentMode !== "DP" &&
    Boolean(selectedRoomPeriodRelation?.occupantId || selectedRoom?.occupantId);

  if (!isCreateModalOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createPayment();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4">
      <button
        type="button"
        aria-label="Close modal"
        onClick={closeCreateModal}
        className="fixed inset-0 bg-black/45 backdrop-blur-sm"
      />

      <section
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl my-auto"
        style={{ maxHeight: "calc(100dvh - 2rem)" }}
      >
        {/* ── Header ── */}
        <header className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm px-4 sm:px-5 py-3 sm:py-4">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold tracking-[0.18em] text-blue-600 uppercase">
              New Invoice
            </p>
            <h2 className="mt-1 text-base sm:text-lg font-semibold text-gray-900 truncate">
              Create a new payment
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-gray-500 leading-snug">
              The start date determines the room and occupant relation period.
            </p>
          </div>

          <button
            type="button"
            onClick={closeCreateModal}
            className="flex-shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </header>

        {/* ── Scrollable Form Body ── */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {createModalLoadError && (
              <div className="mb-4 flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
                <p>{createModalLoadError} Try reloading room/occupant data.</p>
                <button
                  type="button"
                  onClick={() => {
                    void retryCreateModalDependencies();
                  }}
                  disabled={isCreateModalDependenciesLoading}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreateModalDependenciesLoading ? "Loading..." : "Try Again"}
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* ── Kiri ── */}
              <div className="space-y-4 sm:space-y-5">
                {/* ── Payment Type ── */}
                <label className="block">
                  <span className="mb-1 block text-xs sm:text-sm font-medium text-gray-700">
                    Initial payment type
                  </span>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(event) =>
                      updatePaymentForm("paymentMode", event.target.value as PaymentMode)
                    }
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  >
                    <option value="SEWA_REGULER">Regular monthly invoice (pay later)</option>
                    <option value="CICILAN">Partial payment / Installment</option>
                    <option value="DP">Prospective occupant DP</option>
                  </select>
                  {isDpForOccupiedRoom && (
                    <p className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 leading-relaxed">
                      The room is still occupied. DP is automatically recorded as an installment and
                      full payment can only be made after the previous occupant checks out.
                    </p>
                  )}
                </label>

                {/* ── Select Room ── */}
                <label className="block">
                  <span className="mb-1 block text-xs sm:text-sm font-medium text-gray-700">
                    Pilih kamar
                  </span>
                  <select
                    value={paymentForm.roomId}
                    onChange={(event) => updatePaymentForm("roomId", event.target.value)}
                    disabled={isPeriodRelationsLoading}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    <option value="">Select room...</option>
                    {rooms.map((room) => {
                      const relation = roomRelationById.get(room.id);
                      const isTakenByPeriod = Boolean(relation);
                      const isRoomVacant = !room.hasActiveOccupant;

                      return (
                        <option
                          key={room.id}
                          value={room.id}
                        >
                          {room.label} (
                          {isTakenByPeriod && !isRoomVacant
                            ? `Related: ${relation?.occupantName}`
                            : room.hasActiveOccupant
                              ? `Currently Occupied: ${room.occupantName}`
                              : "Vacant"}
                          )
                        </option>
                      );
                    })}
                  </select>
                  {roomHelperText && (
                    <p className="mt-1.5 text-[11px] text-gray-500">
                      {roomHelperText}
                    </p>
                  )}
                  {selectedRoomPeriodRelation && selectedRoom?.hasActiveOccupant && paymentForm.paymentMode !== "DP" && (
                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      In this period, the room is already related to{" "}
                      <span className="font-semibold">{selectedRoomPeriodRelation.occupantName}</span>.
                      Select another room or change the start date.
                    </p>
                  )}
                </label>

                {/* ── Room Price (appears when room is selected) ── */}
                {selectedRoom && (
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-emerald-700">
                        Room price / month
                      </p>
                      <p className="text-sm font-bold text-emerald-900">
                        {formatRupiah(selectedRoom.monthlyBill)}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Pilih Penghuni ── */}
                <label className="block">
                  <span className="mb-1 block text-xs sm:text-sm font-medium text-gray-700">
                    Pilih penghuni
                  </span>
                  <select
                    value={paymentForm.occupantId}
                    onChange={(event) => updatePaymentForm("occupantId", event.target.value)}
                    disabled={isPeriodRelationsLoading || isOccupantSelectionLocked}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    <option value="">Select occupant...</option>
                    {selectedOccupantMissingFromOptions && paymentForm.occupantId && (
                      <option value={paymentForm.occupantId}>
                        {selectedRoomPeriodRelation?.occupantId === paymentForm.occupantId
                          ? `${selectedRoomPeriodRelation.occupantName} (period relation)`
                          : `${selectedRoom?.occupantName ?? "Active occupant"} (selected room)`}
                      </option>
                    )}
                    {availableOccupants.map((occupant) => (
                      <option key={occupant.id} value={occupant.id}>
                        {occupant.name} ({occupant.email})
                      </option>
                    ))}
                  </select>
                  {occupantHelper && (
                    <p
                      className={`mt-1.5 text-[11px] ${
                        occupantHelper.tone === "warning" ? "text-amber-700" : "text-gray-500"
                      }`}
                    >
                      {occupantHelper.text}
                    </p>
                  )}
                </label>
              </div>

          {/* ── Kanan ── */}
          <div className="space-y-4 sm:space-y-5">
            {/* ── Tanggal Mulai ── */}
            <label className="block">
              <span className="mb-1 block text-xs sm:text-sm font-medium text-gray-700">
                Start date of entry / billed
              </span>
              <input
                type="date"
                value={paymentForm.startDate}
                onChange={(event) => updatePaymentForm("startDate", event.target.value)}
                disabled={isDpStartDateLoading}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
              <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                  Initial cycle simulation
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{cycleText}</p>
              </div>
            </label>

            {/* ── Nominal & Metode (conditional) ── */}
            {paymentForm.paymentMode !== "SEWA_REGULER" ? (
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs sm:text-sm font-medium text-gray-700">
                    Nominal bayar awal
                  </span>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-medium text-gray-500">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={paymentForm.amount ? formatDotSeparator(paymentForm.amount) : ""}
                      onChange={(event) => {
                        const raw = event.target.value.replace(/\D/g, "");
                        updatePaymentForm("amount", raw);
                      }}
                      placeholder="Example: 1.000.000"
                      className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs sm:text-sm font-medium text-gray-700">
                    Metode pembayaran
                  </span>
                  <select
                    value={paymentForm.method}
                    onChange={(event) =>
                      updatePaymentForm(
                        "method",
                        event.target.value as (typeof PAYMENT_METHODS)[number]
                      )
                    }
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 leading-relaxed">
                Regular invoices are created without initial payment. The payment method will be selected during the payment process.
              </div>
            )}
            </div>
          </div>
        </div>

        {/* ── Footer (sticky di bawah) ── */}
        <footer className="flex-shrink-0 flex flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-4 sm:px-5 py-3 sm:flex-row sm:justify-end">
          <button
              type="button"
              onClick={closeCreateModal}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPeriodRelationsLoading || isDpStartDateLoading || Boolean(selectedRoomPeriodRelation && selectedRoom?.hasActiveOccupant && paymentForm.paymentMode !== "DP")}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              Simpan Invoice
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
