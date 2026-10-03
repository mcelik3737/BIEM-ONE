'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, UnauthorizedError, fetchProjects } from '../../../lib/projects-client';

function readiness(project: Project) {
  return [
    project.customer,
    project.owner,
    project.quotedValue,
    project.dueDate,
    project.technicalSummary,
    project.contractPoReference,
  ].filter(Boolean).length;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch((requestError) => {
        if (requestError instanceof UnauthorizedError) router.replace('/login');
        else
          setError(requestError instanceof Error ? requestError.message : 'Dashboard yüklenemedi.');
      });
  }, [router]);
  const signals = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrow = today + 24 * 60 * 60 * 1000;
    const threeDaysLater = today + 4 * 24 * 60 * 60 * 1000;
    const operations = projects.flatMap((project) =>
      project.stage.code === 'KAZANILDI' && project.operation ? [project.operation] : [],
    );
    const purchaseOrders = operations.flatMap((operation) => operation.purchaseOrders ?? []);
    const committed = purchaseOrders
      .filter((order) => ['ONAYLANDI', 'SIPARIS_VERILDI', 'KISMI_TESLIM'].includes(order.status))
      .reduce<Record<string, number>>((result, order) => {
        result[order.currency] = (result[order.currency] ?? 0) + Number(order.grandTotal);
        return result;
      }, {});
    return [
      {
        label: 'Bugün aksiyon bekleyen işler',
        value: projects.filter(
          (p) =>
            p.nextAction &&
            p.nextActionDate &&
            new Date(p.nextActionDate).getTime() >= today &&
            new Date(p.nextActionDate).getTime() < tomorrow,
        ).length,
      },
      {
        label: 'Geciken sonraki aksiyonlar',
        value: projects.filter(
          (p) => p.nextAction && p.nextActionDate && new Date(p.nextActionDate).getTime() < today,
        ).length,
      },
      {
        label: 'Geciken görevler',
        value: projects
          .flatMap((p) => p.tasks)
          .filter((t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate).getTime() < today)
          .length,
      },
      {
        label: 'Karar bekleyen işler',
        value: projects.filter((p) => p.stage.code === 'KARAR_BEKLENIYOR').length,
      },
      {
        label: 'Kazanıldı · hazırlık eksik',
        value: projects.filter((p) => p.stage.code === 'KAZANILDI' && readiness(p) < 6).length,
      },
      {
        label: 'Aktif operasyon',
        value: projects.filter(
          (p) =>
            p.stage.code === 'KAZANILDI' &&
            p.operation &&
            p.operation.operationStage !== 'KAPANIS_BAKIM',
        ).length,
      },
      {
        label: 'Geciken operasyon',
        value: projects.filter(
          (p) =>
            p.stage.code === 'KAZANILDI' &&
            p.operation &&
            p.operation.completionPercent < 100 &&
            p.operation.plannedEndAt &&
            new Date(p.operation.plannedEndAt).getTime() < today,
        ).length,
      },
      {
        label: 'Yaklaşan operasyon aksiyonu',
        value: projects.filter(
          (p) =>
            p.stage.code === 'KAZANILDI' &&
            p.operation?.nextAction &&
            p.operation.nextActionDueAt &&
            new Date(p.operation.nextActionDueAt).getTime() >= today &&
            new Date(p.operation.nextActionDueAt).getTime() < threeDaysLater,
        ).length,
      },
      {
        label: 'Sipariş bekleyen BOM kalemleri',
        value: operations
          .flatMap((operation) => operation.bomItems ?? [])
          .filter((item) =>
            ['PLANLANDI', 'TEKLIF_BEKLENIYOR', 'ONAY_BEKLIYOR'].includes(item.procurementStatus),
          ).length,
      },
      {
        label: 'Açık satınalma siparişleri',
        value: purchaseOrders.filter((order) => !['TESLIM_ALINDI', 'IPTAL'].includes(order.status))
          .length,
      },
      {
        label: 'Geciken teslimatlar',
        value: purchaseOrders.filter(
          (order) =>
            !['TESLIM_ALINDI', 'IPTAL'].includes(order.status) &&
            order.expectedDeliveryAt &&
            new Date(order.expectedDeliveryAt).getTime() < today,
        ).length,
      },
      {
        label: 'Taahhüt edilen satınalma',
        value:
          Object.entries(committed)
            .map(([currency, total]) =>
              new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(total),
            )
            .join(' · ') || '—',
      },
    ];
  }, [projects]);

  return (
    <section className="stack">
      <div className="page-heading">
        <p className="eyebrow">Günlük Operasyon</p>
        <h1>Operasyon sinyalleri</h1>
        <p className="muted">Bugün takip gerektiren işleri gerçek iş akışı verileriyle görün.</p>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="metric-grid">
        {signals.map((signal) => (
          <article key={signal.label} className="panel-card metric-card">
            <span className="metric-label">{signal.label}</span>
            <strong>{signal.value}</strong>
            <p>Gerçek iş ve görev verisi</p>
          </article>
        ))}
      </div>
    </section>
  );
}
