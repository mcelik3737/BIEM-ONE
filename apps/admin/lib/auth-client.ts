const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

const ACCESS_TOKEN_KEY = 'biem-one.access-token';
const REFRESH_TOKEN_KEY = 'biem-one.refresh-token';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  companyId: string;
  company?: {
    id: string;
    name: string;
    slug: string;
  };
  roles: string[];
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeAuthSession(tokens: AuthTokens) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearAuthSession() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).catch(() => { throw new Error('Giriş sunucusuna ulaşılamıyor. Lütfen yeniden deneyin.'); });

  if (!response.ok) {
    throw new Error(response.status === 401 ? 'E-posta veya şifre hatalı.' : 'Giriş yapılamadı. Lütfen yeniden deneyin.');
  }

  return response.json() as Promise<LoginResponse>;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error('Lütfen giriş yapın.');
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Oturum süresi doldu. Yeniden giriş yapın.');
  }

  return response.json() as Promise<AuthUser>;
}
