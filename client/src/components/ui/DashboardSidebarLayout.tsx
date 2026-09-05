"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { hasPermission, type Permission } from "@/lib/rbac";
import type { UserRole } from "@/features/auth/services/auth.service";

type DashboardSidebarLayoutProps = {
  role: UserRole;
  children: ReactNode;
};

type NavItem = {
  label: string;
  /** Path segment after the role prefix, e.g. "dashboard", "users" */
  segment: string;
  Icon: ({ className }: { className?: string }) => ReactNode;
  permission: Permission;
};

// ── Icon Components ──────────────────────────────────────

function SidebarTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 hidden -translate-y-1/2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-700 opacity-0 shadow-sm transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 md:block">
      {label}
    </span>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M4.75 10.25 10 5.75l5.25 4.5v5a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1v-5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 16.25v-3.5h4v3.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M7.25 8.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12.75 9.25a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M3.75 15.5a3.5 3.5 0 0 1 7 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10.5 15.5a2.75 2.75 0 0 1 5.5 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RoomIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M3.75 9.25h12.5v5.5H3.75v-5.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 9.25V6.5a1.75 1.75 0 0 1 1.75-1.75h2.5A1.75 1.75 0 0 1 11.5 6.5v2.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 11.75h3.25M3.75 11.75H13"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M5.25 14.75v1.5M14.75 14.75v1.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TenantIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M10 8a2.25 2.25 0 1 0 0-4.5A2.25 2.25 0 0 0 10 8Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5.5 15.75a4.5 4.5 0 0 1 9 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M3.75 8.75 10 3.75l6.25 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaymentIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" className={className}>
      <rect
        x="3.5"
        y="5"
        width="13"
        height="10"
        rx="1.75"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M3.5 8.5h13"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6.5 12h2.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExpenseIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M4 6.5c0-1.105.895-2 2-2h7.5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12.25 10h3.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8 8.25v4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="m6.25 11.25 1.75 1.75 1.75-1.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AssetIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="m10 3.75 5.5 3.25v6L10 16.25 4.5 13v-6L10 3.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 7 10 10.25 15.5 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10 10.25v6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReportIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M4.5 15.5V9.75M10 15.5V6.5M15.5 15.5v-3.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M3.75 15.5h12.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ComplaintIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M10 2.5a7.5 7.5 0 0 0-7.5 7.5c0 1.63.52 3.14 1.4 4.38L3.125 17.5l3.12-.78A7.47 7.47 0 0 0 10 17.5a7.5 7.5 0 0 0 0-15Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 6.5v3.5M10 13.5h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Navigation Items ─────────────────────────────────────
// Each item uses a `segment` (e.g. "dashboard") instead of a full href.
// The full href is computed at render-time based on the role prefix.

const navItems: NavItem[] = [
  { label: "Dashboard", segment: "dashboard", Icon: DashboardIcon, permission: "dashboard" },
  { label: "User Management", segment: "users", Icon: UsersIcon, permission: "user_management" },
  { label: "Room Management", segment: "rooms", Icon: RoomIcon, permission: "room_management" },
  { label: "Tenant Data", segment: "tenants", Icon: TenantIcon, permission: "tenant_management" },
  { label: "Payments", segment: "payments", Icon: PaymentIcon, permission: "payment_management" },
  { label: "Expenses", segment: "expenses", Icon: ExpenseIcon, permission: "expense_management" },
  { label: "Asset Management", segment: "assets", Icon: AssetIcon, permission: "asset_management" },
  { label: "Complaints", segment: "complaints", Icon: ComplaintIcon, permission: "complaint_management" },
  { label: "Reports", segment: "reports", Icon: ReportIcon, permission: "report_management" },
];

const rolePrefixMap: Record<UserRole, string> = {
  ADMIN: "/admin",
  OPERATOR: "/operator",
  OCCUPANT: "/penghuni",
};

const rolePanelLabel: Record<UserRole, string> = {
  ADMIN: "Admin Panel",
  OPERATOR: "Operator Panel",
  OCCUPANT: "Tenant Panel",
};

function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ── Main Component ───────────────────────────────────────

