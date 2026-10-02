'use client';
import { useLoad } from '../../../lib/api';
import { Empty, ErrorMessage } from '../../../components/ui';
export default function Page() {
  const { data, error } =
    useLoad<
      {
        id: string;
        title: string;
        status: string;
        project?: { name: string };
        assignee?: { fullName: string };
      }[]
    >('tasks');
  const statuses: Record<string, string> = {
    TODO: 'Yapılacak',
    IN_PROGRESS: 'Devam ediyor',
    BLOCKED: 'Bekliyor',
    DONE: 'Tamamlandı',
  };
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">EKİP</p>
        <h1>Görevler</h1>
        <p className="muted">
          Mevcut görev kayıtları. Görev oluşturma ve atama sonraki sürüm kapsamında.
        </p>
      </header>
      <section className="panel-card">
        <ErrorMessage message={error} />
        {data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Görev</th>
                  <th>İş dosyası</th>
                  <th>Sorumlu</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>{t.project?.name || '—'}</td>
                    <td>{t.assignee?.fullName || '—'}</td>
                    <td>{statuses[t.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{data ? 'Kayıtlı görev yok.' : 'Yükleniyor…'}</Empty>
        )}
      </section>
    </>
  );
}
