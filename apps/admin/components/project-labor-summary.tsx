'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LaborCosts, formatMoney, personnelRequest } from '../lib/personnel-client';
export function ProjectLaborSummary({ projectId }: { projectId: string }) {
  const [data, setData] = useState<LaborCosts | null>(null),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    personnelRequest<LaborCosts>(`/project-costs/${projectId}`)
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [projectId, attempt]);
  return (
    <section className="panel-card stack hr-project-cost">
      <h3>Gerçek işçilik maliyeti</h3>
      <p className="muted">
        Bu işe bağlanan onaylı puantajların toplamı. BOM işçilik tahminiyle ayrıca toplanmaz.
      </p>
      {error ? (
        <p role="alert">
          {error} <button onClick={() => setAttempt((v) => v + 1)}>Yenile</button>
        </p>
      ) : !data ? (
        <p>İşçilik maliyeti yükleniyor…</p>
      ) : (
        <>
          <div className="hr-total-row">
            {Object.entries(data.totals).map(([c, n]) => (
              <strong key={c}>{formatMoney(n, c)}</strong>
            ))}
          </div>
          {!data.rows.length && <p>Onaylı işçilik kaydı yok.</p>}
          <p>{data.pendingCount} kayıt onay bekliyor.</p>
        </>
      )}
      <Link href="/personnel">Personel ve puantajı aç →</Link>
    </section>
  );
}
