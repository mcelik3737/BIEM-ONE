import { clearAuthSession, getAccessToken, getApiBaseUrl } from './auth-client';

export const WORKFLOW_STAGE_CODES = [
  'YENI_TALEP',
  'DEGERLENDIRME',
  'COZUM_KESIF',
  'TEKLIF_VERILDI',
  'KARAR_BEKLENIYOR',
  'KAZANILDI',
  'KAYBEDILDI',
] as const;
export type WorkPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type WorkCategory =
  | 'RADIO_COMMUNICATION'
  | 'RF_COVERAGE_DAS'
  | 'RAIL_SYSTEMS'
  | 'EMERGENCY_COMMUNICATION'
  | 'EV_CHARGING'
  | 'SERVICE_MAINTENANCE'
  | 'OTHER';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type OperationStage =
  | 'HAZIRLIK'
  | 'SATINALMA'
  | 'IS_PROGRAMI'
  | 'ISG'
  | 'KURULUM_SERVIS'
  | 'TEST'
  | 'SAT_KABUL'
  | 'TESLIM'
  | 'FATURALAMA'
  | 'TAHSILAT'
  | 'KAPANIS_BAKIM';
export interface ProjectOperation {
  id: string;
  projectId: string;
  operationStage: OperationStage;
  operationManagerId?: string | null;
  operationManager?: { id: string; fullName: string; email: string } | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  completionPercent: number;
  nextAction?: string | null;
  nextActionDueAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  bomItems?: BomItem[];
  purchaseOrders?: PurchaseOrder[];
}
export type BomItemType = 'URUN' | 'MALZEME' | 'HIZMET' | 'ISCILIK' | 'TASERON' | 'EKIPMAN';
export type ProcurementStatus =
  | 'PLANLANDI'
  | 'TEKLIF_BEKLENIYOR'
  | 'ONAY_BEKLIYOR'
  | 'SIPARIS_VERILDI'
  | 'KISMI_TESLIM'
  | 'TESLIM_ALINDI'
  | 'IPTAL';
export type PurchaseOrderStatus =
  | 'TASLAK'
  | 'ONAY_BEKLIYOR'
  | 'ONAYLANDI'
  | 'SIPARIS_VERILDI'
  | 'KISMI_TESLIM'
  | 'TESLIM_ALINDI'
  | 'IPTAL';
