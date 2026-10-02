import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { apiBase, unavailable, validOrigin } from '../../../../lib/server-api';
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!['GET', 'HEAD'].includes(request.method) && !validOrigin(request))
    return NextResponse.json({ message: 'Geçersiz istek kaynağı.' }, { status: 403 });
  const { path } = await context.params;
  if (
    ![
      'auth',
      'dashboard',
      'customers',
      'suppliers',
      'projects',
      'operations',
      'purchase-orders',
      'tasks',
    ].includes(path[0]) ||
    (path[0] === 'auth' && (path.join('/') !== 'auth/me' || request.method !== 'GET'))
  )
    return new NextResponse(null, { status: 404 });
  const token = (await cookies()).get('biem_access')?.value;
  if (!token) return NextResponse.json({ message: 'Giriş yapın.' }, { status: 401 });
  try {
    const result = await fetch(
      `${apiBase()}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`,
      {
        method: request.method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      },
    );
    return new NextResponse(await result.text(), {
      status: result.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return unavailable();
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
