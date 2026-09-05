"use client";

import type { ReactNode } from "react";
import DashboardSidebarLayout from "@/components/ui/DashboardSidebarLayout";

type OccupantLayoutProps = {
  children: ReactNode;
};

export default function OccupantLayout({ children }: OccupantLayoutProps) {
  return (
    <DashboardSidebarLayout role="OCCUPANT">
      {children}
    </DashboardSidebarLayout>
  );
}
