const metrics = [
  { label: 'Active Projects', value: '18', hint: '5 approaching handover' },
  { label: 'Open Tasks', value: '42', hint: '12 assigned to field teams' },
  { label: 'Unread Alerts', value: '7', hint: '3 need approval today' },
];

export default function DashboardPage() {
  return (
    <section className="stack">
      <div className="page-heading">
        <p className="eyebrow">Dashboard</p>
        <h1>Business operations overview</h1>
        <p className="muted">
          A compact command center for delivery, maintenance, and customer follow-up.
        </p>
      </div>

      <div className="metric-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="panel-card metric-card">
            <span className="metric-label">{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.hint}</p>
          </article>
        ))}
      </div>

      <div className="content-grid">
        <article className="panel-card">
          <h2>Priority pipeline</h2>
          <ul className="info-list">
            <li>Solar campus rollout moved to Test stage.</li>
            <li>RF Tasarım review is pending for 2 projects.</li>
            <li>Maintenance renewal reminders should trigger tomorrow.</li>
          </ul>
        </article>

        <article className="panel-card accent-card">
          <h2>AI analysis placeholder</h2>
          <p>
            Reserve this space for risk summaries, delay forecasts, and document insights once AI
            workflows are connected.
          </p>
        </article>
      </div>
    </section>
  );
}
