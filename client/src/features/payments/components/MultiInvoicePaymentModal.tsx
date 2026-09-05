import { useState, useEffect } from "react";
import type { InvoiceRecord } from "@/features/payments/types/payments";
import { formatCurrency, getRemainingAmount } from "@/features/payments/utils/payments";

function formatDotSeparator(value: string | number): string {
  const num = typeof value === "number" ? value : parseInt(value.replace(/\D/g, ""), 10);
  if (!num && num !== 0) return "";
  return num.toLocaleString("id-ID");
}

type MultiInvoicePaymentModalProps = {
  isOpen: boolean;
  invoices: InvoiceRecord[];
  onClose: () => void;
  onSubmit: (data: {
    occupantId: string;
    invoiceIds: string[];
    totalAmount: number;
    paymentMethod: string;
    note?: string;
  }) => Promise<void>;
};

type SelectedInvoice = {
  invoice: InvoiceRecord;
  isSelected: boolean;
};

export function MultiInvoicePaymentModal({
  isOpen,
  invoices,
  onClose,
  onSubmit,
}: MultiInvoicePaymentModalProps) {
  const [selectedInvoices, setSelectedInvoices] = useState<SelectedInvoice[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("TRANSFER");
  const [note, setNote] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Initialize selected invoices when invoices prop changes
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (invoices.length > 0) {
        const initialSelection = invoices.map(invoice => ({
          invoice,
          isSelected: false,
        }));
        setSelectedInvoices(initialSelection);
      } else {
        setSelectedInvoices([]);
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [invoices]);

  // Calculate total amount when selected invoices change
  useEffect(() => {
    const selectedAmount = selectedInvoices
      .filter(item => item.isSelected)
      .reduce((sum, item) => sum + getRemainingAmount(item.invoice), 0);

    const timeoutId = window.setTimeout(() => {
      setTotalAmount(parseFloat(customAmount) || selectedAmount);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedInvoices, customAmount]);

  const handleInvoiceToggle = (invoiceId: string) => {
    setSelectedInvoices(prev => prev.map(item => 
      item.invoice.id === invoiceId 
        ? { ...item, isSelected: !item.isSelected } 
        : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedIds = selectedInvoices
      .filter(item => item.isSelected)
      .map(item => item.invoice.id);
    
    if (selectedIds.length === 0) {
      setError("Please select at least one invoice to pay.");
      return;
    }
    
    if (totalAmount <= 0) {
      setError("Payment amount must be greater than 0.");
      return;
    }
    
    // Validate that total doesn't exceed total outstanding
    const maxPossibleAmount = selectedInvoices
      .filter(item => item.isSelected)
      .reduce((sum, item) => sum + getRemainingAmount(item.invoice), 0);
      
    if (totalAmount > maxPossibleAmount) {
      setError(`Payment amount exceeds total remaining invoice (${formatCurrency(maxPossibleAmount)}).`);
      return;
    }
    
    try {
      // Get the occupantId from the first selected invoice
      const firstSelectedInvoice = selectedInvoices.find(item => item.isSelected)?.invoice;
      const occupantId = firstSelectedInvoice?.occupantId || "";

      await onSubmit({
        occupantId,
        invoiceIds: selectedIds,
        totalAmount,
        paymentMethod,
        note: note.trim() || undefined,
      });
      onClose(); // Close modal after successful submission
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while processing the payment.");
    }
  };

  if (!isOpen) {
    return null;
  }

  const selectedCount = selectedInvoices.filter(item => item.isSelected).length;
  const totalSelectedOutstanding = selectedInvoices
    .filter(item => item.isSelected)
    .reduce((sum, item) => sum + getRemainingAmount(item.invoice), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4">
      <button
        type="button"
        aria-label="Close payment modal"
        onClick={onClose}
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
            <p className="text-[10px] sm:text-xs font-semibold tracking-[0.18em] text-emerald-600 uppercase">
              Invoice Payment
            </p>
            <h2 className="mt-1 text-base sm:text-lg font-semibold text-gray-900 truncate">
              Pay Selected Invoices
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-gray-500 leading-snug">
              Select the invoices you want to pay at once
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:border-gray-400 hover:text-gray-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </header>

        {/* ── Scrollable Form Body ── */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* ── Kiri: Invoice List ── */}
              <div className="space-y-4 sm:space-y-5">
                {error && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs sm:text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-xs sm:text-sm font-medium text-gray-700">
                    Available Invoices ({invoices.length})
                  </h3>

                  {invoices.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-6 text-center">
                      <p className="text-xs sm:text-sm text-gray-500">No invoices available</p>
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      {invoices.map((invoice) => {
                        const selectedItem = selectedInvoices.find(i => i.invoice.id === invoice.id);
                        const isSelected = selectedItem?.isSelected || false;
                        const remaining = getRemainingAmount(invoice);
                        const firstSelectedOccupantId = selectedInvoices.find(item => item.isSelected)?.invoice.occupantId;
                        const isDisabled = Boolean(firstSelectedOccupantId && firstSelectedOccupantId !== invoice.occupantId);
                        
                        return (
                          <div
                            key={invoice.id}
                            className={`flex items-center gap-3 rounded-lg border p-2.5 sm:p-3 transition ${
                              isSelected 
                                ? "border-emerald-300 bg-emerald-50" 
                                : isDisabled
                                  ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              id={`invoice-${invoice.id}`}
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={() => handleInvoiceToggle(invoice.id)}
                              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <label 
                              htmlFor={`invoice-${invoice.id}`} 
                              className="flex-1 cursor-pointer min-w-0"
                            >
                              <div className="flex justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{invoice.roomLabel}</p>
                                  <p className="text-xs text-gray-500 truncate">{invoice.tenantName}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-medium text-gray-900">{formatCurrency(remaining)}</p>
                                  <p className="text-[11px] text-gray-500">remaining</p>
                                </div>
                              </div>
                              <p className="mt-1 text-[11px] text-gray-500">
                                Period: {invoice.periodLabel}
                              </p>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Payment Summary ── */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                    Payment Summary
                  </p>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Number of invoices selected:</span>
                      <span className="font-medium text-gray-900">{selectedCount}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Total remaining invoices:</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(totalSelectedOutstanding)}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 pt-1.5 flex justify-between text-xs sm:text-sm font-semibold text-emerald-700">
                      <span>Paid:</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Kanan: Payment Input ── */}
              <div className="space-y-4 sm:space-y-5">
                {/* ── Amount Paid ── */}
                <label className="block">
                  <span className="mb-1 block text-xs sm:text-sm font-medium text-gray-700">
                    Amount Paid
                  </span>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-medium text-gray-500">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customAmount ? formatDotSeparator(customAmount) : ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setCustomAmount(raw);
                      }}
                      placeholder={`Example: ${formatDotSeparator(totalSelectedOutstanding)}`}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-500">
                    Leave blank for the total amount of selected invoices
                  </p>
                </label>

                {/* ── Payment Method ── */}
                <label className="block">
                  <span className="mb-1 block text-xs sm:text-sm font-medium text-gray-700">
                    Payment Method
                  </span>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  >
                    <option value="TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="E_WALLET">E-Wallet</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </label>

                {/* ── Catatan ── */}
                <label className="block">
                  <span className="mb-1 block text-xs sm:text-sm font-medium text-gray-700">
                    Note (Optional)
                  </span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    placeholder="Notes about this payment..."
                  />
                </label>
              </div>
            </div>
          </div>

          {/* ── Footer (sticky di bawah) ── */}
          <footer className="shrink-0 flex flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-4 sm:px-5 py-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={selectedCount === 0 || totalAmount <= 0}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              Pay {selectedCount} Invoices
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
