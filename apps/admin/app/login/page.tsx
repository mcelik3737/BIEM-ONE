import { LoginForm } from '../../components/login-form';

export default function LoginPage() {
  return (
    <main className="auth-layout">
      <section className="auth-card">
        <p className="eyebrow">BIEM ONE</p>
        <h1>Çalışma alanınıza giriş yapın</h1>
        <p className="muted">
          Müşterilerinizi, iş dosyalarınızı ve satınalma teslimatlarını tek yerden yönetin.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
