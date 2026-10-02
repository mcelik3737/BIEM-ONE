'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, date, json, useAction, useLoad } from '../lib/api';
import { Project, operationLabels, salesLabels } from '../lib/types';
import { canManage, useUser } from './app-shell';
import { Badge, Empty, ErrorMessage } from './ui';
import { BomPanel } from './project-materials';
import { OrdersPanel } from './project-orders';
export function ProjectDetail({ id }: { id: string }) {
  const { data: project, error, reload } = useLoad<Project>(`projects/${id}`);
  const [tab, setTab] = useState('overview');
  const action = useAction();
  const manage = canManage(useUser());
  if (!project)
    return (
      <section className="panel-card">
        <ErrorMessage message={error} />
        {error ? (
          <button onClick={reload}>Tekrar dene</button>
        ) : (
          <Empty>İş dosyası yükleniyor…</Empty>
        )}
      </section>
    );
  const op = project.operation;
  async function status(path: string, value: string) {
    await action.run(async () => {
      await api(path, { method: 'PATCH', body: json({ status: value }) });
      reload();
    });
  }
  return (
    <>
      <Link href="/projects" className="muted small">
        ← İş dosyalarına dön
      </Link>
      <header className="page-heading row">
        <div>
          <p className="eyebrow">{project.code || 'İŞ DOSYASI'}</p>
          <h1>{project.name}</h1>
          <p className="muted">
            {project.customer.name}
            {project.location ? ` · ${project.location}` : ''}
          </p>
        </div>
        <Badge good={!!op}>{salesLabels[project.salesStatus]}</Badge>
      </header>
      <nav className="tabs" aria-label="İş dosyası bölümleri">
        {[
          ['overview', 'Genel bilgi'],
          ['bom', `Malzeme listesi${op ? ` (${op.bomItems.length})` : ''}`],
          ['orders', `Satınalma${op ? ` (${op.purchaseOrders.length})` : ''}`],
          ['history', 'İşlem geçmişi'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? 'selected' : ''}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
          >
            {label}
          </button>
        ))}
      </nav>
      <ErrorMessage message={action.error} />
      {tab === 'overview' && (
        <div className="content-grid">
          <section className="panel-card stack">
            <h2>Satış süreci</h2>
            <label>
              Satış aşaması
              <select
                value={project.salesStatus}
                disabled={!manage || action.busy || !!op}
                onChange={(e) => void status(`projects/${id}/sales-status`, e.target.value)}
              >
                {Object.entries(salesLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted small">
              İş kazanıldığında bu dosyaya bağlı operasyon otomatik açılır.
            </p>
            <div className="detail-grid">
              <span>Müşteri</span>
              <strong>{project.customer.name}</strong>
              <span>Yetkili</span>
              <strong>{project.customer.contactName || '—'}</strong>
              <span>Telefon</span>
              <strong>{project.customer.phone || '—'}</strong>
              <span>Konum</span>
              <strong>{project.location || '—'}</strong>
            </div>
            {project.description && <p className="muted">{project.description}</p>}
          </section>
          <section className="panel-card stack">
            <h2>Operasyon</h2>
            {op ? (
              <>
                <label>
                  Operasyon aşaması
                  <select
                    value={op.status}
                    disabled={!manage || action.busy}
                    onChange={(e) => void status(`operations/${op.id}`, e.target.value)}
                  >
                    {Object.entries(operationLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="muted">
                  {op.bomItems.length} malzeme kalemi · {op.purchaseOrders.length} satınalma
                  siparişi
                </p>
                <button className="secondary" onClick={() => setTab('bom')}>
                  Malzeme listesine git →
                </button>
              </>
            ) : (
              <Empty>Satış aşaması “Kazanıldı” olduğunda operasyon açılacak.</Empty>
            )}
          </section>
        </div>
      )}
      {tab === 'bom' &&
        (op ? (
          <BomPanel operation={op} reload={reload} />
        ) : (
          <Empty>BOM eklemek için işin kazanılmış olması gerekir.</Empty>
        ))}
      {tab === 'orders' &&
        (op ? (
          <OrdersPanel operation={op} reload={reload} />
        ) : (
          <Empty>Satınalma için önce operasyon açılmalı.</Empty>
        ))}
      {tab === 'history' && (
        <section className="panel-card">
          <h2>İşlem geçmişi</h2>
          {project.timelineEvents.map((e) => (
            <div className="timeline-row" key={e.id}>
              <span className="timeline-dot" />
              <strong>{e.summary}</strong>
              <time>{date(e.occurredAt)}</time>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
