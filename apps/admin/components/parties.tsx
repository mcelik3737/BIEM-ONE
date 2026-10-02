'use client';
import { FormEvent, useState } from 'react';
import { api, json, useAction, useLoad } from '../lib/api';
import { Party } from '../lib/types';
import { canManage, useUser } from './app-shell';
import { Badge, Empty, ErrorMessage, Modal } from './ui';
export function Parties({ kind }: { kind: 'customers' | 'suppliers' }) {
  const label = kind === 'customers' ? 'Müşteri' : 'Tedarikçi';
  const [query, setQuery] = useState(''),
    [editing, setEditing] = useState<Party | 'new'>();
  const { data, error, reload } = useLoad<Party[]>(kind);
  const action = useAction();
  const manage = canManage(useUser());
  const rows = data?.filter((p) =>
    [p.name, p.shortName, p.contactName, p.taxNumber].some((v) =>
      v?.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')),
    ),
  );
  return (
    <>
      <header className="page-heading row">
        <div>
          <p className="eyebrow">FİRMA REHBERİ</p>
          <h1>{label}ler</h1>
          <p className="muted">İletişim, vergi bilgileri ve iş ilişkileri.</p>
        </div>
        {manage && <button onClick={() => setEditing('new')}>+ {label} ekle</button>}
      </header>
      <section className="panel-card">
        <div className="row toolbar">
          <label className="search">
            {label} ara
            <input
              placeholder="Unvan, yetkili veya vergi numarası"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <span className="muted">{data?.length ?? 0} kayıt</span>
        </div>
        <ErrorMessage message={error || action.error} />
        {!data && !error ? (
          <Empty>Yükleniyor…</Empty>
        ) : rows?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Firma</th>
                  <th>Yetkili / İletişim</th>
                  <th>Vergi bilgileri</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      <small>{p.shortName || p.address}</small>
                    </td>
                    <td>
                      {p.contactName || '—'}
                      <small>{p.email || p.phone || 'İletişim eklenmedi'}</small>
                    </td>
                    <td>
                      {p.taxNumber || '—'}
                      <small>{p.taxOffice}</small>
                    </td>
                    <td>
                      <Badge good={p.isActive}>{p.isActive ? 'Aktif' : 'Pasif'}</Badge>
                    </td>
                    <td>
                      {manage && (
                        <div className="row">
                          <button className="secondary compact" onClick={() => setEditing(p)}>
                            Düzenle
                          </button>
                          <button
                            className="text-button"
                            disabled={action.busy}
                            onClick={() =>
                              action.run(async () => {
                                await api(`${kind}/${p.id}`, {
                                  method: 'PATCH',
                                  body: json({ isActive: !p.isActive }),
                                });
                                reload();
                              })
                            }
                          >
                            {p.isActive ? 'Pasife al' : 'Aktifleştir'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>
            {query
              ? 'Aramanızla eşleşen kayıt yok.'
              : `Henüz ${label.toLocaleLowerCase('tr')} yok. İlk kaydı ekleyerek başlayın.`}
          </Empty>
        )}
      </section>
      {editing && (
        <PartyForm
          kind={kind}
          item={editing === 'new' ? undefined : editing}
          close={() => setEditing(undefined)}
          saved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
    </>
  );
}
function PartyForm({
  kind,
  item,
  close,
  saved,
}: {
  kind: string;
  item?: Party;
  close: () => void;
  saved: () => void;
}) {
  const action = useAction();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const body = raw;
    void action.run(async () => {
      await api(`${kind}${item ? `/${item.id}` : ''}`, {
        method: item ? 'PATCH' : 'POST',
        body: json(body),
      });
      saved();
    });
  }
  const fields: [keyof Party, string, number][] = [
    ['name', 'Firma unvanı', 160],
    ['shortName', 'Kısa ad', 80],
    ['contactName', 'Yetkili kişi', 120],
    ['phone', 'Telefon', 50],
    ['email', 'E-posta', 254],
    ['taxOffice', 'Vergi dairesi', 80],
    ['taxNumber', 'Vergi numarası', 40],
    ['address', 'Adres', 500],
  ];
  return (
    <Modal
      title={`${item ? 'Düzenle' : 'Yeni kayıt'} · ${kind === 'customers' ? 'Müşteri' : 'Tedarikçi'}`}
      close={close}
    >
      <form className="stack" onSubmit={submit}>
        <div className="form-grid">
          {fields.map(([key, label, max]) => (
            <label key={key}>
              {label}
              {key === 'name' ? ' *' : ''}
              <input
                name={key}
                type={key === 'email' ? 'email' : 'text'}
                required={key === 'name'}
                minLength={key === 'name' ? 2 : undefined}
                maxLength={max}
                defaultValue={String(item?.[key] ?? '')}
              />
            </label>
          ))}
        </div>
        <label>
          Notlar
          <textarea name="notes" defaultValue={item?.notes ?? ''} maxLength={2000} />
        </label>
        <ErrorMessage message={action.error} />
        <button disabled={action.busy}>{action.busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </form>
    </Modal>
  );
}
