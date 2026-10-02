'use client';
import { FormEvent } from 'react';
import { useAction } from '../../lib/api';
import { ErrorMessage } from '../../components/ui';
export default function LoginPage() {
  const action = useAction();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void action.run(async () => {
      const response = await fetch('/api/session/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          Array.isArray(result.message) ? result.message.join(' · ') : result.message,
        );
      window.location.assign('/dashboard');
    });
  }
  return (
    <main className="auth-layout">
      <section className="auth-card">
        <span className="brand-icon">B</span>
        <p className="eyebrow">BIEM ONE</p>
        <h1>İşinize odaklanın.</h1>
        <p className="muted">Müşteriden teslimata, tüm operasyonunuz aynı çalışma alanında.</p>
        <form onSubmit={submit} className="stack">
          <label>
            E-posta
            <input type="email" name="email" autoComplete="username" required autoFocus />
          </label>
          <label>
            Parola
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              minLength={8}
            />
          </label>
          <ErrorMessage message={action.error} />
          <button disabled={action.busy}>
            {action.busy ? 'Giriş yapılıyor…' : 'Çalışma alanına gir →'}
          </button>
        </form>
        <p className="small muted">Hesabınız için şirket yöneticinizle görüşün.</p>
      </section>
    </main>
  );
}
