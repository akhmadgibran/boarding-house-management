"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import {
  getDefaultRouteByRole,
  isPathAllowedForRole,
} from "@/features/auth/services/auth-routing";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const hasRoleAccess = user ? isPathAllowedForRole(user.role, pathname) : false;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!hasRoleAccess) {
      router.replace(getDefaultRouteByRole(user.role));
    }
  }, [hasRoleAccess, isLoading, router, user]);

  if (isLoading || !user || !hasRoleAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p className="text-sm text-gray-600">Loading user session...</p>
      </main>
    );
  }

  return <>{children}</>;
}
