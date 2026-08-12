/**
 * Global Response Unwrapper Helper cho tất cả Backend Microservices (NestJS, .NET ABP, Java)
 * Cấu trúc Response chuẩn:
 * {
 *   success: boolean;
 *   statusCode: number;
 *   message: string;
 *   data: any;
 *   timestamp: string;
 *   path: string;
 * }
 */

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp?: string;
  path?: string;
  errors?: any;
}

/**
 * Giải nén object dữ liệu đơn lẻ từ Backend ApiResponse
 */
export function unwrapData<T = any>(res: any): T | null {
  if (!res) return null;
  if (typeof res === 'object' && 'success' in res && res.success === false) {
    console.warn(`[API WARN ${res.statusCode || 400}] ${res.message || 'Error'}`);
    return null;
  }
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data;
  }
  return res;
}

/**
 * Giải nén Mảng dữ liệu linh hoạt từ bất kỳ cấu trúc ApiResponse nào (kể cả phân trang data.data hay data.categories)
 */
export function unwrapArray<T = any>(res: any): T[] {
  if (!res) return [];
  if (typeof res === 'object' && 'success' in res && res.success === false) {
    return [];
  }

  // Nếu res chính nó là Array
  if (Array.isArray(res)) return res;

  // Lấy payload bên trong res.data nếu có
  const target = res && typeof res === 'object' && 'data' in res ? res.data : res;

  if (Array.isArray(target)) return target;
  if (Array.isArray(target?.data)) return target.data;
  if (Array.isArray(target?.items)) return target.items;
  if (Array.isArray(target?.categories)) return target.categories;
  if (Array.isArray(target?.foodItems)) return target.foodItems;
  if (Array.isArray(target?.result)) return target.result;
  if (Array.isArray(target?.restaurants)) return target.restaurants;

  return [];
}
