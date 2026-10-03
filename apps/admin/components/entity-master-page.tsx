'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Customer,
  Supplier,
  UnauthorizedError,
  fetchCustomers,
  fetchSuppliers,
  setCustomerActive,
  setSupplierActive,
} from '../lib/projects-client';
import { BusinessEntityModal } from './business-entity-modal';

type Entity = Customer | Supplier;
export function EntityMasterPage({ type }: { type: 'customer' | 'supplier' }) {
  const router = useRouter(),
    customer = type === 'customer';
  const [items, setItems] = useState<Entity[]>([]),
    [selected, setSelected] = useState<Entity | null>(null),
    [editing, setEditing] = useState<Entity | null | undefined>(undefined);
  const [search, setSearch] = useState(''),
    [activeFilter, setActiveFilter] = useState('active'),
    [error, setError] = useState(''),
    [pendingId, setPendingId] = useState('');
  const load = useCallback(async () => {
    try {
      const values = customer ? await fetchCustomers() : await fetchSuppliers();
      setItems(values);
      setSelected((current) => values.find((item) => item.id === current?.id) ?? values[0] ?? null);
    } catch (requestError) {
      if (requestError instanceof UnauthorizedError) router.replace('/login');
      else setError(requestError instanceof Error ? requestError.message : 'Kayıtlar yüklenemedi.');
    }
  }, [customer, router]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          `${item.name} ${item.contactName ?? ''} ${item.email ?? ''} ${item.phone ?? ''} ${item.taxNumber ?? ''}`
            .toLocaleLowerCase('tr-TR')
            .includes(search.toLocaleLowerCase('tr-TR')) &&
          (activeFilter === 'all' || item.isActive === (activeFilter === 'active')),
      ),
    [items, search, activeFilter],
  );
  async function toggle(item: Entity) {
    setPendingId(item.id);
    setError('');
    try {
      const updated = customer
        ? await setCustomerActive(item.id, !item.isActive)
        : await setSupplierActive(item.id, !item.isActive);
      setItems((current) => current.map((value) => (value.id === updated.id ? updated : value)));
      setSelected((current) => (current?.id === updated.id ? updated : current));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Durum güncellenemedi.');
    } finally {
      setPendingId('');
    }
  }
  const title = customer ? 'Müşteriler' : 'Tedarikçiler';
  return (
    <section className="stack master-page">
      <div className="page-heading master-heading">
        <div>
          <p className="eyebrow">Ana Kayıtlar</p>
          <h1>{title}</h1>
          <p className="muted">
            {customer
              ? 'Müşteri bilgilerini ve ilişkili işleri yönetin.'
              : 'Satınalma tedarikçilerini ve iletişim bilgilerini yönetin.'}
          </p>
        </div>
        <button className="primary-button" onClick={() => setEditing(null)}>
          + Yeni {customer ? 'Müşteri' : 'Tedarikçi'}
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="master-filters">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`${title} içinde ara`}
        />
        <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value)}>
          <option value="active">Aktif</option>
          <option value="inactive">Pasif</option>
          <option value="all">Tümü</option>
        </select>
      </div>
      <div className="master-layout">
        <div className="master-list">
          {filtered.map((item) => (
            <button
              type="button"
              className={selected?.id === item.id ? 'active' : ''}
              key={item.id}
              onClick={() => setSelected(item)}
            >
              <span>
                <strong>{item.name}</strong>
                <small>{item.contactName || item.email || 'İletişim bilgisi yok'}</small>
              </span>
              <i className={item.isActive ? 'active' : ''}>{item.isActive ? 'Aktif' : 'Pasif'}</i>
            </button>
          ))}
          {!filtered.length ? (
            <p className="drawer-empty">Filtreye uygun kayıt bulunamadı.</p>
          ) : null}
        </div>
        {selected ? (
          <article className="panel-card master-detail">
            <header>
              <div>
                <p className="eyebrow">Detay Kartı</p>
                <h2>{selected.name}</h2>
                {customer && (selected as Customer).shortName ? (
                  <p>{(selected as Customer).shortName}</p>
                ) : null}
              </div>
              <span className={selected.isActive ? 'entity-active' : 'entity-inactive'}>
                {selected.isActive ? 'Aktif' : 'Pasif'}
              </span>
            </header>
            <dl>
              <div>
                <dt>Yetkili</dt>
                <dd>{selected.contactName || '—'}</dd>
              </div>
              <div>
                <dt>Telefon</dt>
                <dd>{selected.phone || '—'}</dd>
              </div>
              <div>
                <dt>E-posta</dt>
                <dd>{selected.email || '—'}</dd>
              </div>
              <div>
                <dt>Vergi</dt>
                <dd>
                  {selected.taxOffice || '—'} · {selected.taxNumber || '—'}
                </dd>
              </div>
              <div className="detail-wide">
                <dt>Adres</dt>
                <dd>{selected.address || '—'}</dd>
              </div>
              <div className="detail-wide">
                <dt>Not</dt>
                <dd>{selected.notes || '—'}</dd>
              </div>
              {customer ? (
                <div className="detail-wide">
                  <dt>İlişkili işler</dt>
                  <dd>{(selected as Customer).projects?.length ?? 0}</dd>
                </div>
              ) : null}
            </dl>
            <footer>
              <button className="secondary-button" onClick={() => setEditing(selected)}>
                Düzenle
              </button>
              <button
                className="secondary-button"
                disabled={pendingId === selected.id}
                onClick={() => void toggle(selected)}
              >
                {selected.isActive ? 'Pasif Yap' : 'Aktif Yap'}
              </button>
            </footer>
          </article>
        ) : (
          <div className="panel-card drawer-empty">Detay için bir kayıt seçin.</div>
        )}
      </div>
      {editing !== undefined ? (
        <BusinessEntityModal
          type={type}
          initial={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(saved) => {
            setEditing(undefined);
            setItems((current) =>
              current.some((item) => item.id === saved.id)
                ? current.map((item) => (item.id === saved.id ? saved : item))
                : [saved, ...current],
            );
            setSelected(saved);
          }}
        />
      ) : null}
    </section>
  );
}
