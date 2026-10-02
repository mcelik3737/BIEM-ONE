'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCurrentUser, getAccessToken, login, storeAuthSession } from '../lib/auth-client';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      return;
    }

    let isMounted = true;

    fetchCurrentUser()
      .then(() => {
        if (isMounted) {
          router.replace('/dashboard');
        }
      })
      .catch(() => {
        // Invalid stored sessions are handled when the protected shell loads.
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      storeAuthSession(result.tokens);
      router.replace('/dashboard');
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Giriş yapılamadı.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          E-posta
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@biem.one"
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          Şifre
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Şifrenizi girin"
            required
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </>
  );
}
