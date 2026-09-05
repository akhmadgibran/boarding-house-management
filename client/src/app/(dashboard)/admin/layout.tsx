"use client";

import type { ReactNode } from "react";
import DashboardSidebarLayout from "@/components/ui/DashboardSidebarLayout";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <DashboardSidebarLayout role="ADMIN">
      {children}
    </DashboardSidebarLayout>
  );
}
