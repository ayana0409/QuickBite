/**
 * Centralized Role Definitions and Access Control Matrix for QuickBite
 */

// 1. Role Groups
export const ADMIN_ROLES = [
  'admin',
  'administrator',
  'superadmin',
  'system_admin',
  'quickbite-admin',
] as const;

export const SUB_ADMIN_ROLES = [
  'sub-admin',
  'subadmin',
  'sub_admin',
  'quickbite-sub-admin',
] as const;

export const MANAGER_ROLES = [
  'manager',
  'quickbite-manager',
] as const;

export const MERCHANT_ROLES = [
  'merchant',
  'seller',
  'restaurant',
  'quickbite-merchant',
] as const;

// 2. Permission Grouping Collections
/** Roles permitted to access Admin Portal (Dashboard, Orders, Restaurants, Categories, Requests, Reports) */
export const ADMIN_PORTAL_ROLES = [
  ...ADMIN_ROLES,
  ...SUB_ADMIN_ROLES,
  ...MANAGER_ROLES,
] as const;

/** Roles permitted to manage Users (/admin/users) */
export const USER_MANAGEMENT_ROLES = [
  ...ADMIN_ROLES,
  ...SUB_ADMIN_ROLES,
] as const;

/** Roles permitted to configure System Settings (/admin/settings) */
export const SYSTEM_CONFIG_ROLES = [
  ...ADMIN_ROLES,
] as const;

// 3. Helper Functions
/**
 * Safely extracts normalized lower-case roles from user object
 */
export function getUserRoles(user: { role?: string; roles?: string[] } | null | undefined): string[] {
  if (!user) return [];
  const rawRoles = user.roles && user.roles.length > 0 ? user.roles : (user.role ? [user.role] : []);
  return rawRoles.map((r) => String(r).toLowerCase().trim()).filter(Boolean);
}

/**
 * Checks if user's roles match any of the target roles
 */
export function hasRoleMatch(userRoles: string[], targetRoles: readonly string[]): boolean {
  return targetRoles.some((target) => userRoles.includes(target.toLowerCase()));
}

/**
 * Checks if user belongs to Admin group
 */
export function isAdmin(user: { role?: string; roles?: string[] } | null | undefined): boolean {
  return hasRoleMatch(getUserRoles(user), ADMIN_ROLES);
}

/**
 * Checks if user belongs to Sub-Admin group
 */
export function isSubAdmin(user: { role?: string; roles?: string[] } | null | undefined): boolean {
  return hasRoleMatch(getUserRoles(user), SUB_ADMIN_ROLES);
}

/**
 * Checks if user belongs to Manager group
 */
export function isManager(user: { role?: string; roles?: string[] } | null | undefined): boolean {
  return hasRoleMatch(getUserRoles(user), MANAGER_ROLES);
}

/**
 * Checks if user belongs to Merchant group
 */
export function isMerchant(user: { role?: string; roles?: string[] } | null | undefined): boolean {
  return hasRoleMatch(getUserRoles(user), MERCHANT_ROLES);
}

/**
 * Checks if user can access Admin Portal
 */
export function canAccessAdminPortal(user: { role?: string; roles?: string[] } | null | undefined): boolean {
  return hasRoleMatch(getUserRoles(user), ADMIN_PORTAL_ROLES);
}

/**
 * Checks if user can manage users
 */
export function canManageUsers(user: { role?: string; roles?: string[] } | null | undefined): boolean {
  return hasRoleMatch(getUserRoles(user), USER_MANAGEMENT_ROLES);
}

/**
 * Checks if user can access system configuration
 */
export function canAccessSystemConfig(user: { role?: string; roles?: string[] } | null | undefined): boolean {
  return hasRoleMatch(getUserRoles(user), SYSTEM_CONFIG_ROLES);
}

/**
 * Returns formatted role badge label for UI headers
 */
export function getRoleBadgeLabel(user: { role?: string; roles?: string[] } | null | undefined): string {
  if (isAdmin(user)) return 'ADMIN';
  if (isSubAdmin(user)) return 'SUB-ADMIN';
  if (isManager(user)) return 'MANAGER';
  if (isMerchant(user)) return 'MERCHANT';
  return 'STAFF';
}
