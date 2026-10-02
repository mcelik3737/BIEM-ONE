'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { api, json, useAction, useLoad } from '../../../lib/api';
import { Party, Project, salesLabels, operationLabels } from '../../../lib/types';
import { Badge, Empty, ErrorMessage, Modal } from '../../../components/ui';
import { canManage, useUser } from '../../../components/app-shell';
export default function Page() {
  const { data, error, reload } = useLoad<Project[]>('projects');
  const [adding, setAdding] = useState(false),
    [query, setQuery] = useState('');
  const manage = canManage(useUser());
  const rows = data?.filter((p) =>
    `${p.name} ${p.code ?? ''} ${p.customer.name}`
      .toLocaleLowerCase('tr')
      .includes(query.toLocaleLowerCase('tr')),
  );
  return (
    <>
      <header className="page-heading row">
        <div>
          <p className="eyebrow">SATIŞ & OPERASYON</p>
          <h1>İş dosyaları</h1>
          <p className="muted">İlk görüşmeden son teslimata, işin tüm hikâyesi.</p>
        </div>
        {manage && <button onClick={() => setAdding(true)}>+ İş dosyası aç</button>}
      </header>
      <section className="panel-card">
        <div className="toolbar row">
          <label className="search">
            İş dosyası ara
            <input
              placeholder="İş adı, kod veya müşteri"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <span className="muted">{data?.length ?? 0} iş dosyası</span>
        </div>
        <ErrorMessage message={error} />
        {rows?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>İş dosyası</th>
                  <th>Müşteri</th>
                  <th>Satış aşaması</th>
                  <th>Operasyon</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link className="text-link" href={`/projects/${p.id}`}>
                        {p.name}
                      </Link>
                      <small>{p.code || p.location || '—'}</small>
                    </td>
                    <td>{p.customer.shortName || p.customer.name}</td>
                    <td>
                      <Badge good={p.salesStatus === 'WON'}>{salesLabels[p.salesStatus]}</Badge>
                    </td>
                    <td>{p.operation ? operationLabels[p.operation.status] : 'Henüz açılmadı'}</td>
                    <td>
                      <Link href={`/projects/${p.id}`} aria-label={`${p.name} dosyasını aç`}>
                        Aç →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            {!data && !error
              ? 'Yükleniyor…'
              : query
                ? 'Eşleşen iş dosyası yok.'
                : 'İlk iş dosyanızı açarak başlayın.'}
          </Empty>
        )}
      </section>
      {adding && (
        <ProjectForm
          close={() => setAdding(false)}
          saved={() => {
            setAdding(false);
            reload();
          }}
        />
      )}
    </>
  );
}
function ProjectForm({ close, saved }: { close: () => void; saved: () => void }) {
  const { data: customers, error } = useLoad<Party[]>('customers');
  const action = useAction();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget));
    void action.run(async () => {
      await api('projects', { method: 'POST', body: json(body) });
      saved();
    });
  }
  return (
    <Modal title="Yeni iş dosyası" close={close}>
      <form className="stack" onSubmit={submit}>
        <label>
          İş adı *<input name="name" required minLength={2} maxLength={160} />
        </label>
        <label>
          Müşteri *
          <select name="customerId" required defaultValue="">
            <option value="" disabled>
              Müşteri seçin
            </option>
            {customers
              ?.filter((c) => c.isActive)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        {customers?.filter((c) => c.isActive).length === 0 && (
          <p className="muted">Önce müşteri rehberine aktif bir müşteri ekleyin.</p>
        )}
        <div className="form-grid">
          <label>
            İş kodu
            <input name="code" maxLength={80} />
          </label>
          <label>
            Konum
            <input name="location" maxLength={300} />
          </label>
        </div>
        <label>
          Açıklama
          <textarea name="description" maxLength={2000} />
        </label>
        <ErrorMessage message={action.error || error} />
        <button disabled={action.busy || !customers?.some((c) => c.isActive)}>
          İş dosyasını oluştur
        </button>
      </form>
    </Modal>
  );
}
