'use client';

import { FormEvent, useState } from 'react';
import {
  Customer,
  Supplier,
  createCustomer,
  createSupplier,
  updateCustomer,
  updateSupplier,
} from '../lib/projects-client';

type Entity = Customer | Supplier;

export function BusinessEntityModal({
  type,
  initial,
  onClose,
  onSaved,
}: {
  type: 'customer' | 'supplier';
  initial?: Entity | null;
  onClose: () => void;
  onSaved: (entity: Entity) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const customer = type === 'customer';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get('name')).trim(),
      ...(customer ? { shortName: String(form.get('shortName') || '').trim() } : {}),
      contactName: String(form.get('contactName') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
      email: String(form.get('email') || '').trim(),
      taxOffice: String(form.get('taxOffice') || '').trim(),
      taxNumber: String(form.get('taxNumber') || '').trim(),
      address: String(form.get('address') || '').trim(),
      notes: String(form.get('notes') || '').trim(),
    };
    try {
      const saved = initial
        ? customer
          ? await updateCustomer(initial.id, input)
          : await updateSupplier(initial.id, input)
        : customer
          ? await createCustomer(input)
          : await createSupplier(input);
      onSaved(saved);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Kayıt tamamlanamadı.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="entity-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">Ana Kayıt</p>
            <h2>{initial ? 'Düzenle' : `Yeni ${customer ? 'Müşteri' : 'Tedarikçi'}`}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Kapat" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="entity-form" onSubmit={submit}>
          <label className="form-wide">
            Firma / Unvan *
            <input
              name="name"
              required
              maxLength={200}
              defaultValue={initial?.name ?? ''}
              autoFocus
            />
          </label>
          {customer ? (
            <label>
              Kısa Ad
              <input
                name="shortName"
                maxLength={100}
                defaultValue={(initial as Customer | undefined)?.shortName ?? ''}
              />
            </label>
          ) : null}
          <label>
            Yetkili Kişi
            <input name="contactName" defaultValue={initial?.contactName ?? ''} />
          </label>
          <label>
            Telefon
            <input name="phone" defaultValue={initial?.phone ?? ''} />
          </label>
          <label>
            E-posta
            <input name="email" type="email" defaultValue={initial?.email ?? ''} />
          </label>
          <label>
            Vergi Dairesi
            <input name="taxOffice" defaultValue={initial?.taxOffice ?? ''} />
          </label>
          <label>
            Vergi Numarası
            <input name="taxNumber" defaultValue={initial?.taxNumber ?? ''} />
          </label>
          <label className="form-wide">
            Adres
            <textarea name="address" rows={3} defaultValue={initial?.address ?? ''} />
          </label>
          <label className="form-wide">
            Not
            <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ''} />
          </label>
          {error ? <p className="form-error form-wide">{error}</p> : null}
          <div className="form-actions form-wide">
            <button className="secondary-button" type="button" onClick={onClose}>
              Vazgeç
            </button>
            <button className="primary-button" disabled={pending}>
              {pending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
