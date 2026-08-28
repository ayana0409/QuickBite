import { HttpMethod } from './httpMethod';

export interface ApiClientOptions extends Omit<RequestInit, 'method' | 'body'> {
  method?: HttpMethod | `${HttpMethod}`;
  body?: any;
  params?: Record<string, string | number | boolean | undefined | null>;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

/**
 * Lightweight, unified HTTP client for client-side and server-side API requests.
 * Automatically injects standard JSON headers, handles Next.js cache settings, and unwraps ABP/ApiResponse envelopes.
 */
export async function apiClient<T = any>(
  url: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { method = HttpMethod.GET, body, params, headers, cache, ...rest } = options;

  // Do not force 'no-store' if 'next' revalidation options are present, allowing Next.js Data Cache/ISR
  const resolvedCache = cache !== undefined ? cache : (rest as any).next ? undefined : 'no-store';

  let requestUrl = url;
  if (params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    if (queryString) {
      requestUrl += (requestUrl.includes('?') ? '&' : '?') + queryString;
    }
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isJsonBody = body !== undefined && !isFormData;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
    ...(headers as Record<string, string>),
  };

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
    body: isJsonBody ? JSON.stringify(body) : body,
    ...rest,
  };

  if (resolvedCache) {
    fetchOptions.cache = resolvedCache;
  }

  const response = await fetch(requestUrl, fetchOptions);

  if (!response.ok) {
    let errorMessage = `Yêu cầu thất bại với mã lỗi HTTP ${response.status}`;

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') || response.headers.get('Retry-After');
      errorMessage =
        retryAfter && !isNaN(Number(retryAfter))
          ? `Hệ thống đang quá tải do nhận nhiều yêu cầu. Vui lòng thử lại sau ${retryAfter} giây.`
          : 'Hệ thống đang quá tải do nhận lượng lớn yêu cầu cùng lúc. Vui lòng thử lại sau giây lát.';

      // Dispatch global rate limit event to notify UI ToastProvider
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('quickbite:rate-limited', {
            detail: { message: errorMessage, retryAfter: retryAfter ? Number(retryAfter) : null },
          })
        );
      }
    } else {
      try {
        const errorJson = await response.json();
        errorMessage =
          errorJson?.message ||
          errorJson?.error?.message ||
          errorJson?.details ||
          errorMessage;
      } catch {
        const text = await response.text().catch(() => '');
        if (text) errorMessage = text;
      }
    }

    throw new Error(errorMessage);
  }

  // If 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const json = await response.json().catch(() => null);

  // Unwrap ABP / standard API wrappers: { result: T } or { data: T }
  if (json && typeof json === 'object') {
    if ('result' in json && json.result !== undefined) {
      return json.result as T;
    }
    if ('data' in json && json.data !== undefined) {
      return json.data as T;
    }
  }

  return json as T;
}

// Convenience helper methods
apiClient.get = <T = any>(url: string, options?: Omit<ApiClientOptions, 'method' | 'body'>) =>
  apiClient<T>(url, { ...options, method: HttpMethod.GET });

apiClient.post = <T = any>(url: string, body?: any, options?: Omit<ApiClientOptions, 'method' | 'body'>) =>
  apiClient<T>(url, { ...options, method: HttpMethod.POST, body });

apiClient.put = <T = any>(url: string, body?: any, options?: Omit<ApiClientOptions, 'method' | 'body'>) =>
  apiClient<T>(url, { ...options, method: HttpMethod.PUT, body });

apiClient.patch = <T = any>(url: string, body?: any, options?: Omit<ApiClientOptions, 'method' | 'body'>) =>
  apiClient<T>(url, { ...options, method: HttpMethod.PATCH, body });

apiClient.delete = <T = any>(url: string, options?: Omit<ApiClientOptions, 'method' | 'body'>) =>
  apiClient<T>(url, { ...options, method: HttpMethod.DELETE });
