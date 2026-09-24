const customers = [
  { name: 'Biem Teknoloji', focus: 'Internal operations and HQ coordination' },
  { name: 'Anatolia Energy', focus: 'Large-scale solar installation program' },
  { name: 'Marmara Retail', focus: 'Branch maintenance and service continuity' },
];

export default function CustomersPage() {
  return (
    <section className="stack">
      <div className="page-heading">
        <p className="eyebrow">Customers</p>
        <h1>Customer portfolio</h1>
        <p className="muted">Centralize company data, contacts, and project relationships.</p>
      </div>

      <div className="card-list">
        {customers.map((customer) => (
          <article key={customer.name} className="panel-card">
            <h2>{customer.name}</h2>
            <p>{customer.focus}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