export interface BomItem {
  id: string;
  itemType: BomItemType;
  stockCode?: string | null;
  description: string;
  brand?: string | null;
  model?: string | null;
  quantity: string;
  unit: string;
  currency: string;
  estimatedUnitCost: string;
  estimatedTotalCost: string;
  requiredAt?: string | null;
  procurementStatus: ProcurementStatus;
  technicalNote?: string | null;
  sortOrder: number;
  _count?: { purchaseOrderItems: number };
}
export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  taxOffice?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
}
export interface Customer {
  id: string;
  name: string;
  shortName?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  taxOffice?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  projects?: Array<{ id: string; name: string; workNumber?: string | null }>;
}
export interface PurchaseOrderItem {
  id: string;
  bomItemId?: string | null;
  description: string;
  quantity: string;
  receivedQuantity: string;
  unit: string;
  unitPrice: string;
  taxRate: string;
  lineTotal: string;
}
export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryAt?: string | null;
  currency: string;
  subtotal: string;
  taxTotal: string;
  grandTotal: string;
  notes?: string | null;
  supplier: Supplier;
  items: PurchaseOrderItem[];
  approvedAt?: string | null;
}
export interface ProjectTask {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
  priority: TaskPriority;
  dueDate?: string | null;
  assignee?: { id: string; fullName: string; email: string } | null;
}
export interface ChecklistItem {
  id: string;
  key: string;
  title: string;
  stageCode: string;
  category: WorkCategory;
  isCompleted: boolean;
  completedAt?: string | null;
  completedBy?: { id: string; fullName: string; email: string } | null;
  sortOrder: number;
  isRequired: boolean;
}
export interface Project {
  id: string;
  workNumber?: string | null;
  name: string;
  description?: string | null;
  source?: string | null;
  category?: WorkCategory | null;
  location?: string | null;
  customerId?: string | null;
  ownerId?: string | null;
  customerContactName?: string | null;
  customerContactPhone?: string | null;
  customerContactEmail?: string | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  priority: WorkPriority;
  estimatedValue?: string | number | null;
  quotedValue?: string | number | null;
  plannedCost?: string | number | null;
  currency?: string | null;
  probabilityPercent?: number | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  offerNumber?: string | null;
  offerRevision?: string | null;
  offerDate?: string | null;
  offerValidUntil?: string | null;
  technicalSummary?: string | null;
  frequencyBand?: string | null;
  estimatedQuantity?: number | null;
  contractPoReference?: string | null;
  dueDate?: string | null;
  customer?: { id: string; name: string } | null;
  owner?: { id: string; fullName: string; email: string } | null;
  stage: { id: string; code: string; name: string; sortOrder: number };
  createdAt: string;
  updatedAt: string;
  tasks: ProjectTask[];
  operation?: ProjectOperation | null;
}
export type UpdateProjectInput = Partial<{
  name: string;
  customerId: string | null;
  ownerId: string | null;
  category: WorkCategory | null;
  priority: WorkPriority;
  source: string | null;
  description: string | null;
  location: string | null;
  customerContactName: string | null;
  customerContactPhone: string | null;
  customerContactEmail: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  dueDate: string | null;
  estimatedValue: number | null;
  quotedValue: number | null;
  plannedCost: number | null;
  currency: 'TRY' | 'USD' | 'EUR' | null;
  probabilityPercent: number | null;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  offerNumber: string | null;
  offerRevision: string | null;
  offerDate: string | null;
  offerValidUntil: string | null;
  technicalSummary: string | null;
  frequencyBand: string | null;
  estimatedQuantity: number | null;
  contractPoReference: string | null;
}>;
export interface TimelineEvent {
  id: string;
  eventType:
    'WORK_CREATED' | 'PROJECT_CREATED' | 'STAGE_CHANGED' | 'NOTE_ADDED' | 'TASK_CREATED' | string;
  summary: string;
  details?: string | null;
  occurredAt: string;
  actor?: { id: string; fullName: string; email: string } | null;
}
export interface ProjectOptions {
  customers: Array<{ id: string; name: string }>;
  owners: Array<{ id: string; fullName: string; email: string }>;
}
export interface CreateProjectInput {
  name: string;
  customerId?: string;
  description?: string;
  source?: string;
  ownerId?: string;
  priority?: WorkPriority;
  estimatedValue?: number;
  currency?: 'TRY' | 'USD' | 'EUR';
  dueDate?: string;
}
export interface CreateTaskInput {
  title: string;
  assigneeId?: string;
  dueDate?: string;
  priority?: TaskPriority;
}
export class UnauthorizedError extends Error {}

async function projectRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = getAccessToken();
  if (!accessToken) throw new UnauthorizedError('Oturum bulunamadı.');
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  }).catch(() => { throw new Error('Sunucuya ulaşılamıyor. Bağlantınızı kontrol edip yeniden deneyin.'); });
  if (response.status === 401) {
    clearAuthSession();
    throw new UnauthorizedError('Oturumunuzun süresi doldu.');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    throw new Error(message || 'İşlem tamamlanamadı.');
  }
  return response.json() as Promise<T>;
}

export const fetchProjects = () => projectRequest<Project[]>('/projects');
export const fetchProjectOptions = () => projectRequest<ProjectOptions>('/projects/options');
export const createProject = (input: CreateProjectInput) =>
  projectRequest<Project>('/projects', { method: 'POST', body: JSON.stringify(input) });
export const changeProjectStage = (id: string, stageCode: string, reason?: string) =>
  projectRequest<{ project: Project; warnings: string[] }>(`/projects/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ stageCode, reason }),
  });
export const fetchProjectTimeline = (id: string) =>
  projectRequest<TimelineEvent[]>(`/projects/${id}/timeline`);
export const addProjectNote = (id: string, note: string) =>
  projectRequest<TimelineEvent>(`/projects/${id}/timeline`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
export const createProjectTask = (id: string, input: CreateTaskInput) =>
  projectRequest<ProjectTask>(`/projects/${id}/tasks`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const fetchProject = (id: string) => projectRequest<Project>(`/projects/${id}`);
export const updateProject = (id: string, input: UpdateProjectInput) =>
  projectRequest<Project>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
export const fetchProjectChecklist = (id: string) =>
  projectRequest<ChecklistItem[]>(`/projects/${id}/checklist`);
export const updateChecklistItem = (projectId: string, itemId: string, isCompleted: boolean) =>
  projectRequest<ChecklistItem>(`/projects/${projectId}/checklist/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isCompleted }),
  });
