import type { UserRole } from "@/features/auth/services/auth.service";

/**
 * RBAC Permission Configuration
 *
 * Defines what each role can access in the dashboard.
 * Used by:
 * - DashboardSidebarLayout (menu filtering)
 * - Route-level guards (page visibility)
 */

export type Permission =
  | "dashboard"
  | "user_management"
  | "room_management"
  | "tenant_management"
  | "payment_management"
  | "expense_management"
  | "asset_management"
  | "report_management"
  | "complaint_management";

const rolePermissions: Record<UserRole, Permission[]> = {
  ADMIN: [
    "dashboard",
    "user_management",
    "room_management",
    "tenant_management",
    "payment_management",
    "expense_management",
    "asset_management",
    "report_management",
    "complaint_management",
  ],
  OPERATOR: [
    "dashboard",
    "room_management",
    "tenant_management",
    "payment_management",
    "expense_management",
    "asset_management",
    "report_management",
    "complaint_management",
  ],
  OCCUPANT: ["dashboard", "payment_management", "complaint_management"],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role.
 */
export function getPermissions(role: UserRole): Permission[] {
  return rolePermissions[role] ?? [];
}
