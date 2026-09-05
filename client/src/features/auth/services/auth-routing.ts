import type { UserRole } from './auth.service';

const roleBasePathMap: Record<UserRole, string> = {
  ADMIN: '/admin',
  OPERATOR: '/operator',
  OCCUPANT: '/penghuni',
};

export const getDefaultRouteByRole = (role: UserRole): string => {
  return `${roleBasePathMap[role]}/dashboard`;
};

export const isPathAllowedForRole = (
  role: UserRole,
  pathname: string
): boolean => {
  const basePath = roleBasePathMap[role];
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
};