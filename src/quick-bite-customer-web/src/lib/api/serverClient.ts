import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';
import { HttpMethod } from './httpMethod';

export interface ServerFetchOptions extends Omit<RequestInit, 'method' | 'body'> {
  method?: HttpMethod | `${HttpMethod}`;
  body?: any;
  token?: string | null;
  requireAuth?: boolean;
}

/**
 * Executes a server-side fetch to backend microservices or API Gateway.
 * Automatically injects NextAuth Bearer token, JSON headers, and default cache settings.
 */
export async function serverFetch(
  url: string,
  options: ServerFetchOptions = {},
  req?: NextRequest
): Promise<Response> {
  const {
    method = HttpMethod.GET,
    body,
    token: customToken,
    requireAuth = false,
    headers,
    cache = 'no-store',
    ...rest
  } = options;

  let token = customToken;
  if (token === undefined) {
    const session = await getServerSession(authOptions);
    const authHeader = req?.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    token = session?.accessToken || headerToken;
  }

  if (requireAuth && !token) {
    return new Response(
      JSON.stringify({ message: 'Vui lòng đăng nhập để thực hiện thao tác này' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isJsonBody = body !== undefined && !isFormData;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string>),
  };

  return fetch(url, {
    method,
    headers: requestHeaders,
    cache,
    body: isJsonBody && typeof body === 'object' ? JSON.stringify(body) : body,
    ...rest,
  });
}

// Convenience server-side helpers
serverFetch.get = (url: string, options?: Omit<ServerFetchOptions, 'method' | 'body'>, req?: NextRequest) =>
  serverFetch(url, { ...options, method: HttpMethod.GET }, req);

serverFetch.post = (url: string, body?: any, options?: Omit<ServerFetchOptions, 'method' | 'body'>, req?: NextRequest) =>
  serverFetch(url, { ...options, method: HttpMethod.POST, body }, req);

serverFetch.put = (url: string, body?: any, options?: Omit<ServerFetchOptions, 'method' | 'body'>, req?: NextRequest) =>
  serverFetch(url, { ...options, method: HttpMethod.PUT, body }, req);

serverFetch.patch = (url: string, body?: any, options?: Omit<ServerFetchOptions, 'method' | 'body'>, req?: NextRequest) =>
  serverFetch(url, { ...options, method: HttpMethod.PATCH, body }, req);

serverFetch.delete = (url: string, options?: Omit<ServerFetchOptions, 'method' | 'body'>, req?: NextRequest) =>
  serverFetch(url, { ...options, method: HttpMethod.DELETE }, req);

/**
 * Proxies a backend response directly to a Next.js NextResponse.
 */
export async function proxyResponse(backendResponse: Response): Promise<NextResponse> {
  if (!backendResponse.ok) {
    const errorText = await backendResponse.text().catch(() => '');
    let errorMessage = 'Lỗi máy chủ khi xử lý yêu cầu';
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed?.error?.message || parsed?.message || errorMessage;
    } catch {}

    return NextResponse.json(
      { message: errorMessage, details: errorText },
      { status: backendResponse.status || 500 }
    );
  }

  const data = await backendResponse.json().catch(() => ({ success: true }));
  return NextResponse.json(data, { status: backendResponse.status });
}
