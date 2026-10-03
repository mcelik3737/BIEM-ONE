'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DashboardData,
  Project,
  UnauthorizedError,
  fetchDashboard,
} from '../../../lib/projects-client';

type SignalItem = { id: string; title: string; detail: string; href: string };
type Signal = {
  key: string;
  label: string;
  value: number | string;
  items: SignalItem[];
  href?: string;
};
const projectHref = (id: string, tab = 'general') =>
  `/projects?project=${encodeURIComponent(id)}&tab=${tab}`;
const money = (value: string, currency: string) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value));
const readiness = (p: Project) =>
  [p.customer, p.owner, p.quotedValue, p.dueDate, p.technicalSummary, p.contractPoReference].filter(
    Boolean,
  ).length;

function buildSignals(data: DashboardData): Signal[] {
  const projects = data.projects;
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const today = day.getTime();
  const tomorrow = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
  const upcoming = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 4).getTime();
  const operations = projects.filter((p) => p.stage.code === 'KAZANILDI' && p.operation);
  const orders = operations.flatMap((project) =>
    (project.operation?.purchaseOrders ?? []).map((order) => ({ project, order })),
  );
  const openOrders = orders.filter(
    ({ order }) => !['TESLIM_ALINDI', 'IPTAL'].includes(order.status),
  );
  const committed = orders.filter(({ order }) =>
    ['ONAYLANDI', 'SIPARIS_VERILDI', 'KISMI_TESLIM'].includes(order.status),
  );
  function projectSignal(key: string, label: string, matches: Project[], tab = 'general'): Signal {
    return {
      key,
      label,
      value: matches.length,
      items: matches.map((p) => ({
        id: p.id,
        title: p.name,
        detail: [
          p.workNumber,
          p.customer?.name,
          tab === 'operation' ? p.operation?.nextAction : p.nextAction,
        ]
          .filter(Boolean)
          .join(' · '),
        href: projectHref(p.id, tab),
      })),
    };
  }
  const orderItems = (records: typeof orders): SignalItem[] =>
    records.map(({ project, order }) => ({
      id: order.id,
      title: `${order.orderNumber} · ${order.supplier.name}`,
      detail: `${project.name} · ${money(order.grandTotal, order.currency)}`,
      href: projectHref(project.id, 'operation'),
    }));
  const overdueTasks = projects.flatMap((project) =>
    project.tasks
      .filter(
        (task) =>
          task.status !== 'DONE' && task.dueDate && new Date(task.dueDate).getTime() < today,
      )
      .map((task) => ({
        id: task.id,
        title: task.title,
        detail: `${project.name} · ${task.assignee?.fullName || 'Atanmamış'}`,
        href: projectHref(project.id, 'tasks'),
      })),
  );
  const waitingBom = operations.flatMap((project) =>
    (project.operation?.bomItems ?? [])
      .filter((item) =>
        ['PLANLANDI', 'TEKLIF_BEKLENIYOR', 'ONAY_BEKLIYOR'].includes(item.procurementStatus),
      )
      .map((item) => ({
        id: item.id,
        title: item.description,
        detail: `${project.name} · ${item.quantity} ${item.unit}`,
        href: projectHref(project.id, 'operation'),
      })),
  );
  const lateOrders = openOrders.filter(
    ({ order }) => order.expectedDeliveryAt && new Date(order.expectedDeliveryAt).getTime() < today,
  );
  return [
    projectSignal(
      'today',
      'Bugün aksiyon bekleyen işler',
      projects.filter(
        (p) =>
          p.nextAction &&
          p.nextActionDate &&
          new Date(p.nextActionDate).getTime() >= today &&
          new Date(p.nextActionDate).getTime() < tomorrow,
      ),
    ),
    projectSignal(
      'late-actions',
      'Geciken sonraki aksiyonlar',
      projects.filter(
        (p) => p.nextAction && p.nextActionDate && new Date(p.nextActionDate).getTime() < today,
      ),
    ),
    {
      key: 'late-tasks',
      label: 'Geciken görevler',
      value: overdueTasks.length,
      items: overdueTasks,
      href: '/tasks?view=overdue',
    },
    projectSignal(
      'decision',
      'Karar bekleyen işler',
      projects.filter((p) => p.stage.code === 'KARAR_BEKLENIYOR'),
    ),
    projectSignal(
      'preparation',
      'Kazanıldı · hazırlık eksik',
      projects.filter((p) => p.stage.code === 'KAZANILDI' && readiness(p) < 6),
    ),
    projectSignal(
      'active',
      'Aktif operasyon',
      operations.filter((p) => p.operation?.operationStage !== 'KAPANIS_BAKIM'),
      'operation',
    ),
    projectSignal(
      'late-operations',
      'Geciken operasyon',
      operations.filter(
        (p) =>
          p.operation &&
          p.operation.completionPercent < 100 &&
          p.operation.plannedEndAt &&
          new Date(p.operation.plannedEndAt).getTime() < today,
      ),
      'operation',
    ),
    projectSignal(
      'upcoming',
      'Yaklaşan operasyon aksiyonu',
      operations.filter(
        (p) =>
          p.operation?.nextAction &&
          p.operation.nextActionDueAt &&
          new Date(p.operation.nextActionDueAt).getTime() >= today &&
          new Date(p.operation.nextActionDueAt).getTime() < upcoming,
      ),
      'operation',
    ),
    {
      key: 'bom',
      label: 'Sipariş bekleyen BOM kalemleri',
      value: waitingBom.length,
      items: waitingBom,
    },
    {
      key: 'orders',
      label: 'Açık satınalma siparişleri',
      value: openOrders.length,
      items: orderItems(openOrders),
    },
    {
      key: 'late-orders',
      label: 'Geciken teslimatlar',
      value: lateOrders.length,
      items: orderItems(lateOrders),
    },
    {
      key: 'committed',
      label: 'Taahhüt edilen satınalma',
      value:
        Object.entries(data.committedTotals)
          .map(([currency, total]) => money(total, currency))
          .join(' · ') || '—',
      items: orderItems(committed),
    },
  ];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState('');
  const details = useRef<HTMLElement>(null);
  useEffect(() => {
    let active = true;
    setError('');
    setData(null);
    fetchDashboard()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((caught) => {
        if (!active) return;
        if (caught instanceof UnauthorizedError) router.replace('/login');
        else setError(caught instanceof Error ? caught.message : 'Gösterge paneli yüklenemedi.');
      });
    return () => {
      active = false;
    };
  }, [router, attempt]);
  const signals = useMemo(() => (data ? buildSignals(data) : []), [data]);
  const selectedSignal = signals.find((signal) => signal.key === selected);
  useEffect(() => {
    if (selected) details.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selected]);
  return (
    <section className="stack">
      <div className="page-heading task-board-heading">
        <div>
          <p className="eyebrow">Günlük operasyon</p>
          <h1>Operasyon sinyalleri</h1>
          <p className="muted">Bir göstergeyi seçerek ilgili kayıtları açın.</p>
        </div>
        <Link className="primary-button" href="/tasks">
          Görevleri aç
        </Link>
      </div>
      {error ? (
        <div className="form-error" role="alert">
          {error}{' '}
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Tekrar Dene
          </button>
        </div>
      ) : null}
      {!data && !error ? <p role="status">İşler ve satınalma kayıtları yükleniyor…</p> : null}
      <div className="metric-grid">
        {signals.map((signal) =>
          signal.href ? (
            <Link
              key={signal.key}
              className="panel-card metric-card signal-card"
              href={signal.href}
              aria-label={`${signal.label}: ${signal.value}. Kayıtları aç`}
            >
              <span className="metric-label">{signal.label}</span>
              <strong>{signal.value}</strong>
              <span className="signal-action">Görevleri aç →</span>
            </Link>
          ) : (
            <button
              key={signal.key}
              type="button"
              className="panel-card metric-card signal-card"
              aria-pressed={selected === signal.key}
              aria-controls="dashboard-details"
              onClick={() => setSelected(signal.key)}
            >
              <span className="metric-label">{signal.label}</span>
              <strong>{signal.value}</strong>
              <span className="signal-action">Kayıtları göster →</span>
            </button>
          ),
        )}
      </div>
      {selectedSignal ? (
        <section
          className="panel-card signal-details"
          id="dashboard-details"
          ref={details}
          aria-label={selectedSignal.label}
        >
          <div className="task-board-heading">
            <h2>{selectedSignal.label}</h2>
            <button className="secondary-button" type="button" onClick={() => setSelected('')}>
              Kapat
            </button>
          </div>
          {selectedSignal.items.length ? (
            <ul className="signal-list">
              {selectedSignal.items.map((item) => (
                <li key={item.id}>
                  <Link href={item.href}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                    <small>İş dosyasını aç →</small>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Bu göstergeye uyan kayıt yok.</p>
          )}
        </section>
      ) : null}
    </section>
  );
}
