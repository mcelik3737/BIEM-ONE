import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  apiBase,
  clearSession,
  setSession,
  unavailable,
  validOrigin,
} from '../../../../lib/server-api';
export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  if (!validOrigin(request))
    return NextResponse.json({ message: 'Geçersiz istek kaynağı.' }, { status: 403 });
  const { action } = await context.params;
  if (!['login', 'refresh', 'logout'].includes(action))
    return new NextResponse(null, { status: 404 });
  try {
    const refreshToken = (await cookies()).get('biem_refresh')?.value;
    if (action === 'logout') {
      if (refreshToken)
        await fetch(`${apiBase()}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          signal: AbortSignal.timeout(10000),
        });
      await clearSession();
      return NextResponse.json({ ok: true });
    }
    if (action === 'refresh' && !refreshToken)
      return NextResponse.json({ message: 'Oturum süresi doldu.' }, { status: 401 });
    const body = action === 'login' ? await request.json() : { refreshToken };
    const result = await fetch(`${apiBase()}/auth/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const data = await result.json();
    if (!result.ok) {
      if (action === 'refresh' && result.status === 401) await clearSession();
      return NextResponse.json(
        { message: data.message ?? 'Giriş yapılamadı.' },
        { status: result.status },
      );
    }
    await setSession(data.tokens);
    return NextResponse.json(data.user, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return unavailable();
  }
}