export default function DashboardSidebarLayout({
  role,
  children,
}: DashboardSidebarLayoutProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const prefix = rolePrefixMap[role];
  const panelLabel = rolePanelLabel[role];

  // Filter nav items based on RBAC permissions for the current role
  const filteredNavItems = useMemo(
    () =>
      navItems
        .filter((item) => hasPermission(role, item.permission))
        .map((item) => ({
          ...item,
          href: `${prefix}/${item.segment}`,
        })),
    [role, prefix],
  );

  const handleLogoutClick = () => {
    setIsMobileNavOpen(false);
    logout();
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        <aside
          className={`sticky top-0 z-40 w-full shrink-0 overflow-hidden border-b border-gray-200 bg-white p-4 transition-[width] duration-300 md:h-screen md:overflow-visible md:border-r md:border-b-0 md:p-6 ${
            isCollapsed ? "md:w-24" : "md:w-72"
          }`}
        >
          <div className="flex items-center justify-between gap-3 px-2 md:items-start">
            <div className={`min-w-0 ${isCollapsed ? "md:hidden" : ""}`}>
              <p className="text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase">
                {panelLabel}
              </p>
              <h1 className="mt-1 text-base font-semibold text-gray-900 md:mt-2 md:text-lg">
                Dashboard Kost
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              aria-controls="dashboard-sidebar-nav"
              aria-expanded={isMobileNavOpen}
              aria-label={
                isMobileNavOpen
                  ? "Hide navigation"
                  : "Show navigation"
              }
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:text-gray-900 md:hidden"
            >
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4"
              >
                {isMobileNavOpen ? (
                  <path
                    d="M6 6l8 8M14 6l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <>
                    <path
                      d="M4.5 6.5h11"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M4.5 10h11"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M4.5 13.5h11"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </>
                )}
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:text-gray-900 md:inline-flex"
            >
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                fill="none"
                className={`h-4 w-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
              >
                <path
                  d="m12.5 5-5 5 5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <nav
            id="dashboard-sidebar-nav"
            className={`${isMobileNavOpen ? "mt-6 block" : "hidden"} space-y-1 md:mt-6 md:block`}
          >
            {filteredNavItems.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              const iconWrapperClass = isActive
                ? "border-white/20 bg-white/15 text-white"
                : "border-gray-200 bg-gray-50 text-gray-500 group-hover:border-gray-300 group-hover:bg-white group-hover:text-gray-700";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileNavOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={isCollapsed ? item.label : undefined}
                  className={`group relative flex items-center rounded-lg py-2 text-sm font-medium transition ${
                    isCollapsed ? "px-2 md:justify-center" : "px-3"
                  } ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
                      isCollapsed ? "" : "mr-3"
                    } ${iconWrapperClass}`}
                  >
                    <item.Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className={`truncate ${isCollapsed ? "md:hidden" : ""}`}>
                    {item.label}
                  </span>
                  {isCollapsed ? <SidebarTooltip label={item.label} /> : null}
                </Link>
              );
            })}

            <div className="mt-4 border-t border-gray-200 pt-3">
              <button
                type="button"
                onClick={handleLogoutClick}
                aria-label="Log out of account"
                className={`group relative flex h-10 w-full items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 ${
                  isCollapsed ? "px-2 md:justify-center" : "px-3"
                }`}
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-700 transition group-hover:border-rose-300 group-hover:bg-rose-100">
                  <svg
                    aria-hidden
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-3.5 w-3.5"
                  >
                    <path
                      d="M7.5 3.75h6.25a1.25 1.25 0 0 1 1.25 1.25v10a1.25 1.25 0 0 1-1.25 1.25H7.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10.833 6.667 14.167 10l-3.334 3.333"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M3.75 10h10"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>

                <span
                  className={`truncate ${isCollapsed ? "md:hidden" : ""}`}
                >
                  Log out
                </span>
                {isCollapsed ? <SidebarTooltip label="Log out" /> : null}
              </button>
            </div>
          </nav>
        </aside>

        <section 
          className="min-w-0 flex-1 p-5 md:p-8"
          onClick={() => {
            if (!isCollapsed) setIsCollapsed(true);
            if (isMobileNavOpen) setIsMobileNavOpen(false);
          }}
        >
          {children}
        </section>
      </div>
    </main>
  );
}
