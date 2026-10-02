'use client';
import { useCallback, useEffect, useState } from 'react';
let refreshing: Promise<Response> | undefined;
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const send = () =>
    fetch(`/api/backend/${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      cache: 'no-store',
    });
  let response = await send();
  if (response.status === 401) {
    refreshing ??= fetch('/api/session/refresh', { method: 'POST' }).finally(() => {
      refreshing = undefined;
    });
    const renewed = await refreshing;
    if (renewed.ok) response = await send();
    else if (renewed.status === 401) {
      window.location.assign('/login');
      throw new Error('Oturum süresi doldu.');
    } else throw new Error('Oturum yenilenemedi. Tekrar deneyin.');
  }
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      Array.isArray(data.message) ? data.message.join(' · ') : (data.message ?? 'İşlem başarısız.'),
    );
  return data as T;
}
export function useLoad<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const abort = new AbortController();
    setError('');
    api<T>(path, { signal: abort.signal })
      .then((result) => {
        if (!abort.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [path, revision]);
  return { data, error, reload };
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function run(action: () => Promise<unknown>) {
    if (busy) return false;
    setBusy(true);
    setError('');
    try {
      await action();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}
export const json = (value: unknown) => JSON.stringify(value);
export const money = (value: string | number, currency: string) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value));
export const qty = (value: string | number) =>
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 4 }).format(Number(value));
export const date = (value: string) =>
  new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(new Date(value));
