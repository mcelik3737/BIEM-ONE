export default function LoginPage() {
  return (
    <main className="auth-layout">
      <section className="auth-card">
        <p className="eyebrow">BIEM ONE</p>
        <h1>Sign in to operations</h1>
        <p className="muted">
          Use this starter screen to connect the NestJS auth flow and role-aware session handling.
        </p>

        <form className="auth-form">
          <label>
            Email
            <input type="email" placeholder="admin@biem.one" />
          </label>
          <label>
            Password
            <input type="password" placeholder="Admin123!" />
          </label>
          <button type="submit">Login</button>
        </form>

        <div className="status-panel">
          <strong>Starter credential</strong>
          <span>`admin@biem.one` / `Admin123!`</span>
        </div>
      </section>
    </main>
  );
}