export const completeNextAction = (id: string) =>
  projectRequest<Project>(`/projects/${id}/next-action/complete`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
export const updateTask = (
  id: string,
  input: Partial<{
    title: string;
    assigneeId: string | null;
    dueDate: string | null;
    priority: TaskPriority;
    status: ProjectTask['status'];
  }>,
) => projectRequest<ProjectTask>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
export const fetchProjectOperation = (id: string) =>
  projectRequest<ProjectOperation>(`/projects/${id}/operation`);
export const updateProjectOperation = (
  id: string,
  input: Partial<{
    operationManagerId: string | null;
    plannedStartAt: string | null;
    plannedEndAt: string | null;
    actualStartAt: string | null;
    actualEndAt: string | null;
    completionPercent: number;
    nextAction: string | null;
    nextActionDueAt: string | null;
    notes: string | null;
  }>,
) =>
  projectRequest<ProjectOperation>(`/projects/${id}/operation`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
export const advanceProjectOperation = (id: string) =>
  projectRequest<ProjectOperation>(`/projects/${id}/operation/advance`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
export const revertProjectOperation = (id: string, reason: string) =>
  projectRequest<ProjectOperation>(`/projects/${id}/operation/revert`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
export const fetchBom = (id: string) =>
  projectRequest<{ items: BomItem[]; totals: Record<string, string> }>(
    `/projects/${id}/operation/bom`,
  );
export const createBomItem = (
  id: string,
  input: Omit<BomItem, 'id' | 'estimatedTotalCost' | '_count'>,
) =>
  projectRequest<BomItem>(`/projects/${id}/operation/bom`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const updateBomItem = (projectId: string, itemId: string, input: Partial<BomItem>) =>
  projectRequest<BomItem>(`/projects/${projectId}/operation/bom/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
export const removeBomItem = (projectId: string, itemId: string) =>
  projectRequest<{ removed: true }>(`/projects/${projectId}/operation/bom/${itemId}`, {
    method: 'DELETE',
  });
export const fetchSuppliers = () => projectRequest<Supplier[]>('/suppliers');
export const createSupplier = (input: Partial<Supplier> & { name: string }) =>
  projectRequest<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(input) });
export const updateSupplier = (id: string, input: Partial<Supplier>) =>
  projectRequest<Supplier>(`/suppliers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
export const setSupplierActive = (id: string, isActive: boolean) =>
  projectRequest<Supplier>(`/suppliers/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
export const fetchCustomers = () => projectRequest<Customer[]>('/customers');
export const createCustomer = (input: Partial<Customer> & { name: string }) =>
  projectRequest<Customer>('/customers', { method: 'POST', body: JSON.stringify(input) });
export const updateCustomer = (id: string, input: Partial<Customer>) =>
  projectRequest<Customer>(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
export const setCustomerActive = (id: string, isActive: boolean) =>
  projectRequest<Customer>(`/customers/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
export const fetchPurchaseOrders = (id: string) =>
  projectRequest<PurchaseOrder[]>(`/projects/${id}/operation/purchase-orders`);
export const createPurchaseOrder = (
  id: string,
  input: {
    supplierId: string;
    expectedDeliveryAt?: string;
    currency: string;
    notes?: string;
    items: Array<{
      bomItemId?: string;
      description: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      taxRate: number;
    }>;
  },
) =>
  projectRequest<PurchaseOrder>(`/projects/${id}/operation/purchase-orders`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const changePurchaseOrderStatus = (
  projectId: string,
  orderId: string,
  status: PurchaseOrderStatus,
) =>
  projectRequest<PurchaseOrder>(
    `/projects/${projectId}/operation/purchase-orders/${orderId}/status`,
    { method: 'POST', body: JSON.stringify({ status }) },
  );
export const approvePurchaseOrder = (projectId: string, orderId: string) =>
  projectRequest<PurchaseOrder>(
    `/projects/${projectId}/operation/purchase-orders/${orderId}/approve`,
    { method: 'POST', body: JSON.stringify({}) },
  );
export const receivePurchaseItem = (
  projectId: string,
  orderId: string,
  itemId: string,
  quantity: number,
) =>
  projectRequest<PurchaseOrder>(
    `/projects/${projectId}/operation/purchase-orders/${orderId}/receive`,
    { method: 'POST', body: JSON.stringify({ itemId, quantity }) },
  );
