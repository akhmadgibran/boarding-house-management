"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminPayments } from "@/features/payments/contexts/AdminPaymentsContext";
import { PaymentService } from "@/features/payments/services/payment.service";
import type { InvoiceRecord } from "@/features/payments/types/payments";
import {
  formatCurrency,
  getPaymentBadge,
  getRemainingAmount,
} from "@/features/payments/utils/payments";
import { MultiInvoicePaymentModal } from "./MultiInvoicePaymentModal";

type ActivePaymentsTableProps = {
  payments: InvoiceRecord[];
};

type PaymentDialogMode = "DIRECT" | "INSTALLMENT";
type PaymentApiMethod = "TRANSFER" | "CASH" | "E_WALLET";

type PaymentDialogState = {
  payment: InvoiceRecord;
  mode: PaymentDialogMode;
  installmentAmount: string;
  paymentMethod: PaymentApiMethod;
  localError: string | null;
};

type ActionToastState = {
  tone: "success" | "error";
  message: string;
};

type CheckoutDialogState = {
  roomId: string;
  roomLabel: string;
  tenantName: string;
};

type PayDisabledReasonParams = {
  remaining: number;
  isBusy: boolean;
  isCurrentRowProcessing: boolean;
  processingPaymentAction: "INSTALLMENT" | "SETTLE" | null;
};

function getPayDisabledReason({
  remaining,
  isBusy,
  isCurrentRowProcessing,
  processingPaymentAction,
}: PayDisabledReasonParams): string | null {
  if (isCurrentRowProcessing) {
    if (processingPaymentAction === "INSTALLMENT") {
      return "Installment is processing.";
    }
    if (processingPaymentAction === "SETTLE") {
      return "Settlement is processing.";
    }
    return "Payment is processing.";
  }

  if (isBusy) {
    return "Waiting for other payment processes to complete.";
  }

  // waitingForRoomVacant no longer disables the pay button entirely.
  // Cicilan is allowed; only full settlement is blocked (handled in the dialog).

  if (remaining <= 0) {
    return "Bill is fully paid.";
  }

  return null;
}

function getPayButtonLabel(
  isCurrentRowProcessing: boolean,
  processingPaymentAction: "INSTALLMENT" | "SETTLE" | null
) {
  if (!isCurrentRowProcessing) {
    return "Settle";
  }

  if (processingPaymentAction === "INSTALLMENT") {
    return "Processing Installment...";
  }

  return "Processing...";
}


function paymentMethodLabel(method: PaymentApiMethod) {
  if (method === "CASH") {
    return "Cash";
  }

  if (method === "E_WALLET") {
    return "E-Wallet";
  }

  return "Bank Transfer";
}

function getActionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "An error occurred while processing the request.";
}

