import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
export const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3000/api/v1').replace(/\/$/, '');
export function validOrigin(request: NextRequest) {
  const origin = process.env.APP_ORIGIN ?? 'http://localhost:3001';
  return request.headers.get('origin') === origin;
}
export async function setSession(tokens: { accessToken: string; refreshToken: string }) {
  const jar = await cookies();
  const settings = {
    httpOnly: true,
    secure: (process.env.APP_ORIGIN ?? '').startsWith('https://'),
    sameSite: 'lax' as const,
    path: '/',
  };
  jar.set('biem_access', tokens.accessToken, { ...settings, maxAge: 900 });
  jar.set('biem_refresh', tokens.refreshToken, { ...settings, maxAge: 604800 });
}
export async function clearSession() {
  const jar = await cookies();
  jar.delete('biem_access');
  jar.delete('biem_refresh');
}
export const unavailable = () =>
  NextResponse.json({ message: 'Sunucuya ulaşılamıyor. Lütfen tekrar deneyin.' }, { status: 503 });
