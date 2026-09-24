export default function SettingsPage() {
  return (
    <section className="stack">
      <div className="page-heading">
        <p className="eyebrow">Settings</p>
        <h1>Platform configuration</h1>
        <p className="muted">
          This starter page is ready for RBAC policies, notification rules, and workflow settings.
        </p>
      </div>

      <div className="content-grid">
        <article className="panel-card">
          <h2>Access control</h2>
          <p>Connect role management here using the `/roles` and `/permissions` endpoints.</p>
        </article>
        <article className="panel-card">
          <h2>Automation rules</h2>
          <p>Use this section for project stage triggers, reminders, and future AI workflows.</p>
        </article>
      </div>
    </section>
  );
}
