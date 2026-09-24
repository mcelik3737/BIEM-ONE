const projectStages = [
  'Teklif',
  'Sözleşme',
  'Keşif',
  'RF Tasarım',
  'Satınalma',
  'Kurulum',
  'Test',
  'Kabul',
  'Sözleşmeli Bakım',
  'Bakım',
];

export default function ProjectsPage() {
  return (
    <section className="stack">
      <div className="page-heading">
        <p className="eyebrow">Projects</p>
        <h1>Delivery pipeline</h1>
        <p className="muted">Track stage flow from first offer through long-term maintenance.</p>
      </div>

      <div className="panel-card">
        <h2>Standard BIEM stages</h2>
        <div className="tag-wrap">
          {projectStages.map((stage) => (
            <span key={stage} className="stage-pill">
              {stage}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
