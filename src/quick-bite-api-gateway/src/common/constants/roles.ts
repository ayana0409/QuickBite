/**
 * Centralized Role Constants and Permissions Matrix for QuickBite API Gateway
 */

export const ADMIN_ROLES = [
  'admin',
  'administrator',
  'superadmin',
  'system_admin',
  'quickbite-admin',
  'gateway.config.update',
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

/** Roles permitted to access Admin Portal BFF endpoints */
export const ADMIN_PORTAL_ROLES = [
  ...ADMIN_ROLES,
  ...SUB_ADMIN_ROLES,
  ...MANAGER_ROLES,
  'order.orders.adminview',
] as const;

/** Roles permitted to access User Management endpoints */
export const USER_MANAGEMENT_ROLES = [
  ...ADMIN_ROLES,
  ...SUB_ADMIN_ROLES,
] as const;

/** Roles permitted to access System Configuration endpoints */
export const SYSTEM_CONFIG_ROLES = [
  ...ADMIN_ROLES,
] as const;
