import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { DecodedJwtClaims, LoginRequest, OpenIdTokenResponse, Role, User } from '../types';

// Gọi trực tiếp SSO Identity Server tại http://localhost:44391
const identityBaseUrl = import.meta.env.VITE_IDENTITY_SERVICE_URL || 'http://localhost:44391';

const identityClient = axios.create({
  baseURL: identityBaseUrl,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  timeout: 10000,
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
  // Normalize Role from claims (handle array or string, case insensitive)
  let userRole: Role = 'Customer';
  
  const rawRole = claims.role;
  if (rawRole) {
    const rolesArray = Array.isArray(rawRole) ? rawRole : [rawRole];
    const rolesLower = rolesArray.map((r) => r.toLowerCase());

    if (rolesLower.includes('admin') || rolesLower.includes('administrator')) {
      userRole = 'Admin';
    } else if (rolesLower.includes('merchant') || rolesLower.includes('seller') || rolesLower.includes('restaurant')) {
      userRole = 'Merchant';
    }
  }

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

  return {
    id: claims.sub || 'user-id-unknown',
    email,
    username,
    fullName,
    role: userRole,
    isActive: true,
    permissions,
  };
}

/**
 * Perform OAuth 2.0 /connect/token login to Identity Server (SSO)
 */
export async function loginUser(credentials: LoginRequest): Promise<User> {
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('client_id', import.meta.env.VITE_OIDC_CLIENT_ID || 'QuickBite_Portal');
  params.append('scope', import.meta.env.VITE_OIDC_SCOPE || 'openid profile email roles');
  params.append('username', credentials.username);
  params.append('password', credentials.password);

  // Gửi request tới /connect/token
  const res = await identityClient.post('/connect/token', params);
  const response: OpenIdTokenResponse = res.data;

  const accessToken = response.access_token;
  if (!accessToken) {
    throw new Error('Access token missing from authentication response');
  }

  // Decode JWT claims từ access_token (hoặc id_token)
  const claims = parseJwt<DecodedJwtClaims>(accessToken) || parseJwt<DecodedJwtClaims>(response.id_token || '');
  if (!claims) {
    throw new Error('Unable to parse JWT token claims');
  }

  const user = extractUserFromClaims(claims);

  // Store in Zustand
  useAuthStore.getState().setAuth(user, accessToken, response.id_token);

  return user;
}

/**
 * Perform logout action
 */
export function logoutUser(): void {
  useAuthStore.getState().logout();
}
