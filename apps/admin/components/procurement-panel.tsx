'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BomItem,
  BomItemType,
  ProcurementStatus,
  PurchaseOrder,
  Supplier,
  approvePurchaseOrder,
  changePurchaseOrderStatus,
  createBomItem,
  createPurchaseOrder,
  fetchBom,
  fetchPurchaseOrders,
  fetchSuppliers,
  receivePurchaseItem,
  removeBomItem,
  updateBomItem,
} from '../lib/projects-client';
import { fetchCurrentUser } from '../lib/auth-client';
import { BusinessEntityModal } from './business-entity-modal';

type Section = 'summary' | 'bom' | 'orders';
const typeLabels: Record<BomItemType, string> = {
  URUN: 'Ürün',
  MALZEME: 'Malzeme',
  HIZMET: 'Hizmet',
  ISCILIK: 'İşçilik',
  TASERON: 'Taşeron',
  EKIPMAN: 'Ekipman',
};
const procurementLabels: Record<ProcurementStatus, string> = {
  PLANLANDI: 'Planlandı',
  TEKLIF_BEKLENIYOR: 'Teklif Bekleniyor',
  ONAY_BEKLIYOR: 'Onay Bekliyor',
  SIPARIS_VERILDI: 'Sipariş Verildi',
  KISMI_TESLIM: 'Kısmi Teslim',
  TESLIM_ALINDI: 'Teslim Alındı',
  IPTAL: 'İptal',
};
const statusLabels: Record<string, string> = {
  TASLAK: 'Taslak',
  ONAY_BEKLIYOR: 'Onay Bekliyor',
  ONAYLANDI: 'Onaylandı',
  SIPARIS_VERILDI: 'Sipariş Verildi',
  KISMI_TESLIM: 'Kısmi Teslim',
  TESLIM_ALINDI: 'Teslim Alındı',
  IPTAL: 'İptal',
};
const money = (value: string | number, currency: string) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value));

