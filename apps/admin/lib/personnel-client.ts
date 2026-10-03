import {
  clearAuthSession,
  getAccessToken,
  getApiBaseUrl,
  SessionExpiredError,
} from './auth-client';
export interface Person {
  id: string;
  fullName: string;
  jobTitle: string;
  jobDescription: string | null;
  department: string | null;
  userId: string | null;
  email: string | null;
  phone: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  requiredDocuments: number;
  missingDocuments: number;
  expiringDocuments: number;
}
export interface Compensation {
  id: string;
  effectiveFrom: string;
  salaryBasis: string;
  monthlySalary: string;
  monthlyEmployerCost: string;
  monthlyHours: string;
  currency: string;
  hourlyCost: string;
}
export interface PersonnelDocument {
  id: string;
  title: string;
  isRequired: boolean;
  expiryRequired: boolean;
  issuedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  fileName: string | null;
  status: string;
  hasFile: boolean;
  daysLeft: number | null;
}
export interface PersonDetail extends Person {
  compensations: Compensation[];
  documents: PersonnelDocument[];
}
export interface PersonnelOptions {
  users: { id: string; fullName: string; email: string }[];
  projects: { id: string; name: string; workNumber: string | null }[];
}
export interface TimeEntry {
  id: string;
  workDate: string;
  hours: string;
  costMultiplier: string;
  description: string;
  kind: string;
  status: string;
  currency: string | null;
  totalCost: string | null;
  voidReason: string | null;
  project: { id: string; name: string } | null;
}
export interface LaborCosts {
  pendingCount: number;
  totals: Record<string, string>;
  rows: {
    projectId: string | null;
    label: string;
    currency: string;
    hours: string;
    cost: string;
  }[];
}
export const hrManager = (roles: string[]) =>
  roles.some((role) => ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(role));
export const formatMoney = (value: string, currency: string) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value));
export const dateOnly = (value?: string | null) => value?.slice(0, 10) || '';
export const dateLabel = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC', dateStyle: 'medium' }).format(
        new Date(value),
      )
    : '—';
export const documentLabels: Record<string, string> = {
  MISSING: 'Belge eksik',
  MISSING_DATE: 'Geçerlilik tarihi eksik',
  EXPIRED: 'Süresi doldu',
  NOT_YET_VALID: 'Henüz geçerli değil',
  PENDING_REVIEW: 'Kontrol bekliyor',
  EXPIRING: '30 gün içinde doluyor',
  CURRENT: 'Kontrol edildi',
};
export const timeLabels: Record<string, string> = {
  DRAFT: 'Onay bekliyor',
  APPROVED: 'Onaylandı',
  VOID: 'İptal edildi',
};
export const kindLabels: Record<string, string> = {
  PROJECT: 'Proje çalışması',
  ADMIN: 'İdari çalışma',
  LEAVE: 'İzin',
};
async function request(path: string, method = 'GET', data?: unknown) {
  const token = getAccessToken();
  if (!token) throw new SessionExpiredError('Oturum açın.');
  const response = await fetch(`${getApiBaseUrl()}/personnel${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(data instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    },
    body: data === undefined ? undefined : data instanceof FormData ? data : JSON.stringify(data),
    cache: 'no-store',
  }).catch(() => {
    throw new Error('Sunucuya ulaşılamıyor. Yeniden deneyin.');
  });
  if (response.status === 401) {
    clearAuthSession();
    throw new SessionExpiredError('Oturum süresi doldu.');
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string | string[] };
    throw new Error(
      Array.isArray(error.message)
        ? error.message.join(' ')
        : error.message || 'Personel işlemi tamamlanamadı.',
    );
  }
  return response;
}
export async function personnelRequest<T>(
  path: string,
  method = 'GET',
  data?: unknown,
): Promise<T> {
  return (await request(path, method, data)).json() as Promise<T>;
}
export async function downloadPersonnelDocument(personId: string, doc: PersonnelDocument) {
  const blob = await (await request(`/${personId}/documents/${doc.id}/file`)).blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = doc.fileName || 'belge';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
