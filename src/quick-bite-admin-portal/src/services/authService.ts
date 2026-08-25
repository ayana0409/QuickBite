import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { DecodedJwtClaims, LoginRequest, OpenIdTokenResponse, User } from '../types';

// Direct SSO Identity Server endpoint
const identityBaseUrl = import.meta.env.VITE_IDENTITY_SERVICE_URL || 'http://localhost:44391';

const identityClient = axios.create({
  baseURL: identityBaseUrl,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  timeout: 60000,
});

/**
 * Utility function to parse standard JWT payload safely
 */
export function parseJwt<T = DecodedJwtClaims>(token: string): T | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload) as T;
  } catch (error) {
    console.error('Failed to parse JWT token:', error);
    return null;
  }
}

/**
 * Extract User domain model from decoded JWT Claims
 */
export function extractUserFromClaims(claims: DecodedJwtClaims): User {
  // Normalize Roles from claims (handle array, string, or Microsoft role claim)
  const rawRole =
    claims.role ||
    claims.roles ||
    claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
    claims['role'] ||
    [];

  let rolesList: string[] = [];
  if (Array.isArray(rawRole)) {
    rolesList = rawRole.map((r) => String(r).trim()).filter(Boolean);
  } else if (typeof rawRole === 'string' && rawRole.trim()) {
    try {
      const parsed = JSON.parse(rawRole);
      rolesList = Array.isArray(parsed) ? parsed.map((r) => String(r).trim()) : [rawRole.trim()];
    } catch {
      rolesList = rawRole.split(/[,\s]+/).map((r) => r.trim()).filter(Boolean);
    }
  }

  const primaryRole = rolesList[0];

  // Parse permissions claim (could be JSON string or Array)
  let permissions: string[] = [];
  if (claims.permissions) {
    if (typeof claims.permissions === 'string') {
      try {
        permissions = JSON.parse(claims.permissions);
      } catch {
        permissions = [claims.permissions];
      }
    } else if (Array.isArray(claims.permissions)) {
      permissions = claims.permissions;
    }
  }

  const username = claims.preferred_username || claims.given_name || claims.sub || 'User';
  const email = claims.email || `${username}@quickbite.internal`;
  const fullName = claims.given_name || claims.name || claims.preferred_username || username;

  const isGoogle =
    claims.idp === 'Google' ||
    claims.iss?.includes('google') ||
    (typeof window !== 'undefined' && localStorage.getItem('auth_provider') === 'google');

  return {
    id: claims.sub || 'user-id-unknown',
    email,
    username,
    fullName,
    role: primaryRole,
    roles: rolesList,
    isActive: true,
    permissions,
    provider: isGoogle ? 'google' : 'credentials',
    isGoogle,
  };
}

/**
 * Perform OAuth 2.0 /connect/token login to Identity Server (SSO)
 */
export async function loginUser(credentials: LoginRequest): Promise<User> {
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('client_id', import.meta.env.VITE_OIDC_CLIENT_ID || 'QuickBite_Portal');
  params.append('scope', import.meta.env.VITE_OIDC_SCOPE || 'openid profile email roles offline_access Identity');
  params.append('username', credentials.username);
  params.append('password', credentials.password);

  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_provider', 'credentials');
  }

  // Send request to /connect/token
  const res = await identityClient.post('/connect/token', params);
  const response: OpenIdTokenResponse = res.data;

  const accessToken = response.access_token;
  if (!accessToken) {
    throw new Error('Access token missing from authentication response');
  }

  // Decode JWT claims from access_token (or id_token)
  const claims = parseJwt<DecodedJwtClaims>(accessToken) || parseJwt<DecodedJwtClaims>(response.id_token || '');
  if (!claims) {
    throw new Error('Unable to parse JWT token claims');
  }

  const user = extractUserFromClaims(claims);

  // Store in Zustand with refresh_token
  useAuthStore.getState().setAuth(user, accessToken, response.refresh_token, response.id_token);

  return user;
}

/**
 * Perform Google OAuth login to ABP Identity Server
 */
export async function loginWithGoogle(idToken: string): Promise<User> {
  const identityUrl = import.meta.env.VITE_IDENTITY_SERVICE_URL || 'https://quick-bite-identity.onrender.com';
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_provider', 'google');
  }

  const res = await axios.post(`${identityUrl}/api/app/auth/google-login`, { idToken });
  const response: OpenIdTokenResponse = res.data;

  const accessToken = response.access_token;
  if (!accessToken) {
    throw new Error('Access token missing from authentication response');
  }

  const claims = parseJwt<DecodedJwtClaims>(accessToken) || parseJwt<DecodedJwtClaims>(response.id_token || '');
  if (!claims) {
    throw new Error('Unable to parse JWT token claims');
  }

  const user = extractUserFromClaims(claims);
  user.provider = 'google';
  user.isGoogle = true;

  useAuthStore.getState().setAuth(user, accessToken, response.refresh_token, response.id_token);
  return user;
}

/**
 * Request a new access token using a refresh token via OAuth 2.0 /connect/token
 */
export async function refreshAccessToken(): Promise<{ accessToken: string; refreshToken?: string }> {
  const currentRefreshToken = useAuthStore.getState().refreshToken;
  if (!currentRefreshToken) {
    throw new Error('No refresh token available');
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('client_id', import.meta.env.VITE_OIDC_CLIENT_ID || 'QuickBite_Portal');
  params.append('refresh_token', currentRefreshToken);
  params.append('scope', import.meta.env.VITE_OIDC_SCOPE || 'openid profile email roles offline_access Identity');

  console.log('🔄 [AUTH] Refreshing access token with refresh_token...');
  const res = await identityClient.post('/connect/token', params);
  const response: OpenIdTokenResponse = res.data;

  const newAccessToken = response.access_token;
  if (!newAccessToken) {
    throw new Error('Access token missing from refresh token response');
  }

  const newRefreshToken = response.refresh_token || currentRefreshToken;

  // Update store with new tokens
  useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
  console.log('✅ [AUTH] Access token refreshed successfully.');

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Perform logout action
 */
export function logoutUser(): void {
  useAuthStore.getState().logout();
}