export function ProcurementPanel({
  projectId,
  onChanged,
}: {
  projectId: string;
  onChanged: () => void;
}) {
  const [canApprove, setCanApprove] = useState(false);
  useEffect(() => {
    fetchCurrentUser()
      .then((user) =>
        setCanApprove(
          user.roles.some((role) =>
            ['SUPER_ADMIN', 'COMPANY_ADMIN', 'PROJECT_MANAGER'].includes(role),
          ),
        ),
      )
      .catch(() => setCanApprove(false));
  }, []);
  const [section, setSection] = useState<Section>('summary');
  const [bom, setBom] = useState<BomItem[]>([]);
  const [totals, setTotals] = useState<Record<string, string>>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBom, setSelectedBom] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const load = useCallback(async () => {
    const [bomResult, supplierResult, orderResult] = await Promise.all([
      fetchBom(projectId),
      fetchSuppliers(),
      fetchPurchaseOrders(projectId),
    ]);
    setBom(bomResult.items);
    setTotals(bomResult.totals);
    setSuppliers(supplierResult);
    setOrders(orderResult);
  }, [projectId]);
  useEffect(() => {
    load().catch((error) =>
      setMessage(error instanceof Error ? error.message : 'Satınalma verileri yüklenemedi.'),
    );
  }, [load]);
  const filtered = useMemo(
    () =>
      bom.filter(
        (item) =>
          (!typeFilter || item.itemType === typeFilter) &&
          (!statusFilter || item.procurementStatus === statusFilter),
      ),
    [bom, typeFilter, statusFilter],
  );
  const openOrders = orders.filter((order) => !['TESLIM_ALINDI', 'IPTAL'].includes(order.status));
  const overdue = openOrders.filter(
    (order) => order.expectedDeliveryAt && new Date(order.expectedDeliveryAt) < new Date(),
  ).length;

  async function run(action: () => Promise<unknown>, success: string) {
    setPending(true);
    setMessage('');
    try {
      await action();
      await load();
      onChanged();
      setMessage(success);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'İşlem tamamlanamadı.');
      return false;
    } finally {
      setPending(false);
    }
  }

  function addBom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const target = event.currentTarget;
    void run(
      () =>
        createBomItem(projectId, {
          itemType: form.get('itemType') as BomItemType,
          stockCode: String(form.get('stockCode') || ''),
          description: String(form.get('description')),
          brand: '',
          model: '',
          quantity: String(form.get('quantity')),
          unit: String(form.get('unit')),
          currency: String(form.get('currency')),
          estimatedUnitCost: String(form.get('estimatedUnitCost')),
          requiredAt: String(form.get('requiredAt') || '') || null,
          procurementStatus: 'PLANLANDI',
          technicalNote: '',
          sortOrder: 0,
        }),
      'BOM kalemi eklendi.',
    ).then((ok) => {
      if (ok) target.reset();
    });
  }

  function addOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const items = bom
      .filter((item) => selectedBom.includes(item.id))
      .map((item) => ({
        bomItemId: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.estimatedUnitCost),
        taxRate: Number(form.get('taxRate')),
      }));
    if (!items.length) {
      setMessage('Sipariş için en az bir BOM kalemi seçin.');
      return;
    }
    void run(
      () =>
        createPurchaseOrder(projectId, {
          supplierId: String(form.get('supplierId')),
          expectedDeliveryAt: String(form.get('expectedDeliveryAt') || '') || undefined,
          currency: String(form.get('currency')),
          notes: String(form.get('notes') || ''),
          items,
        }),
      'Satınalma siparişi oluşturuldu.',
    ).then((ok) => {
      if (ok) setSelectedBom([]);
    });
  }

  return (
    <div className="procurement-panel">
      <nav className="operation-subtabs" aria-label="Operasyon bölümleri">
        {(
          [
            ['summary', 'Özet'],
            ['bom', 'BOM / Malzeme Listesi'],
            ['orders', 'Satınalma'],
          ] as const
        ).map(([key, label]) => (
          <button
            type="button"
            className={section === key ? 'active' : ''}
            onClick={() => setSection(key)}
            key={key}
          >
            {label}
          </button>
        ))}
      </nav>
      {message ? <p className="inline-feedback">{message}</p> : null}
      {section === 'summary' ? (
        <div className="procurement-summary">
          <article>
            <span>BOM kalemi</span>
            <strong>{bom.length}</strong>
          </article>
          <article>
            <span>Sipariş bekleyen</span>
            <strong>
              {
                bom.filter((item) =>
                  ['PLANLANDI', 'TEKLIF_BEKLENIYOR', 'ONAY_BEKLIYOR'].includes(
                    item.procurementStatus,
                  ),
                ).length
              }
            </strong>
          </article>
          <article>
            <span>Açık sipariş</span>
            <strong>{openOrders.length}</strong>
          </article>
          <article>
            <span>Geciken teslimat</span>
            <strong>{overdue}</strong>
          </article>
          <div className="procurement-totals">
            <h4>Tahmini BOM toplamları</h4>
            {Object.entries(totals).map(([currency, total]) => (
              <strong key={currency}>{money(total, currency)}</strong>
            ))}
          </div>
        </div>
      ) : null}
      {section === 'bom' ? (
        <>
          <div className="procurement-filters">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Tüm kategoriler</option>
              {Object.entries(typeLabels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tüm durumlar</option>
              {Object.entries(procurementLabels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <form className="procurement-form" onSubmit={addBom}>
            <select name="itemType" aria-label="Kalem türü" required>
              {Object.entries(typeLabels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
            <input name="stockCode" placeholder="Stok / ürün kodu" />
            <input name="description" required placeholder="Açıklama" />
            <input
              name="quantity"
              aria-label="Miktar"
              required
              type="number"
              min="0.001"
              step="0.001"
              placeholder="Miktar"
            />
            <input name="unit" aria-label="Birim" required placeholder="Birim" />
            <select name="currency" aria-label="Para birimi">
              <option>TRY</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
            <input
              name="estimatedUnitCost"
              aria-label="Tahmini birim maliyet"
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="Birim maliyet"
            />
            <input name="requiredAt" type="date" />
            <button disabled={pending}>Kalem Ekle</button>
          </form>
          <div className="procurement-table-wrap">
            <table className="procurement-table">
              <thead>
                <tr>
                  <th>Tür</th>
                  <th>Kod / Açıklama</th>
                  <th>Miktar</th>
                  <th>Birim Maliyet</th>
                  <th>Toplam</th>
                  <th>Durum</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>{typeLabels[item.itemType]}</td>
                    <td>
                      <small>{item.stockCode || '—'}</small>
                      <strong>{item.description}</strong>
                    </td>
                    <td>
                      {item.quantity} {item.unit}
                    </td>
                    <td>{money(item.estimatedUnitCost, item.currency)}</td>
                    <td>{money(item.estimatedTotalCost, item.currency)}</td>
                    <td>
                      <select
                        value={item.procurementStatus}
                        disabled={pending}
                        onChange={(e) =>
                          void run(
                            () =>
                              updateBomItem(projectId, item.id, {
                                procurementStatus: e.target.value as ProcurementStatus,
                              }),
                            'BOM kalemi güncellendi.',
                          )
                        }
                      >
                        {Object.entries(procurementLabels).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={pending || Boolean(item._count?.purchaseOrderItems)}
                        title={
                          item._count?.purchaseOrderItems
                            ? 'Siparişe bağlı kalem silinemez.'
                            : 'Kaldır'
                        }
                        onClick={() =>
                          window.confirm('BOM kalemi kaldırılsın mı?') &&
                          void run(
                            () => removeBomItem(projectId, item.id),
                            'BOM kalemi kaldırıldı.',
                          )
                        }
                      >
                        Kaldır
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {section === 'orders' ? (
        <>
          <form className="order-form" onSubmit={addOrder}>
            <h4>BOM Kalemlerinden Sipariş Oluştur</h4>
            <div className="order-bom-picker">
              {bom
                .filter((item) => !['TESLIM_ALINDI', 'IPTAL'].includes(item.procurementStatus))
                .map((item) => (
                  <label key={item.id}>
                    <input
                      type="checkbox"
                      checked={selectedBom.includes(item.id)}
                      onChange={(e) =>
                        setSelectedBom((current) =>
                          e.target.checked
                            ? [...current, item.id]
                            : current.filter((id) => id !== item.id),
                        )
                      }
                    />
                    {item.description} · {item.quantity} {item.unit}
                  </label>
                ))}
            </div>
            <span className="entity-select-row">
              <select
                name="supplierId"
                aria-label="Tedarikçi"
                required
                value={selectedSupplierId}
                onChange={(event) => setSelectedSupplierId(event.target.value)}
              >
                <option value="">Tedarikçi seçin</option>
                {suppliers
                  .filter((supplier) => supplier.isActive)
                  .map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
              </select>
              <button type="button" onClick={() => setIsSupplierModalOpen(true)}>
                + Yeni Tedarikçi
              </button>
            </span>
            <select name="currency" aria-label="Para birimi">
              <option>TRY</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
            <input
              name="taxRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue="20"
              aria-label="KDV oranı"
            />
            <input name="expectedDeliveryAt" type="date" />
            <input name="notes" placeholder="Sipariş notu" />
            <button disabled={pending}>Sipariş Oluştur</button>
          </form>
          <div className="purchase-order-list">
            {orders.map((order) => {
              const isOverdue =
                order.expectedDeliveryAt &&
                !['TESLIM_ALINDI', 'IPTAL'].includes(order.status) &&
                new Date(order.expectedDeliveryAt) < new Date();
              return (
                <article key={order.id} className={isOverdue ? 'overdue' : ''}>
                  <header>
                    <div>
                      <strong>{order.orderNumber}</strong>
                      <span>{order.supplier.name}</span>
                    </div>
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>
                      {statusLabels[order.status]}
                    </span>
                  </header>
                  {isOverdue ? (
                    <p className="overdue-warning">Beklenen teslim tarihi geçti.</p>
                  ) : null}
                  <dl>
                    <div>
                      <dt>Genel toplam</dt>
                      <dd>{money(order.grandTotal, order.currency)}</dd>
                    </div>
                    <div>
                      <dt>Beklenen teslim</dt>
                      <dd>
                        {order.expectedDeliveryAt
                          ? new Date(order.expectedDeliveryAt).toLocaleDateString('tr-TR')
                          : '—'}
                      </dd>
                    </div>
                  </dl>
                  <div className="order-items">
                    {order.items.map((item) => (
                      <div key={item.id}>
                        <span>
                          {item.description} · {item.receivedQuantity}/{item.quantity} {item.unit}
                        </span>
                        {['SIPARIS_VERILDI', 'KISMI_TESLIM'].includes(order.status) &&
                        Number(item.receivedQuantity) < Number(item.quantity) ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              const value = window.prompt('Teslim alınan ek miktar');
                              if (value)
                                void run(
                                  () =>
                                    receivePurchaseItem(
                                      projectId,
                                      order.id,
                                      item.id,
                                      Number(value),
                                    ),
                                  'Teslimat kaydedildi.',
                                );
                            }}
                          >
                            Teslimat Gir
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <footer>
                    {!['TESLIM_ALINDI', 'IPTAL'].includes(order.status) ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (
                            window.confirm(
                              'Sipariş iptal edilsin mi? Kayıt ve teslim bilgileri korunacaktır.',
                            )
                          )
                            void run(
                              () => changePurchaseOrderStatus(projectId, order.id, 'IPTAL'),
                              'Sipariş iptal edildi; kayıtlar korundu.',
                            );
                        }}
                      >
                        Siparişi İptal Et
                      </button>
                    ) : null}
                    {order.status === 'TASLAK' ? (
                      <button
                        onClick={() =>
                          void run(
                            () => changePurchaseOrderStatus(projectId, order.id, 'ONAY_BEKLIYOR'),
                            'Sipariş onaya gönderildi.',
                          )
                        }
                      >
                        Onaya Gönder
                      </button>
                    ) : null}
                    {order.status === 'ONAY_BEKLIYOR' && canApprove ? (
                      <button
                        onClick={() =>
                          void run(
                            () => approvePurchaseOrder(projectId, order.id),
                            'Sipariş onaylandı.',
                          )
                        }
                      >
                        Onayla
                      </button>
                    ) : null}
                    {order.status === 'ONAYLANDI' ? (
                      <button
                        onClick={() =>
                          void run(
                            () => changePurchaseOrderStatus(projectId, order.id, 'SIPARIS_VERILDI'),
                            'Sipariş verildi olarak işaretlendi.',
                          )
                        }
                      >
                        Sipariş Verildi
                      </button>
                    ) : null}
                  </footer>
                </article>
              );
            })}
          </div>
        </>
      ) : null}
      {isSupplierModalOpen ? (
        <BusinessEntityModal
          type="supplier"
          onClose={() => setIsSupplierModalOpen(false)}
          onSaved={(entity) => {
            setSuppliers((current) =>
              [...current.filter((item) => item.id !== entity.id), entity as Supplier].sort(
                (a, b) => a.name.localeCompare(b.name, 'tr'),
              ),
            );
            setSelectedSupplierId(entity.id);
            setIsSupplierModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
