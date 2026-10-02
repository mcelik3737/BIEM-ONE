'use client';
import Link from 'next/link';
import { date, money, useLoad } from '../../../lib/api';
import { Timeline } from '../../../lib/types';
import { Empty, ErrorMessage } from '../../../components/ui';
interface Dashboard {
  customers: number;
  suppliers: number;
  projects: number;
  operations: number;
  pendingOrders: number;
  totals: { currency: string; _sum: { total: string } }[];
  events: Timeline[];
}
export default function Page() {
  const { data, error, reload } = useLoad<Dashboard>('dashboard');
  return (
    <>
      <header className="page-heading row">
        <div>
          <p className="eyebrow">HER AŞAMADA KONTROL</p>
          <h1>Genel bakış</h1>
          <p className="muted">İşlerinizin ve operasyonunuzun güncel durumu.</p>
        </div>
        <Link className="button" href="/projects">
          İş dosyalarına git ↗
        </Link>
      </header>
      <ErrorMessage message={error} />
      {error && (
        <button className="secondary" onClick={reload}>
          Tekrar dene
        </button>
      )}
      {data ? (
        <>
          <section className="metric-grid">
            {[
              ['Aktif müşteri', data.customers],
              ['Aktif tedarikçi', data.suppliers],
              ['İş dosyası', data.projects],
              ['Devam eden operasyon', data.operations],
            ].map(([label, value]) => (
              <article key={label} className="panel-card metric-card">
                <span className="metric-label">{label}</span>
                <strong>{value}</strong>
                <span className="metric-foot">Çalışma alanınıza ait kayıtlar</span>
              </article>
            ))}
          </section>
          <section className="content-grid">
            <article className="panel-card">
              <div className="row">
                <h2>Satınalma özeti</h2>
                <span className="badge">{data.pendingOrders} onay bekliyor</span>
              </div>
              <p className="muted small">İptal edilmemiş siparişlerin vergi dahil toplamı.</p>
              {data.totals.length ? (
                data.totals.map((t) => (
                  <div className="total-line" key={t.currency}>
                    <span>{t.currency}</span>
                    <strong>{money(t._sum.total, t.currency)}</strong>
                  </div>
                ))
              ) : (
                <Empty>Henüz satınalma siparişi yok.</Empty>
              )}
            </article>
            <article className="panel-card accent-card">
              <p className="eyebrow">İŞTEN TESLİMATA</p>
              <h2>Birbirine bağlı bir iş akışı.</h2>
              <p className="muted">
                Müşteri seçin, iş dosyanızı açın. Kazanılan işleri operasyona taşıyın; malzemeleri,
                siparişleri ve teslimatları aynı dosyada izleyin.
              </p>
              <Link href="/customers" className="text-link">
                Müşteri rehberini aç →
              </Link>
            </article>
          </section>
          <section className="panel-card">
            <h2>Son hareketler</h2>
            {data.events.length ? (
              <div className="timeline">
                {data.events.map((e) => (
                  <div key={e.id} className="timeline-row">
                    <span className="timeline-dot" />
                    <div>
                      <strong>{e.summary}</strong>
                      {e.project && (
                        <Link href={`/projects/${e.project.id}`}>{e.project.name}</Link>
                      )}
                    </div>
                    <time>{date(e.occurredAt)}</time>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>İlk kaydınızla birlikte işlem geçmişi burada görünecek.</Empty>
            )}
          </section>
        </>
      ) : (
        !error && <Empty>Özet yükleniyor…</Empty>
      )}
    </>
  );
}
