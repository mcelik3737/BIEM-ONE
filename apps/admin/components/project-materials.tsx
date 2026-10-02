'use client';
import { FormEvent, useState } from 'react';
import { api, json, money, qty, useAction } from '../lib/api';
import { Bom, Project } from '../lib/types';
import { canManage, useUser } from './app-shell';
import { Empty, ErrorMessage, Modal } from './ui';
export function BomPanel({
  operation,
  reload,
}: {
  operation: NonNullable<Project['operation']>;
  reload: () => void;
}) {
  const [editing, setEditing] = useState<Bom | 'new'>();
  const action = useAction();
  const manage = canManage(useUser());
  const totals = operation.bomTotals;
  return (
    <>
      <section className="panel-card">
        <header className="row">
          <div>
            <h2>Malzeme listesi / BOM</h2>
            <p className="muted small">Miktar, birim fiyat ve tahmini maliyet.</p>
          </div>
          {manage && <button onClick={() => setEditing('new')}>+ Malzeme ekle</button>}
        </header>
        <ErrorMessage message={action.error} />
        {operation.bomItems.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Malzeme</th>
                  <th>Miktar</th>
                  <th>Birim fiyat</th>
                  <th>Tahmini tutar</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {operation.bomItems.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.name}</strong>
                      <small>{i.partNumber || i.notes}</small>
                    </td>
                    <td>
                      {qty(i.quantity)} {i.unit}
                    </td>
                    <td>{money(i.unitPrice, i.currency)}</td>
                    <td>{money(i.estimatedCost, i.currency)}</td>
                    <td>
                      {manage &&
                        (i.purchaseItems.length ? (
                          <span className="muted small">Siparişe bağlı</span>
                        ) : (
                          <div className="row">
                            <button className="secondary compact" onClick={() => setEditing(i)}>
                              Düzenle
                            </button>
                            <button
                              className="text-button danger"
                              disabled={action.busy}
                              onClick={() => {
                                if (window.confirm(`${i.name} BOM listesinden silinsin mi?`))
                                  void action.run(async () => {
                                    await api(`operations/${operation.id}/bom/${i.id}`, {
                                      method: 'DELETE',
                                    });
                                    reload();
                                  });
                              }}
                            >
                              Sil
                            </button>
                          </div>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>İlk malzemenizi ekleyin. Ondalıklı miktar ve fiyat kullanabilirsiniz.</Empty>
        )}
      </section>
      {Object.keys(totals).length > 0 && (
        <section className="panel-card">
          <h3>Tahmini malzeme maliyeti</h3>
          <p className="muted small">Vergi hariç; para birimleri ayrı gösterilir.</p>
          {Object.entries(totals).map(([currency, total]) => (
            <div className="total-line" key={currency}>
              <span>{currency}</span>
              <strong>{money(total, currency)}</strong>
            </div>
          ))}
        </section>
      )}
      {editing && (
        <BomForm
          operationId={operation.id}
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
function BomForm({
  operationId,
  item,
  close,
  saved,
}: {
  operationId: string;
  item?: Bom;
  close: () => void;
  saved: () => void;
}) {
  const action = useAction();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget));
    void action.run(async () => {
      await api(`operations/${operationId}/bom${item ? `/${item.id}` : ''}`, {
        method: item ? 'PATCH' : 'POST',
        body: json(body),
      });
      saved();
    });
  }
  return (
    <Modal title={item ? 'Malzemeyi düzenle' : 'Malzeme ekle'} close={close}>
      <form className="stack" onSubmit={submit}>
        <label>
          Malzeme adı *
          <input name="name" required minLength={2} maxLength={160} defaultValue={item?.name} />
        </label>
        <label>
          Ürün / parça kodu
          <input name="partNumber" maxLength={100} defaultValue={item?.partNumber ?? ''} />
        </label>
        <div className="form-grid">
          <label>
            Miktar *
            <input
              name="quantity"
              type="number"
              min="0.0001"
              max="999999999.9999"
              step="0.0001"
              required
              defaultValue={item?.quantity ?? '1'}
            />
          </label>
          <label>
            Birim *
            <input
              name="unit"
              maxLength={20}
              required
              defaultValue={item?.unit ?? 'adet'}
              list="units"
            />
            <datalist id="units">
              <option value="adet" />
              <option value="m" />
              <option value="set" />
              <option value="saat" />
            </datalist>
          </label>
          <label>
            Birim fiyat *
            <input
              name="unitPrice"
              type="number"
              min="0"
              max="999999999.9999"
              step="0.0001"
              required
              defaultValue={item?.unitPrice ?? '0'}
            />
          </label>
          <label>
            Para birimi
            <select name="currency" defaultValue={item?.currency ?? 'TRY'}>
              {['TRY', 'USD', 'EUR'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Notlar
          <textarea name="notes" maxLength={2000} defaultValue={item?.notes ?? ''} />
        </label>
        <ErrorMessage message={action.error} />
        <button disabled={action.busy}>Malzemeyi kaydet</button>
      </form>
    </Modal>
  );
}
