/**
 * Enumeration of supported request types within the Catalog Request Center.
 */
export enum RequestType {
  RESTAURANT_REGISTRATION = 'RESTAURANT_REGISTRATION',
  FOOD_REPORT = 'FOOD_REPORT',
  SYSTEM_FEEDBACK = 'SYSTEM_FEEDBACK',
}

/**
 * Lifecycle status of a Catalog Request.
 */
export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RESOLVED = 'RESOLVED',
}

/**
 * Actions that an admin can perform when processing a request.
 */
export enum RequestAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  RESOLVE = 'RESOLVE',
}
