const tasks = [
  { title: 'Approve RF design package', owner: 'Project Manager', due: 'Today' },
  { title: 'Dispatch installation crew', owner: 'Field Engineer', due: 'Tomorrow' },
  { title: 'Upload acceptance protocol', owner: 'Operations Admin', due: 'Friday' },
];

export default function TasksPage() {
  return (
    <section className="stack">
      <div className="page-heading">
        <p className="eyebrow">Tasks</p>
        <h1>Operational task board</h1>
        <p className="muted">Keep office coordination and field actions on the same timeline.</p>
      </div>

      <div className="card-list">
        {tasks.map((task) => (
          <article key={task.title} className="panel-card">
            <h2>{task.title}</h2>
            <p>
              {task.owner} · Due {task.due}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
