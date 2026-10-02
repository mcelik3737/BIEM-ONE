'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Project, UnauthorizedError, WorkCategory, fetchProject } from '../../../../../lib/projects-client';

const categoryLabels: Record<WorkCategory, string> = {
  RADIO_COMMUNICATION: 'Telsiz Haberleşme', RF_COVERAGE_DAS: 'RF Kapsama / DAS',
  RAIL_SYSTEMS: 'Raylı Sistemler', EMERGENCY_COMMUNICATION: 'Acil Haberleşme',
  EV_CHARGING: 'EV Şarj', SERVICE_MAINTENANCE: 'Servis / Bakım', OTHER: 'Diğer',
};

export default function SpecialistWorkspacePage() {
  const { projectId } = useParams<{ type: string; projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetchProject(projectId).then(setProject).catch((requestError) => {
      if (requestError instanceof UnauthorizedError) router.replace('/login');
      else setError(requestError instanceof Error ? requestError.message : 'Çalışma alanı yüklenemedi.');
    });
  }, [projectId, router]);
  return <section className="workspace-placeholder"><p className="eyebrow">Uzman Çalışma Alanı</p>{error ? <p className="form-error">{error}</p> : null}{project ? <><h1>{project.workNumber ?? 'İş Dosyası'} · {project.name}</h1><div className="workspace-facts"><span>Müşteri<strong>{project.customer?.name ?? '—'}</strong></span><span>Kategori<strong>{project.category ? categoryLabels[project.category] : '—'}</strong></span><span>Aşama<strong>{project.stage.name}</strong></span><span>Sorumlu<strong>{project.owner?.fullName ?? '—'}</strong></span><span>Sonraki aksiyon<strong>{project.nextAction ?? '—'}</strong></span></div><div className="future-module"><h2>Bu uzman çalışma alanı sonraki pakette devreye alınacak.</h2><p>İş sınıflandırması ve uzman yönlendirmesi hazır; derin uzman motoru Package 4 kapsamı dışındadır.</p></div><Link className="primary-button workspace-return" href="/projects">İş Dosyasına Dön</Link></> : <p className="muted">İş bilgileri yükleniyor…</p>}</section>;
}
