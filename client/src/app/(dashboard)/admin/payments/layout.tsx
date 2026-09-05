import type { ReactNode } from "react";
import { PaymentsSectionLayout } from "@/features/payments/components/PaymentsSectionLayout";
import { AdminPaymentsProvider } from "@/features/payments/contexts/AdminPaymentsContext";

type AdminPaymentsLayoutProps = {
  children: ReactNode;
};

export default function AdminPaymentsLayout({
  children,
}: AdminPaymentsLayoutProps) {
  return (
    <AdminPaymentsProvider>
      <PaymentsSectionLayout>{children}</PaymentsSectionLayout>
    </AdminPaymentsProvider>
  );
}
