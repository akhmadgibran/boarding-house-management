"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CreatePaymentModal } from "@/features/payments/components/CreatePaymentModal";
import { useAdminPayments } from "@/features/payments/contexts/AdminPaymentsContext";

type PaymentsSectionLayoutProps = {
  children: ReactNode;
};

const paymentTabs = [
  {
    href: "/admin/payments",
    label: "Active Payments",
    description: "Bills that still need follow-up",
  },
  {
    href: "/admin/payments/history",
    label: "Payment History",
    description: "Archives of completed payments",
  },
];

export function PaymentsSectionLayout({
  children,
}: PaymentsSectionLayoutProps) {
  const pathname = usePathname();
  const { feedback, clearFeedback } = useAdminPayments();

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between">
          <p>{feedback}</p>
          <button
            type="button"
            onClick={clearFeedback}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:text-blue-900"
          >
            Tutup
          </button>
        </div>
      )}

      {children}
      <CreatePaymentModal />
    </div>
  );
}
