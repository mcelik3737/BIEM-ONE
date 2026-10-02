'use client';
import { FormEvent, useRef, useState } from 'react';
import { api, date, json, money, qty, useAction, useLoad } from '../lib/api';
import { Order, Party, Project, orderLabels } from '../lib/types';
import { canManage, useUser } from './app-shell';
import { Badge, Empty, ErrorMessage, Modal } from './ui';
type Operation = NonNullable<Project['operation']>;
export function OrdersPanel({ operation, reload }: { operation: Operation; reload: () => void }) {
  const [adding, setAdding] = useState(false);
  const manage = canManage(useUser());
  return (
    <>
      <section className="panel-card">
        <header className="row">
          <div>
            <h2>Satınalma siparişleri</h2>
            <p className="muted small">BOM&apos;dan siparişe, onaydan teslimata.</p>
          </div>
          {manage && (
            <button disabled={!operation.bomItems.length} onClick={() => setAdding(true)}>
              + Sipariş oluştur
            </button>
          )}
        </header>
        {!operation.purchaseOrders.length && (
          <Empty>
            {operation.bomItems.length
              ? 'Henüz sipariş yok. BOM kalemlerinden bir sipariş oluşturun.'
              : 'Sipariş oluşturmak için önce malzeme listesine kalem ekleyin.'}
          </Empty>
        )}
      </section>
      {operation.purchaseOrders.map((order) => (
        <OrderCard key={order.id} order={order} reload={reload} />
      ))}
      {adding && (
        <OrderForm
          operation={operation}
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
function OrderForm({
  operation,
  close,
  saved,
}: {
  operation: Operation;
  close: () => void;
  saved: () => void;
}) {
  const { data: suppliers, error } = useLoad<Party[]>('suppliers');
  const [currency, setCurrency] = useState(operation.bomItems[0]?.currency ?? 'TRY');
  const [selected, setSelected] = useState<string[]>([]);
  const requestKey = useRef(crypto.randomUUID());
  const action = useAction();
  const available = operation.bomItems
    .map((b) => ({ ...b, remaining: Number(b.availableQuantity) }))
    .filter((b) => b.currency === currency && b.remaining > 0);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void action.run(async () => {
      if (!selected.length) throw new Error('En az bir malzeme seçin.');
      await api(`operations/${operation.id}/purchase-orders`, {
        method: 'POST',
        body: json({
          supplierId: f.get('supplierId'),
          currency,
          requestKey: requestKey.current,
          notes: f.get('notes'),
          items: available
            .filter((b) => selected.includes(b.id))
            .map((b) => ({
              bomItemId: b.id,
              quantity: f.get(`qty_${b.id}`),
              unitPrice: f.get(`price_${b.id}`),
              taxRate: f.get(`tax_${b.id}`),
            })),
        }),
      });
      saved();
    });
  }
  return (
    <Modal title="BOM'dan satınalma oluştur" close={close}>
      <form className="stack" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Tedarikçi *
            <select required name="supplierId" defaultValue="">
              <option value="" disabled>
                Tedarikçi seçin
              </option>
              {suppliers
                ?.filter((s) => s.isActive)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Para birimi
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setSelected([]);
              }}
            >
              {['TRY', 'USD', 'EUR'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        {suppliers?.filter((s) => s.isActive).length === 0 && (
          <p className="muted">Önce tedarikçi rehberine aktif bir firma ekleyin.</p>
        )}
        <p className="muted small">
          Seçilen para birimindeki, sipariş verilmemiş miktarlar gösterilir. Her sipariş tek para
          birimindedir.
        </p>
        {available.length ? (
          available.map((b) => (
            <fieldset key={b.id} className="order-line">
              <legend>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={selected.includes(b.id)}
                    onChange={(e) =>
                      setSelected((ids) =>
                        e.target.checked ? [...ids, b.id] : ids.filter((id) => id !== b.id),
                      )
                    }
                  />
                  {b.name}{' '}
                  <span className="muted">
                    · {qty(b.remaining)} {b.unit} kalan
                  </span>
                </label>
              </legend>
              <div className="form-grid three">
                <label>
                  Sipariş miktarı
                  <input
                    aria-label={`${b.name} sipariş miktarı`}
                    name={`qty_${b.id}`}
                    type="number"
                    min="0.0001"
                    max={b.remaining}
                    step="0.0001"
                    defaultValue={b.remaining}
                    required
                    disabled={!selected.includes(b.id)}
                  />
                </label>
                <label>
                  Birim fiyat
                  <input
                    aria-label={`${b.name} birim fiyat`}
                    name={`price_${b.id}`}
                    type="number"
                    min="0"
                    max="999999999.9999"
                    step="0.0001"
                    defaultValue={b.unitPrice}
                    required
                    disabled={!selected.includes(b.id)}
                  />
                </label>
                <label>
                  KDV %
                  <input
                    aria-label={`${b.name} KDV`}
                    name={`tax_${b.id}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    defaultValue="20"
                    required
                    disabled={!selected.includes(b.id)}
                  />
                </label>
              </div>
            </fieldset>
          ))
        ) : (
          <Empty>Bu para biriminde siparişe açık kalem yok.</Empty>
        )}
        <label>
          Sipariş notu
          <textarea name="notes" maxLength={2000} />
        </label>
        <ErrorMessage message={action.error || error} />
        <button disabled={action.busy || !selected.length || !suppliers?.some((s) => s.isActive)}>
          Taslak sipariş oluştur
        </button>
      </form>
    </Modal>
  );
}
function OrderCard({ order, reload }: { order: Order; reload: () => void }) {
  const action = useAction();
  const user = useUser();
  const manage = canManage(user);
  const admin = user?.roles.some((r) => ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(r));
  const requestKey = useRef(crypto.randomUUID());
  const next: Record<string, [string, string]> = {
    DRAFT: ['SUBMITTED', 'Onaya gönder'],
    SUBMITTED: ['APPROVED', 'Siparişi onayla'],
    APPROVED: ['ORDERED', 'Sipariş verildi olarak işaretle'],
  };
  const transition = next[order.status];
  const canReceive =
    ['ORDERED', 'PARTIALLY_RECEIVED'].includes(order.status) &&
    user?.roles.some((r) =>
      ['SUPER_ADMIN', 'COMPANY_ADMIN', 'PROJECT_MANAGER', 'FIELD_ENGINEER'].includes(r),
    );
  function change(status: string) {
    void action.run(async () => {
      await api(`purchase-orders/${order.id}/status`, { method: 'PATCH', body: json({ status }) });
      reload();
    });
  }
  function receive(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const items = order.items
      .map((i) => ({ itemId: i.id, quantity: String(data.get(i.id) || '') }))
      .filter((i) => i.quantity !== '' && Number(i.quantity) > 0);
    void action.run(async () => {
      if (!items.length) throw new Error('Teslim alınan miktarı girin.');
      await api(`purchase-orders/${order.id}/receipts`, {
        method: 'POST',
        body: json({ requestKey: requestKey.current, note: data.get('note'), items }),
      });
      requestKey.current = crypto.randomUUID();
      form.reset();
      reload();
    });
  }
  return (
    <section className="panel-card">
      <header className="row">
        <div>
          <h2>{order.number}</h2>
          <p className="muted small">
            {order.supplier.name} · {order.currency}
          </p>
        </div>
        <Badge good={order.status === 'RECEIVED'}>{orderLabels[order.status]}</Badge>
      </header>
      <ErrorMessage message={action.error} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Malzeme</th>
              <th>Sipariş</th>
              <th>Teslim alınan</th>
              <th>Birim fiyat</th>
              <th>KDV</th>
              <th>Toplam</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td>
                  {qty(i.quantity)} {i.unit}
                </td>
                <td>
                  {qty(i.receivedQuantity)} {i.unit}
                </td>
                <td>{money(i.unitPrice, order.currency)}</td>
                <td>%{qty(i.taxRate)}</td>
                <td>{money(i.total, order.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="order-totals">
        <span>
          Ara toplam <strong>{money(order.subtotal, order.currency)}</strong>
        </span>
        <span>
          KDV <strong>{money(order.taxTotal, order.currency)}</strong>
        </span>
        <span className="grand-total">
          Genel toplam <strong>{money(order.total, order.currency)}</strong>
        </span>
      </div>
      {manage && (
        <div className="row actions">
          {transition && (order.status !== 'SUBMITTED' || admin) && (
            <button disabled={action.busy} onClick={() => change(transition[0])}>
              {transition[1]}
            </button>
          )}
          {order.status === 'SUBMITTED' && !admin && (
            <p className="muted">Şirket yöneticisi onayı bekleniyor.</p>
          )}
          {!['CANCELLED', 'RECEIVED', 'PARTIALLY_RECEIVED'].includes(order.status) && (
            <button
              className="text-button danger"
              disabled={action.busy}
              onClick={() => {
                if (window.confirm('Sipariş iptal edilsin mi? İşlem geçmişi korunacak.'))
                  change('CANCELLED');
              }}
            >
              Siparişi iptal et
            </button>
          )}
        </div>
      )}
      {canReceive && (
        <form onSubmit={receive} className="receipt-form stack">
          <h3>Teslimat kaydet</h3>
          <div className="form-grid">
            {order.items
              .filter((i) => Number(i.receivedQuantity) < Number(i.quantity))
              .map((i) => (
                <label key={i.id}>
                  {i.name} · {qty(Number(i.quantity) - Number(i.receivedQuantity))} {i.unit} kalan
                  <input
                    aria-label={`${i.name} teslimat miktarı`}
                    type="number"
                    name={i.id}
                    min="0.0001"
                    step="0.0001"
                    max={Number((Number(i.quantity) - Number(i.receivedQuantity)).toFixed(4))}
                    placeholder="Bu teslimatın miktarı"
                  />
                </label>
              ))}
          </div>
          <label>
            Teslimat notu
            <input name="note" maxLength={1000} placeholder="İrsaliye numarası veya açıklama" />
          </label>
          <button disabled={action.busy}>Teslimatı kaydet</button>
        </form>
      )}
      {order.receipts.length > 0 && (
        <details className="receipts">
          <summary>Teslimat geçmişi ({order.receipts.length})</summary>
          {order.receipts.map((r) => (
            <div key={r.id} className="receipt">
              <time>{date(r.createdAt)}</time>
              <span>
                {r.items
                  .map((i) => {
                    const line = order.items.find((o) => o.id === i.purchaseOrderItemId);
                    return `${line?.name}: ${qty(i.quantity)} ${line?.unit}`;
                  })
                  .join(' · ')}
              </span>
              {r.note && <small>{r.note}</small>}
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
