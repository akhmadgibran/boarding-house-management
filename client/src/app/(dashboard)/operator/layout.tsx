"use client";

import type { ReactNode } from "react";
import DashboardSidebarLayout from "@/components/ui/DashboardSidebarLayout";

type OperatorLayoutProps = {
  children: ReactNode;
};

export default function OperatorLayout({ children }: OperatorLayoutProps) {
  return (
    <DashboardSidebarLayout role="OPERATOR">
      {children}
    </DashboardSidebarLayout>
  );
}