export function ActivePaymentsTable({ payments }: ActivePaymentsTableProps) {
  const {
    processPayment,
    markOccupantCheckout,
    isLoading,
    pagination,
    fetchPayments,
    processingPaymentId,
    processingPaymentAction,
    cancelInvoice,
  } = useAdminPayments();
  const [paymentDialog, setPaymentDialog] = useState<PaymentDialogState | null>(null);
  const [multiInvoiceModalOpen, setMultiInvoiceModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [checkoutDialog, setCheckoutDialog] = useState<CheckoutDialogState | null>(null);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [actionToast, setActionToast] = useState<ActionToastState | null>(null);

  const dialogRemaining = useMemo(() => {
    if (!paymentDialog) {
      return 0;
    }
    return getRemainingAmount(paymentDialog.payment);
  }, [paymentDialog]);

  useEffect(() => {
    if (!actionToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActionToast(null);
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [actionToast]);

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      fetchPayments({ page: pagination.page + 1 });
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      fetchPayments({ page: pagination.page - 1 });
    }
  };

  const openPaymentDialog = (payment: InvoiceRecord) => {
    setPaymentDialog({
      payment,
      // If DP is waiting for room vacancy, force INSTALLMENT mode (DIRECT is blocked)
      mode: payment.waitingForRoomVacant ? "INSTALLMENT" : "DIRECT",
      installmentAmount: "",
      paymentMethod: "TRANSFER",
      localError: null,
    });
  };

  const closePaymentDialog = () => {
    setPaymentDialog(null);
  };

  const openCheckoutDialog = (payment: InvoiceRecord) => {
    setCheckoutDialog({
      roomId: payment.roomId,
      roomLabel: payment.roomLabel,
      tenantName: payment.priorOccupantName ?? payment.tenantName,
    });
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutDialog || isCheckoutSubmitting) {
      return;
    }

    const roomLabel = checkoutDialog.roomLabel;

    try {
      setIsCheckoutSubmitting(true);
      const isSuccess = await markOccupantCheckout(checkoutDialog.roomId);
      if (!isSuccess) {
        setActionToast({
          tone: "error",
          message: "Checkout processing failed. Please try again.",
        });
        return;
      }

      setCheckoutDialog(null);
      setActionToast({
        tone: "success",
        message: `Checkout room ${roomLabel} successful. DP bill can now be settled.`,
      });
    } catch (error) {
      setActionToast({
        tone: "error",
        message: `Checkout gagal diproses: ${getActionErrorMessage(error)}`,
      });
    } finally {
      setIsCheckoutSubmitting(false);
    }
  };

  const submitPaymentDialog = async () => {
    if (!paymentDialog) {
      return;
    }

    const remaining = getRemainingAmount(paymentDialog.payment);
    if (remaining <= 0) {
      setPaymentDialog((current) =>
        current ? { ...current, localError: "This bill is already fully paid." } : current
      );
      return;
    }

    let amountToSubmit = remaining;
    if (paymentDialog.mode === "INSTALLMENT") {
      const parsed = Number(paymentDialog.installmentAmount);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setPaymentDialog((current) =>
          current
            ? {
                ...current,
                localError: "Installment amount must be filled and greater than 0.",
              }
            : current
        );
        return;
      }

      if (parsed >= remaining) {
        setPaymentDialog((current) =>
          current
            ? {
                ...current,
                localError:
                  "Installment amount must be less than remaining bill to avoid direct settlement.",
              }
            : current
        );
        return;
      }

      amountToSubmit = parsed;
    }

    const ok = await processPayment(
      paymentDialog.payment.id,
      amountToSubmit,
      paymentDialog.mode,
      paymentDialog.paymentMethod
    );
    if (ok) {
      closePaymentDialog();
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex animate-pulse space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 w-3/4 rounded bg-gray-200"></div>
                <div className="space-y-2">
                  <div className="h-4 rounded bg-gray-200"></div>
                  <div className="h-4 w-5/6 rounded bg-gray-200"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (payments.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Tidak ada pembayaran aktif
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          All bills in this filter are fully paid or there are no bills to follow up.
        </p>
      </section>
    );
  }

  return (
    <>
      {actionToast && (
        <div className="fixed top-4 right-4 z-[70] w-full max-w-md px-4 sm:px-0">
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
              actionToast.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <p className="flex-1 text-sm font-medium">{actionToast.message}</p>
            <button
              type="button"
              onClick={() => setActionToast(null)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-current/20 bg-white/70 text-xs font-semibold"
              aria-label="Close notification"
            >
              x
            </button>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-4 px-4 pt-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Active Invoices List ({payments.length})
          </h3>
          <button
            type="button"
            onClick={() => setMultiInvoiceModalOpen(true)}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Pay Multiple Invoices
          </button>
        </div>
        
        <div className="hidden overflow-x-auto xl:block">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Room / Tenant
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Periode
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Invoice
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Terbayar
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Sisa
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => {
                const badge = getPaymentBadge(payment);
                const remaining = getRemainingAmount(payment);
                const isBusy = Boolean(processingPaymentId);
                const isCurrentRowProcessing = processingPaymentId === payment.id;
                const payDisabledReason = getPayDisabledReason({
                  remaining,
                  isBusy,
                  isCurrentRowProcessing,
                  processingPaymentAction: processingPaymentAction ?? null,
                });
                const isPayDisabled = Boolean(payDisabledReason);
                const payButtonLabel = getPayButtonLabel(
                  isCurrentRowProcessing,
                  processingPaymentAction ?? null
                );

                return (
                  <tr
                    key={payment.id}
                    className="align-top transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{payment.roomLabel}</p>
                      <p className="mt-1 text-sm text-gray-500">{payment.tenantName}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          Terakhir bayar: -
                        </span>
                      </div>
                      {payment.waitingForRoomVacant && payment.priorOccupantName && (
                        <p className="mt-2 text-xs font-medium text-amber-700">
                          Penghuni lama: {payment.priorOccupantName}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                      {payment.periodLabel}
                    </td>
                    <td className="px-5 py-4 text-right text-sm tabular-nums text-gray-600">
                      {formatCurrency(payment.billAmount)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-gray-900">
                      {payment.paidAmount > 0 ? formatCurrency(payment.paidAmount) : "-"}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-rose-700">
                      {formatCurrency(remaining)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {payment.waitingForRoomVacant && (
                          <button
                            type="button"
                            onClick={() => openCheckoutDialog(payment)}
                            disabled={isBusy}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Vacant Room (Checkout)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openPaymentDialog(payment)}
                          disabled={isPayDisabled}
                          title={payDisabledReason ?? undefined}
                          className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold text-white transition ${
                            isPayDisabled
                              ? "cursor-not-allowed bg-emerald-300"
                              : "bg-emerald-600 hover:bg-emerald-700"
                          }`}
                        >
                          {payButtonLabel}
                        </button>
                        {/* Show delete button only for unpaid invoices */}
                        {payment.status === "BELUM_BAYAR" && (
                          <button
                            type="button"
                            onClick={() => setInvoiceToDelete(payment.id)}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                            title="Cancel bill"
                          >
                            Batalkan
                          </button>
                        )}
                      </div>
                      {payDisabledReason && (
                        <p className="mt-2 text-right text-[11px] text-gray-500">
                          {payDisabledReason}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 bg-gray-50 p-4 xl:hidden">
          {payments.map((payment) => {
            const badge = getPaymentBadge(payment);
            const remaining = getRemainingAmount(payment);
            const isBusy = Boolean(processingPaymentId);
            const isCurrentRowProcessing = processingPaymentId === payment.id;
            const payDisabledReason = getPayDisabledReason({
              remaining,
              isBusy,
              isCurrentRowProcessing,
              processingPaymentAction: processingPaymentAction ?? null,
            });
            const isPayDisabled = Boolean(payDisabledReason);
            const payButtonLabel = getPayButtonLabel(
              isCurrentRowProcessing,
              processingPaymentAction ?? null
            );

            return (
              <article
                key={`${payment.id}-mobile`}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {payment.roomLabel}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{payment.tenantName}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <p className="mt-4 text-sm font-medium text-gray-900">
                  {payment.periodLabel}
                </p>

                {payment.waitingForRoomVacant && payment.priorOccupantName && (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    Penghuni lama: {payment.priorOccupantName}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Invoice
                    </p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {formatCurrency(payment.billAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Terbayar
                    </p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {payment.paidAmount > 0 ? formatCurrency(payment.paidAmount) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Sisa
                    </p>
                    <p className="mt-1 font-semibold tabular-nums text-rose-700">
                      {formatCurrency(remaining)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Terakhir bayar
                    </p>
                    <p className="mt-1 font-medium text-gray-900">
                      -
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {payment.waitingForRoomVacant && (
                    <button
                      type="button"
                      onClick={() => openCheckoutDialog(payment)}
                      disabled={isBusy}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Vacant Room
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openPaymentDialog(payment)}
                    disabled={isPayDisabled}
                    title={payDisabledReason ?? undefined}
                    className={`inline-flex h-10 flex-1 items-center justify-center rounded-lg px-3 text-xs font-semibold text-white transition ${
                      isPayDisabled
                        ? "cursor-not-allowed bg-emerald-300"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {payButtonLabel}
                  </button>
                  {/* Show delete button only for unpaid invoices on mobile */}
                  {payment.status === "BELUM_BAYAR" && (
                    <button
                      type="button"
                      onClick={() => setInvoiceToDelete(payment.id)}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Batalkan
                    </button>
                  )}
                </div>
                {payDisabledReason && (
                  <p className="mt-2 text-[11px] text-gray-500">{payDisabledReason}</p>
                )}
              </article>
            );
          })}
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-5 py-3">
            <span className="text-sm text-gray-500">
              Halaman {pagination.page} dari {pagination.totalPages} (Total: {pagination.total})
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={pagination.page <= 1}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={pagination.page >= pagination.totalPages}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </section>

      {paymentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close payment modal"
            onClick={closePaymentDialog}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          />

          <section
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
          >
            <header className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-emerald-600 uppercase">
                Payment Process
              </p>
              <h2 className="mt-2 text-lg font-semibold text-gray-900">
                {paymentDialog.payment.roomLabel}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {paymentDialog.payment.tenantName}
              </p>
            </header>

            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Sisa tagihan saat ini
                </p>
                <p className="mt-2 text-xl font-semibold text-gray-900">
                  {formatCurrency(dialogRemaining)}
                </p>
              </div>

              <div className="space-y-2">
                <label className={`flex items-start gap-3 rounded-lg border px-3 py-3 ${paymentDialog.payment.waitingForRoomVacant ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60" : "cursor-pointer border-gray-200"}`}>
                  <input
                    type="radio"
                    name="payment-mode"
                    className="mt-0.5"
                    checked={paymentDialog.mode === "DIRECT"}
                    disabled={paymentDialog.payment.waitingForRoomVacant}
                    onChange={() =>
                      setPaymentDialog((current) =>
                        current
                          ? {
                              ...current,
                              mode: "DIRECT",
                              localError: null,
                            }
                          : current
                      )
                    }
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Pay directly</p>
                    <p className="text-xs text-gray-500">
                      Sistem akan melunasi seluruh sisa tagihan dan data pindah ke riwayat.
                    </p>
                    {paymentDialog.payment.waitingForRoomVacant && (
                      <p className="mt-1 text-xs font-medium text-amber-700">
                        Tidak tersedia — kamar masih dihuni penghuni lama.
                      </p>
                    )}
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-3 py-3">
                  <input
                    type="radio"
                    name="payment-mode"
                    className="mt-0.5"
                    checked={paymentDialog.mode === "INSTALLMENT"}
                    onChange={() =>
                      setPaymentDialog((current) =>
                        current
                          ? {
                              ...current,
                              mode: "INSTALLMENT",
                              localError: null,
                            }
                          : current
                      )
                    }
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Installment</p>
                    <p className="text-xs text-gray-500">
                      Masukkan nominal sebagian agar tagihan tetap aktif dan tidak pindah ke riwayat.
                    </p>
                  </div>
                </label>
              </div>

              {paymentDialog.mode === "INSTALLMENT" && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Nominal bayar awal
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={50_000}
                    value={paymentDialog.installmentAmount}
                    onChange={(event) =>
                      setPaymentDialog((current) =>
                        current
                          ? {
                              ...current,
                              installmentAmount: event.target.value,
                              localError: null,
                            }
                          : current
                      )
                    }
                    placeholder="Example: 500000"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Nominal cicilan harus lebih kecil dari sisa tagihan.
                  </p>
                </label>
              )}

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Metode pembayaran
                </span>
                <select
                  value={paymentDialog.paymentMethod}
                  onChange={(event) =>
                    setPaymentDialog((current) =>
                      current
                        ? {
                            ...current,
                            paymentMethod: event.target.value as PaymentApiMethod,
                          }
                        : current
                    )
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                >
                  {(["TRANSFER", "CASH", "E_WALLET"] as const).map((method) => (
                    <option key={method} value={method}>
                      {paymentMethodLabel(method)}
                    </option>
                  ))}
                </select>
              </label>

              {paymentDialog.localError && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {paymentDialog.localError}
                </p>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closePaymentDialog}
                disabled={Boolean(processingPaymentId)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={submitPaymentDialog}
                disabled={Boolean(processingPaymentId)}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {processingPaymentId ? "Processing..." : "Save Payment"}
              </button>
            </footer>
          </section>
        </div>
      )}
      
      {/* Multi Invoice Payment Modal */}
      <MultiInvoicePaymentModal
        isOpen={multiInvoiceModalOpen}
        invoices={payments}
        onClose={() => setMultiInvoiceModalOpen(false)}
        onSubmit={async (data) => {
          try {
            await PaymentService.recordPaymentTransaction({
              occupantId: data.occupantId,
              invoiceIds: data.invoiceIds,
              totalAmount: data.totalAmount,
              paymentMethod: data.paymentMethod,
              note: data.note,
            });
            setMultiInvoiceModalOpen(false);
            await fetchPayments();
            setActionToast({
              tone: "success",
              message: `Payment for ${data.invoiceIds.length} invoices successfully recorded (${formatCurrency(data.totalAmount)}).`,
            });
          } catch (error) {
            const errorMessage = getActionErrorMessage(error);
            setActionToast({
              tone: "error",
              message: `Multiple invoice payment failed: ${errorMessage}`,
            });
            throw error instanceof Error ? error : new Error(errorMessage);
          }
        }}
      />

      {checkoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Tutup konfirmasi checkout"
            onClick={() => {
              if (!isCheckoutSubmitting) {
                setCheckoutDialog(null);
              }
            }}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          />
          <section className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <header className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-blue-600 uppercase">
                Konfirmasi Checkout
              </p>
              <h2 className="mt-2 text-lg font-semibold text-gray-900">
                Kosongkan kamar dulu?
              </h2>
            </header>
            <div className="space-y-4 p-6">
              <p className="text-sm text-gray-700">
                Room <span className="font-semibold">{checkoutDialog.roomLabel}</span> is still
                terelasi ke penghuni lama (
                <span className="font-semibold">{checkoutDialog.tenantName}</span>).
              </p>
              <p className="text-sm text-gray-700">
                Lanjutkan checkout agar penghuni DP bisa melunasi sisa tagihan?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCheckoutDialog(null)}
                  disabled={isCheckoutSubmitting}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCheckout}
                  disabled={isCheckoutSubmitting}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isCheckoutSubmitting ? "Processing..." : "Ya, Checkout"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      
      {/* Delete Invoice Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
          
          <section className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <header className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-rose-600 uppercase">
                KONFIRMASI PEMBATALAN
              </p>
              <h2 className="mt-2 text-lg font-semibold text-gray-900">
                Batalkan Invoice
              </h2>
            </header>
            
            <div className="space-y-5 p-6">
              <p className="text-gray-700">
                Anda yakin ingin membatalkan/menghapus tagihan ini? Tindakan ini tidak dapat dibatalkan.
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setInvoiceToDelete(null)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (invoiceToDelete) {
                      await cancelInvoice(invoiceToDelete);
                      setInvoiceToDelete(null);
                    }
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Ya, Batalkan
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

    </>
  );
}
