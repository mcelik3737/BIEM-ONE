'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchOperationReadiness,
  OperationReadiness,
  ReadinessTarget,
  UnauthorizedError,
} from '../lib/projects-client';

const correctionLabels: Record<ReadinessTarget, string> = {
  MANAGER: 'Sorumlu ata',
  SCHEDULE: 'Tarihleri düzenle',
  NEXT_ACTION: 'Aksiyonu düzenle',
  CATEGORY: 'Kategori seç',
  CHECKLIST: 'Kontrol listesini aç',
};
const statusLabels = {
  COMPLETE: 'Tamam',
  MISSING: 'Eksik',
  NOT_IMPLEMENTED: 'Ayrı kontrol gerekli',
};

export function OperationReadinessPanel({
  projectId,
  onCorrect,
}: {
  projectId: string;
  onCorrect: (target: ReadinessTarget) => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<OperationReadiness | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    setData(null);
    setError(false);
    fetchOperationReadiness(projectId, controller.signal)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof UnauthorizedError) router.replace('/login');
        else setError(true);
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [projectId, attempt, router]);

  return (
    <section className="operation-readiness-panel" aria-labelledby="readiness-title">
      <div className="readiness-heading">
        <h3 id="readiness-title">Hazırlık kontrolü</h3>
        <button
          type="button"
          className="secondary-button"
          disabled={!data && !error}
          onClick={() => setAttempt((value) => value + 1)}
        >
          Kontrolü yenile
        </button>
      </div>
      <p className="readiness-notice">
        Mevcut kayıtlara göre hazırlık özeti. Sahaya çıkış onayı değildir.
      </p>
      {error ? (
        <div role="alert" className="readiness-error">
          <p>Hazırlık kontrolü yüklenemedi.</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Tekrar dene
          </button>
        </div>
      ) : !data ? (
        <p role="status">Hazırlık kontrolü yükleniyor…</p>
      ) : (
        <ul className="readiness-list">
          {data.checks.map((check) => (
            <li key={check.code} className="readiness-item" data-check={check.code}>
              <div className="readiness-check-heading">
                <h4>{check.label}</h4>
                <span className={`readiness-status readiness-${check.status.toLowerCase()}`}>
                  {statusLabels[check.status]}
                </span>
              </div>
              <p>{check.description}</p>
              {!!check.missingItems?.length && (
                <ul className="readiness-missing-items">
                  {check.missingItems.map((title, index) => (
                    <li key={`${index}-${title}`}>{title}</li>
                  ))}
                </ul>
              )}
              {check.status === 'MISSING' && check.target && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    if (check.target) onCorrect(check.target);
                  }}
                >
                  {correctionLabels[check.target]}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
