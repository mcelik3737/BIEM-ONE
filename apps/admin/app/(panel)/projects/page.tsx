'use client';

import {
  FormEvent,
  KeyboardEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CreateProjectInput,
  Project,
  ProjectOptions,
  TaskPriority,
  TimelineEvent,
  UnauthorizedError,
  WORKFLOW_STAGE_CODES,
  WorkPriority,
  WorkCategory,
  UpdateProjectInput,
  ChecklistItem,
  OperationStage,
  ProjectOperation,
  ReadinessTarget,
  addProjectNote,
  changeProjectStage,
  createProject,
  createProjectTask,
  fetchProjectOptions,
  fetchProject,
  fetchProjectTimeline,
  fetchProjects,
  updateProject,
  fetchProjectChecklist,
  updateChecklistItem,
  completeNextAction,
  updateTask,
  updateProjectOperation,
  advanceProjectOperation,
  revertProjectOperation,
} from '../../../lib/projects-client';
import { AuthUser, fetchCurrentUser } from '../../../lib/auth-client';
import { ProcurementPanel } from '../../../components/procurement-panel';
import { ProjectLaborSummary } from '../../../components/project-labor-summary';
import { OperationReadinessPanel } from '../../../components/operation-readiness';
import { hrManager } from '../../../lib/personnel-client';
import { BusinessEntityModal } from '../../../components/business-entity-modal';

const stages = [
  { code: 'YENI_TALEP', name: 'Yeni Talep' },
  { code: 'DEGERLENDIRME', name: 'Değerlendirme' },
  { code: 'COZUM_KESIF', name: 'Çözüm / Keşif' },
  { code: 'TEKLIF_VERILDI', name: 'Teklif Verildi' },
  { code: 'KARAR_BEKLENIYOR', name: 'Karar Bekleniyor' },
  { code: 'KAZANILDI', name: 'Kazanıldı' },
  { code: 'KAYBEDILDI', name: 'Kaybedildi' },
] as const;
const nextStages: Record<string, string[]> = {
  YENI_TALEP: ['DEGERLENDIRME'],
  DEGERLENDIRME: ['COZUM_KESIF'],
  COZUM_KESIF: ['TEKLIF_VERILDI'],
  TEKLIF_VERILDI: ['KARAR_BEKLENIYOR'],
  KARAR_BEKLENIYOR: ['KAZANILDI', 'KAYBEDILDI'],
};
const priorityLabels: Record<WorkPriority, string> = {
  LOW: 'Düşük',
  NORMAL: 'Normal',
  HIGH: 'Yüksek',
  CRITICAL: 'Kritik',
};
const taskPriorityLabels: Record<TaskPriority, string> = {
  LOW: 'Düşük',
  MEDIUM: 'Normal',
  HIGH: 'Yüksek',
  CRITICAL: 'Kritik',
};
const categoryLabels: Record<WorkCategory, string> = {
  RADIO_COMMUNICATION: 'Telsiz Haberleşme',
  RF_COVERAGE_DAS: 'RF Kapsama / DAS',
  RAIL_SYSTEMS: 'Raylı Sistemler',
  EMERGENCY_COMMUNICATION: 'Acil Haberleşme',
  EV_CHARGING: 'EV Şarj',
  SERVICE_MAINTENANCE: 'Servis / Bakım',
  OTHER: 'Diğer',
};
type DrawerTab =
  | 'general'
  | 'commercial'
  | 'technical'
  | 'checklist'
  | 'operation'
  | 'tasks'
  | 'activity'
  | 'files';
const backwardStages: Record<string, string> = {
  DEGERLENDIRME: 'YENI_TALEP',
  COZUM_KESIF: 'DEGERLENDIRME',
  TEKLIF_VERILDI: 'COZUM_KESIF',
  KARAR_BEKLENIYOR: 'TEKLIF_VERILDI',
  KAZANILDI: 'KARAR_BEKLENIYOR',
  KAYBEDILDI: 'KARAR_BEKLENIYOR',
};
const operationStages: Array<{ code: OperationStage; label: string }> = [
  { code: 'HAZIRLIK', label: 'Hazırlık' },
  { code: 'SATINALMA', label: 'Satınalma' },
  { code: 'IS_PROGRAMI', label: 'İş Programı' },
  { code: 'ISG', label: 'İSG' },
  { code: 'KURULUM_SERVIS', label: 'Kurulum / Servis' },
  { code: 'TEST', label: 'Test' },
  { code: 'SAT_KABUL', label: 'SAT / Kabul' },
  { code: 'TESLIM', label: 'Teslim' },
  { code: 'FATURALAMA', label: 'Faturalama' },
  { code: 'TAHSILAT', label: 'Tahsilat' },
  { code: 'KAPANIS_BAKIM', label: 'Kapanış / Bakım' },
];
const stageName = (code: string) => stages.find((stage) => stage.code === code)?.name ?? code;
const formatMoney = (value: string | number, currency = 'TRY') =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(value));
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

function getHealth(project: Project) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueTime = project.dueDate ? new Date(project.dueDate).getTime() : null;
  if (dueTime !== null && dueTime < today) return { code: 'red', label: 'Kırmızı' };
  const hasOverdueTask = project.tasks.some((task) =>
    task.status !== 'DONE' && task.dueDate ? new Date(task.dueDate).getTime() < today : false,
  );
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  if (hasOverdueTask || (dueTime !== null && dueTime >= today && dueTime - today <= threeDays)) {
    return { code: 'yellow', label: 'Sarı' };
  }
  return { code: 'green', label: 'Yeşil' };
}

function getCompleteness(project: Project) {
  const fields = [
    { label: 'İş adı', value: project.name },
    { label: 'Müşteri', value: project.customer },
    { label: 'Sorumlu', value: project.owner },
    { label: 'İş kategorisi', value: project.category },
    { label: 'Açıklama', value: project.description },
    { label: 'Termin', value: project.dueDate },
    { label: 'Sonraki aksiyon', value: project.nextAction },
    { label: 'Sonraki aksiyon tarihi', value: project.nextActionDate },
    { label: 'Lokasyon', value: project.location },
    { label: 'Fırsat / teklif bedeli', value: project.estimatedValue ?? project.quotedValue },
    { label: 'Para birimi', value: project.currency },
    { label: 'Planlanan maliyet', value: project.plannedCost },
    { label: 'Müşteri yetkilisi', value: project.customerContactName },
  ];
  const technicalCategories: WorkCategory[] = [
    'RADIO_COMMUNICATION',
    'RF_COVERAGE_DAS',
    'RAIL_SYSTEMS',
    'EMERGENCY_COMMUNICATION',
    'EV_CHARGING',
  ];
  if (project.category && technicalCategories.includes(project.category)) {
    fields.push({ label: 'Teknik çözüm özeti', value: project.technicalSummary });
  }
  const complete = fields.filter(
    (field) => field.value !== null && field.value !== undefined && field.value !== '',
  ).length;
  return {
    percent: Math.round((complete / fields.length) * 100),
    missing: fields
      .filter((field) => !field.value)
      .slice(0, 3)
      .map((field) => field.label),
  };
}

function ProjectsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedProjectId = searchParams.get('project');
  const linkedTab = searchParams.get('tab');
  const [projects, setProjects] = useState<Project[]>([]);
  const [options, setOptions] = useState<ProjectOptions>({ customers: [], owners: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<DrawerTab>('general');
  const [isEditing, setIsEditing] = useState(false);
  const [isOperationEditing, setIsOperationEditing] = useState(false);
  const [readinessFocus, setReadinessFocus] = useState<ReadinessTarget | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedStageCode, setSelectedStageCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isNewWorkOpen, setIsNewWorkOpen] = useState(false);
  const [quickCustomerContext, setQuickCustomerContext] = useState<'edit' | 'new' | null>(null);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [newCustomerId, setNewCustomerId] = useState('');
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const selectedProject = selectedId
    ? (selectedDetail ?? projects.find((project) => project.id === selectedId) ?? null)
    : null;

  const closeDrawer = useCallback(() => {
    if (isSaving) return;
    if (
      hasUnsavedChanges &&
      !window.confirm('Kaydedilmemiş değişiklikler var. İş Dosyası kapatılsın mı?')
    ) {
      return;
    }
    setSelectedId(null);
    setSelectedDetail(null);
    setIsEditing(false);
    setIsOperationEditing(false);
    setIsTaskOpen(false);
    setIsNoteOpen(false);
    setEditingTaskId(null);
    setChecklist([]);
    setHasUnsavedChanges(false);
    setError('');
    setFeedback('');
    if (linkedProjectId) router.replace('/projects', { scroll: false });
  }, [hasUnsavedChanges, isSaving, linkedProjectId, router]);

  const handleError = useCallback(
    (requestError: unknown, fallback: string) => {
      if (requestError instanceof UnauthorizedError) {
        router.replace('/login');
        return;
      }
      setError(requestError instanceof Error ? requestError.message : fallback);
    },
    [router],
  );

  const loadData = useCallback(async () => {
    setError('');
    try {
      const [projectData, optionData] = await Promise.all([fetchProjects(), fetchProjectOptions()]);
      const workflowCodes: readonly string[] = WORKFLOW_STAGE_CODES;
      setProjects(projectData.filter((project) => workflowCodes.includes(project.stage.code)));
      setOptions(optionData);
    } catch (requestError) {
      handleError(requestError, 'İşler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const loadTimeline = useCallback(
    async (projectId: string) => {
      setTimelineLoading(true);
      try {
        setTimeline(await fetchProjectTimeline(projectId));
      } catch (requestError) {
        handleError(requestError, 'Aktivite geçmişi yüklenemedi.');
      } finally {
        setTimelineLoading(false);
      }
    },
    [handleError],
  );

  const loadDetail = useCallback(
    async (projectId: string) => {
      try {
        setSelectedDetail(await fetchProject(projectId));
      } catch (requestError) {
        handleError(requestError, 'İş dosyası yüklenemedi.');
      }
    },
    [handleError],
  );

  const loadChecklist = useCallback(
    async (projectId: string) => {
      try {
        setChecklist(await fetchProjectChecklist(projectId));
      } catch (requestError) {
        handleError(requestError, 'Kontrol listesi yüklenemedi.');
      }
    },
    [handleError],
  );

  useEffect(() => {
    if (!linkedProjectId) return;
    setSelectedId(linkedProjectId);
    setSelectedDetail(null);
    setActiveTab(linkedTab === 'tasks' || linkedTab === 'operation' ? linkedTab : 'general');
    setError('');
    void loadDetail(linkedProjectId);
  }, [linkedProjectId, linkedTab, loadDetail]);

  useEffect(() => {
    void loadData();
    fetchCurrentUser()
      .then(setCurrentUser)
      .catch(() => undefined);
  }, [loadData]);
  useEffect(() => {
    if (selectedId) {
      void loadTimeline(selectedId);
    } else {
      setTimeline([]);
      setChecklist([]);
    }
  }, [selectedId, loadTimeline]);
  useEffect(() => {
    if (selectedId && activeTab === 'checklist') void loadChecklist(selectedId);
  }, [selectedId, activeTab, loadChecklist]);
  useEffect(() => {
    if (!readinessFocus) return;
    const selectors: Record<ReadinessTarget, string> = {
      MANAGER: '.operation-form [name="operationManagerId"]',
      SCHEDULE: '.operation-form [name="plannedStartAt"]',
      NEXT_ACTION: '.operation-form [name="nextAction"]',
      CATEGORY: '.drawer-edit-form [name="category"]',
      CHECKLIST: '#project-checklist',
    };
    const field = document.querySelector<HTMLElement>(selectors[readinessFocus]);
    if (field) {
      field.focus();
      field.scrollIntoView({ block: 'center' });
      setReadinessFocus(null);
    }
  }, [readinessFocus, isOperationEditing, isEditing, activeTab]);
  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && selectedId && !isEditing) closeDrawer();
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeDrawer, isEditing, selectedId]);

  const metrics = useMemo(
    () => [
      {
        label: 'Açık İşler',
        value: projects.filter((item) => !['KAZANILDI', 'KAYBEDILDI'].includes(item.stage.code))
          .length,
      },
      {
        label: 'Teklif Aşamasında',
        value: projects.filter((item) => item.stage.code === 'TEKLIF_VERILDI').length,
      },
      {
        label: 'Karar Bekleyen',
        value: projects.filter((item) => item.stage.code === 'KARAR_BEKLENIYOR').length,
      },
      {
        label: 'Kazanılan',
        value: projects.filter((item) => item.stage.code === 'KAZANILDI').length,
      },
    ],
    [projects],
  );
  const visibleProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          (!categoryFilter || project.category === categoryFilter) &&
          (!ownerFilter || project.owner?.id === ownerFilter) &&
          (!priorityFilter || project.priority === priorityFilter) &&
          (!healthFilter || getHealth(project).code === healthFilter) &&
          (!stageFilter || project.stage.code === stageFilter),
      ),
    [projects, categoryFilter, ownerFilter, priorityFilter, healthFilter, stageFilter],
  );

  async function handleCreateWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setFeedback('');
    const form = new FormData(event.currentTarget);
    const estimatedValue = form.get('estimatedValue')?.toString();
    const input: CreateProjectInput = {
      name: form.get('name')?.toString().trim() ?? '',
      customerId: form.get('customerId')?.toString() || undefined,
      source: form.get('source')?.toString() || undefined,
      ownerId: form.get('ownerId')?.toString() || undefined,
      priority: form.get('priority')?.toString() as WorkPriority,
      estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
      currency: form.get('currency')?.toString() as CreateProjectInput['currency'],
      dueDate: form.get('dueDate')?.toString() || undefined,
      description: form.get('description')?.toString().trim() || undefined,
    };
    try {
      await createProject(input);
      setIsNewWorkOpen(false);
      setFeedback('Yeni iş / talep oluşturuldu.');
      await loadData();
    } catch (requestError) {
      handleError(requestError, 'İş kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStageChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    setIsSaving(true);
    setError('');
    setFeedback('');
    const stageCode = new FormData(event.currentTarget).get('stageCode')?.toString();
    const reason = new FormData(event.currentTarget).get('reason')?.toString().trim();
    if (!stageCode) {
      setIsSaving(false);
      return;
    }
    try {
      const result = await changeProjectStage(selectedProject.id, stageCode, reason || undefined);
      setProjects((items) =>
        items.map((item) => (item.id === result.project.id ? result.project : item)),
      );
      setSelectedDetail(result.project);
      if (result.project.stage.code !== 'KAZANILDI' && activeTab === 'operation') {
        setActiveTab('general');
      }
      setFeedback(result.warnings[0] ?? `${stageName(stageCode)} aşamasına geçildi.`);
      setSelectedStageCode('');
      void loadTimeline(selectedProject.id);
      void loadChecklist(selectedProject.id);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '';
      if (message.includes('tamamlanmalıdır')) {
        setActiveTab('general');
        setIsEditing(true);
      }
      handleError(requestError, 'Aşama değiştirilemedi.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    setIsSaving(true);
    setError('');
    setFeedback('');
    const note = new FormData(event.currentTarget).get('note')?.toString().trim() ?? '';
    const noteForm = event.currentTarget;
    try {
      await addProjectNote(selectedProject.id, note);
      noteForm.reset();
      setIsNoteOpen(false);
      setHasUnsavedChanges(false);
      setFeedback('Aktivite eklendi.');
      void loadTimeline(selectedProject.id);
    } catch (requestError) {
      handleError(requestError, 'Aktivite eklenemedi.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    setIsSaving(true);
    setError('');
    setFeedback('');
    const form = new FormData(event.currentTarget);
    const taskForm = event.currentTarget;
    try {
      const task = await createProjectTask(selectedProject.id, {
        title: form.get('title')?.toString().trim() ?? '',
        assigneeId: form.get('assigneeId')?.toString() || undefined,
        dueDate: form.get('dueDate')?.toString() || undefined,
        priority: form.get('priority')?.toString() as TaskPriority,
      });
      setProjects((items) =>
        items.map((item) =>
          item.id === selectedProject.id
            ? { ...item, tasks: [...item.tasks, task], updatedAt: new Date().toISOString() }
            : item,
        ),
      );
      setSelectedDetail((current) =>
        current
          ? { ...current, tasks: [...current.tasks, task], updatedAt: new Date().toISOString() }
          : current,
      );
      taskForm.reset();
      setIsTaskOpen(false);
      setHasUnsavedChanges(false);
      setFeedback('Görev oluşturuldu.');
      void loadTimeline(selectedProject.id);
    } catch (requestError) {
      handleError(requestError, 'Görev oluşturulamadı.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleChecklistToggle(item: ChecklistItem) {
    if (!selectedProject) return;
    setIsSaving(true);
    setError('');
    try {
      const updated = await updateChecklistItem(selectedProject.id, item.id, !item.isCompleted);
      setChecklist((items) =>
        items.map((current) => (current.id === updated.id ? updated : current)),
      );
      setFeedback(
        updated.isCompleted ? 'Kontrol maddesi tamamlandı.' : 'Kontrol maddesi yeniden açıldı.',
      );
      void loadTimeline(selectedProject.id);
    } catch (requestError) {
      handleError(requestError, 'Kontrol maddesi güncellenemedi.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCompleteNextAction() {
    if (!selectedProject) return;
    setIsSaving(true);
    setError('');
    setFeedback('');
    try {
      const updated = await completeNextAction(selectedProject.id);
      setSelectedDetail(updated);
      setProjects((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setFeedback(
        'Sonraki aksiyon tamamlandı. Yeni aksiyonu Genel sekmesinden tanımlayabilirsiniz.',
      );
      void loadTimeline(updated.id);
    } catch (requestError) {
      handleError(requestError, 'Sonraki aksiyon tamamlanamadı.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTaskStatus(taskId: string, status: Project['tasks'][number]['status']) {
    if (!selectedProject) return;
    setIsSaving(true);
    setError('');
    try {
      const updated = await updateTask(taskId, { status });
      const apply = (project: Project) => ({
        ...project,
        tasks: project.tasks.map((task) => (task.id === updated.id ? updated : task)),
      });
      setSelectedDetail((current) => (current ? apply(current) : current));
      setProjects((items) =>
        items.map((item) => (item.id === selectedProject.id ? apply(item) : item)),
      );
      setFeedback(status === 'DONE' ? 'Görev tamamlandı.' : 'Görev yeniden açıldı.');
      void loadTimeline(selectedProject.id);
    } catch (requestError) {
      handleError(requestError, 'Görev güncellenemedi.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTaskEdit(event: FormEvent<HTMLFormElement>, taskId: string) {
    event.preventDefault();
    if (!selectedProject) return;
    setIsSaving(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const updated = await updateTask(taskId, {
        title: form.get('title')?.toString().trim(),
        assigneeId: form.get('assigneeId')?.toString() || null,
        dueDate: form.get('dueDate')?.toString() || null,
        priority: form.get('priority')?.toString() as TaskPriority,
        status: form.get('status')?.toString() as Project['tasks'][number]['status'],
      });
      const apply = (project: Project) => ({
        ...project,
        tasks: project.tasks.map((task) => (task.id === updated.id ? updated : task)),
      });
      setSelectedDetail((current) => (current ? apply(current) : current));
      setProjects((items) =>
        items.map((item) => (item.id === selectedProject.id ? apply(item) : item)),
      );
      setEditingTaskId(null);
      setHasUnsavedChanges(false);
      setFeedback('Görev güncellendi.');
      void loadTimeline(selectedProject.id);
    } catch (requestError) {
      handleError(requestError, 'Görev güncellenemedi.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    setIsSaving(true);
    setError('');
    setFeedback('');
    const form = new FormData(event.currentTarget);
    const nullable = (name: string) => form.get(name)?.toString().trim() || null;
    const number = (name: string) => {
      const value = form.get(name)?.toString();
      return value ? Number(value) : null;
    };
    const input: UpdateProjectInput =
      activeTab === 'general'
        ? {
            name: form.get('name')?.toString().trim() ?? '',
            customerId: nullable('customerId'),
            ownerId: nullable('ownerId'),
            category: nullable('category') as WorkCategory | null,
            priority: form.get('priority')?.toString() as WorkPriority,
            source: nullable('source'),
            location: nullable('location'),
            customerContactName: nullable('customerContactName'),
            customerContactPhone: nullable('customerContactPhone'),
            customerContactEmail: nullable('customerContactEmail'),
            dueDate: nullable('dueDate'),
            nextAction: nullable('nextAction'),
            nextActionDate: nullable('nextActionDate'),
            description: nullable('description'),
          }
        : activeTab === 'commercial'
          ? {
              estimatedValue: number('estimatedValue'),
              quotedValue: number('quotedValue'),
              plannedCost: number('plannedCost'),
              currency: nullable('currency') as UpdateProjectInput['currency'],
              probabilityPercent: number('probabilityPercent'),
              offerNumber: nullable('offerNumber'),
              offerRevision: nullable('offerRevision'),
              offerDate: nullable('offerDate'),
              offerValidUntil: nullable('offerValidUntil'),
              paymentTerms: nullable('paymentTerms'),
              deliveryTerms: nullable('deliveryTerms'),
              contractPoReference: nullable('contractPoReference'),
            }
          : {
              category: nullable('category') as WorkCategory | null,
              technicalSummary: nullable('technicalSummary'),
              frequencyBand: nullable('frequencyBand'),
              estimatedQuantity: number('estimatedQuantity'),
              location: nullable('location'),
            };
    try {
      const updated = await updateProject(selectedProject.id, input);
      setSelectedDetail(updated);
      setProjects((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setIsEditing(false);
      setHasUnsavedChanges(false);
      setFeedback('İş bilgileri güncellendi.');
      void loadTimeline(updated.id);
      void loadChecklist(updated.id);
    } catch (requestError) {
      handleError(requestError, 'İş bilgileri kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  }

  function applyOperation(operation: ProjectOperation) {
    const apply = (project: Project) => ({ ...project, operation });
    setSelectedDetail((current) => (current ? apply(current) : current));
    setProjects((items) =>
      items.map((item) => (item.id === operation.projectId ? apply(item) : item)),
    );
  }

  async function handleOperationUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    setIsSaving(true);
    setError('');
    setFeedback('');
    const form = new FormData(event.currentTarget);
    const nullable = (name: string) => form.get(name)?.toString().trim() || null;
    try {
      const operation = await updateProjectOperation(selectedProject.id, {
        operationManagerId: nullable('operationManagerId'),
        plannedStartAt: nullable('plannedStartAt'),
        plannedEndAt: nullable('plannedEndAt'),
        actualStartAt: nullable('actualStartAt'),
        actualEndAt: nullable('actualEndAt'),
        completionPercent: Number(form.get('completionPercent') ?? 0),
        nextAction: nullable('nextAction'),
        nextActionDueAt: nullable('nextActionDueAt'),
        notes: nullable('notes'),
      });
      applyOperation(operation);
      setIsOperationEditing(false);
      setHasUnsavedChanges(false);
      setFeedback('Operasyon bilgileri güncellendi.');
      void loadTimeline(selectedProject.id);
    } catch (requestError) {
      handleError(requestError, 'Operasyon bilgileri güncellenemedi.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleOperationAdvance() {
    if (!selectedProject) return;
    setIsSaving(true);
    setError('');
    setFeedback('');
    try {
      const operation = await advanceProjectOperation(selectedProject.id);
      applyOperation(operation);
      setFeedback('Operasyon bir sonraki aşamaya geçirildi.');
      void loadTimeline(selectedProject.id);
    } catch (requestError) {
      handleError(requestError, 'Operasyon aşaması ilerletilemedi.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleOperationRevert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    setIsSaving(true);
    setError('');
    setFeedback('');
    const form = event.currentTarget;
    const reason = new FormData(form).get('reason')?.toString().trim() ?? '';
    try {
      const operation = await revertProjectOperation(selectedProject.id, reason);
      applyOperation(operation);
      form.reset();
      setHasUnsavedChanges(false);
      setFeedback('Operasyon bir önceki aşamaya geri alındı.');
      void loadTimeline(selectedProject.id);
    } catch (requestError) {
      handleError(requestError, 'Operasyon aşaması geri alınamadı.');
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDiscardChanges() {
    return (
      !hasUnsavedChanges ||
      window.confirm('Kaydedilmemiş değişiklikler var. Değişiklikler silinsin mi?')
    );
  }

  function cancelEditing() {
    setIsEditing(false);
    setIsOperationEditing(false);
    setHasUnsavedChanges(false);
    setError('');
  }

  function handleReadinessCorrection(target: ReadinessTarget) {
    if (isSaving || !confirmDiscardChanges()) return;
    setActiveTab(
      target === 'CHECKLIST' ? 'checklist' : target === 'CATEGORY' ? 'general' : 'operation',
    );
    setIsEditing(target === 'CATEGORY');
    setIsOperationEditing(target !== 'CATEGORY' && target !== 'CHECKLIST');
    setHasUnsavedChanges(false);
    setError('');
    setReadinessFocus(target);
  }

  function changeDrawerTab(tab: DrawerTab) {
    if (tab === activeTab || !confirmDiscardChanges()) return;
    setActiveTab(tab);
    setIsEditing(false);
    setIsOperationEditing(false);
    setIsTaskOpen(false);
    setIsNoteOpen(false);
    setEditingTaskId(null);
    setHasUnsavedChanges(false);
    setError('');
  }

  function toggleTaskComposer() {
    if (isTaskOpen) {
      if (!confirmDiscardChanges()) return;
      setIsTaskOpen(false);
      setHasUnsavedChanges(false);
      return;
    }
    if (!confirmDiscardChanges()) return;
    setActiveTab('tasks');
    setIsEditing(false);
    setIsNoteOpen(false);
    setIsTaskOpen(true);
    setEditingTaskId(null);
    setHasUnsavedChanges(false);
  }

  function toggleNoteComposer() {
    if (isNoteOpen) {
      if (!confirmDiscardChanges()) return;
      setIsNoteOpen(false);
      setHasUnsavedChanges(false);
      return;
    }
    if (!confirmDiscardChanges()) return;
    setActiveTab('activity');
    setIsEditing(false);
    setIsTaskOpen(false);
    setIsNoteOpen(true);
    setEditingTaskId(null);
    setHasUnsavedChanges(false);
  }

  function openDrawer(id: string) {
    setSelectedId(id);
    setSelectedDetail(null);
    setActiveTab('general');
    setIsEditing(false);
    setIsOperationEditing(false);
    setError('');
    setFeedback('');
    setIsNoteOpen(false);
    setIsTaskOpen(false);
    setHasUnsavedChanges(false);
    void loadDetail(id);
  }
  function handleCardKey(event: KeyboardEvent<HTMLElement>, id: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDrawer(id);
    }
  }

  const completeness = selectedProject ? getCompleteness(selectedProject) : null;
  const quotedValue =
    selectedProject?.quotedValue != null ? Number(selectedProject.quotedValue) : null;
  const plannedCost =
    selectedProject?.plannedCost != null ? Number(selectedProject.plannedCost) : null;
  const grossProfit =
    quotedValue !== null && plannedCost !== null ? quotedValue - plannedCost : null;
  const grossMargin =
    grossProfit !== null && quotedValue && quotedValue > 0
      ? (grossProfit / quotedValue) * 100
      : null;
  const canMoveBackward =
    currentUser?.roles.some((role) =>
      ['SUPER_ADMIN', 'COMPANY_ADMIN', 'PROJECT_MANAGER'].includes(role),
    ) ?? false;
  const stageChoices = selectedProject
    ? [
        ...(nextStages[selectedProject.stage.code] ?? []),
        ...(canMoveBackward && backwardStages[selectedProject.stage.code]
          ? [backwardStages[selectedProject.stage.code]]
          : []),
      ]
    : [];
  const isBackwardSelection = selectedProject
    ? backwardStages[selectedProject.stage.code] === selectedStageCode
    : false;
  const workspaceRoute = selectedProject?.category
    ? (
        {
          EV_CHARGING: 'ev',
          RF_COVERAGE_DAS: 'rf',
          RADIO_COMMUNICATION: 'rf',
          SERVICE_MAINTENANCE: 'service',
          RAIL_SYSTEMS: 'rail',
          EMERGENCY_COMMUNICATION: 'emergency',
        } as Partial<Record<WorkCategory, string>>
      )[selectedProject.category]
    : undefined;
  const workspaceLabel = selectedProject?.category
    ? (
        {
          EV_CHARGING: 'BIEM-EV Çalışma Alanını Aç',
          RF_COVERAGE_DAS: "RF Planner'ı Aç",
          RADIO_COMMUNICATION: 'RF / Telsiz Çalışma Alanını Aç',
          SERVICE_MAINTENANCE: 'Servis Çalışma Alanını Aç',
          RAIL_SYSTEMS: 'Raylı Sistem Çalışma Alanını Aç',
          EMERGENCY_COMMUNICATION: 'Acil Haberleşme Çalışma Alanını Aç',
        } as Partial<Record<WorkCategory, string>>
      )[selectedProject.category]
    : undefined;
  const readinessItems = selectedProject
    ? ([
        ['Müşteri mevcut', Boolean(selectedProject.customer)],
        ['Sorumlu atanmış', Boolean(selectedProject.owner)],
        ['Teklif bedeli mevcut', selectedProject.quotedValue != null],
        ['Termin mevcut', Boolean(selectedProject.dueDate)],
        ['Teknik kapsam mevcut', Boolean(selectedProject.technicalSummary)],
        ['Sözleşme / PO bilgisi', Boolean(selectedProject.contractPoReference)],
      ] as const)
    : [];
  const operation = selectedProject?.operation ?? null;
  const operationStageIndex = operation
    ? operationStages.findIndex((stage) => stage.code === operation.operationStage)
    : -1;
  const operationEvents = timeline.filter((event) => event.eventType.startsWith('OPERATION_'));

  return (
    <section className="workflow-page">
      <div className="workflow-header">
        <div className="page-heading">
          <p className="eyebrow">BIEM ONE Workflow</p>
          <h1>İşler</h1>
          <p className="muted">Talep, teklif ve karar sürecini tek ekrandan yönetin.</p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            setNewCustomerId('');
            setIsNewWorkOpen(true);
          }}
        >
          + Yeni İş / Talep
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {feedback ? <p className="form-success">{feedback}</p> : null}
      <div className="workflow-metrics">
        {metrics.map((metric) => (
          <article className="workflow-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{loading ? '—' : metric.value}</strong>
          </article>
        ))}
      </div>
      {!loading && projects.length === 0 ? (
        <div className="workflow-empty">
          <h2>Henüz iş kaydı yok.</h2>
          <p>İlk talebi oluşturarak başlayın.</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setNewCustomerId('');
              setIsNewWorkOpen(true);
            }}
          >
            + İlk Talebi Oluştur
          </button>
        </div>
      ) : null}
      <div className="workflow-filters" aria-label="İş filtreleri">
        <label>
          Kategori
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Tümü</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sorumlu
          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="">Tümü</option>
            {options.owners.map((owner) => (
              <option value={owner.id} key={owner.id}>
                {owner.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Öncelik
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">Tümü</option>
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sağlık
          <select value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)}>
            <option value="">Tümü</option>
            <option value="green">Yeşil</option>
            <option value="yellow">Sarı</option>
            <option value="red">Kırmızı</option>
          </select>
        </label>
        <label>
          Aşama
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="">Tümü</option>
            {stages.map((stage) => (
              <option value={stage.code} key={stage.code}>
                {stage.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="kanban" aria-label="İş akışı panosu">
        {stages.map((stage) => {
          const stageProjects = visibleProjects.filter(
            (project) => project.stage.code === stage.code,
          );
          return (
            <section className={`kanban-column stage-${stage.code.toLowerCase()}`} key={stage.code}>
              <header>
                <h2>{stage.name}</h2>
                <span>{loading ? '—' : stageProjects.length}</span>
              </header>
              <div className="kanban-cards">
                {stageProjects.map((project) => {
                  const health = getHealth(project);
                  return (
                    <article
                      className="work-card"
                      key={project.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openDrawer(project.id)}
                      onKeyDown={(event) => handleCardKey(event, project.id)}
                    >
                      <span className="work-number">{project.workNumber ?? 'Numara bekliyor'}</span>
                      <div className="card-title-line">
                        <h3>{project.name}</h3>
                        <span
                          className={`health-dot health-${health.code}`}
                          title={`Sağlık: ${health.label}`}
                        />
                      </div>
                      {project.customer ? (
                        <p className="work-customer">{project.customer.name}</p>
                      ) : null}
                      <div className="work-meta">
                        <span className={`priority priority-${project.priority.toLowerCase()}`}>
                          {priorityLabels[project.priority]}
                        </span>
                        {project.estimatedValue != null ? (
                          <strong>
                            {formatMoney(project.estimatedValue, project.currency ?? 'TRY')}
                          </strong>
                        ) : null}
                      </div>
                      {project.owner ? <p>👤 {project.owner.fullName}</p> : null}
                      {project.dueDate ? <p>◷ {formatDate(project.dueDate)}</p> : null}
                      <p className="open-task-count">
                        {project.tasks.filter((task) => task.status !== 'DONE').length} açık görev
                      </p>
                      {project.nextAction ? (
                        <div
                          className={`next-action ${project.nextActionDate && new Date(project.nextActionDate).getTime() < Date.now() ? 'next-action-overdue' : ''}`}
                        >
                          <span>Sonraki:</span>
                          <strong>{project.nextAction}</strong>
                          {project.nextActionDate ? (
                            <time>{formatDate(project.nextActionDate)}</time>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
                {!loading && stageProjects.length === 0 ? (
                  <p className="empty-column">Henüz iş yok</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      {selectedProject ? (
        <div className="drawer-backdrop" role="presentation" onMouseDown={closeDrawer}>
          <aside
            className="work-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="drawer-header">
              <div>
                <p className="eyebrow">{selectedProject.workNumber ?? 'İş numarası bekliyor'}</p>
                <h2 id="drawer-title">{selectedProject.name}</h2>
                <p>{selectedProject.customer?.name ?? 'Müşteri seçilmedi'}</p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Kapat"
                onClick={closeDrawer}
                disabled={isSaving}
              >
                ×
              </button>
            </header>
            <div className="drawer-badges">
              <span className="stage-pill">{selectedProject.stage.name}</span>
              <span className={`priority priority-${selectedProject.priority.toLowerCase()}`}>
                {priorityLabels[selectedProject.priority]}
              </span>
              <span className={`health-badge health-${getHealth(selectedProject).code}`}>
                <i />
                {getHealth(selectedProject).label}
              </span>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            {feedback ? <p className="form-success">{feedback}</p> : null}
            {completeness ? (
              <div className="completeness">
                <div>
                  <strong>Bilgi Tamlığı: %{completeness.percent}</strong>
                  <span>
                    {completeness.missing.length
                      ? `Eksik: ${completeness.missing.join(', ')}`
                      : 'Temel bilgiler tamamlandı'}
                  </span>
                </div>
                <progress max="100" value={completeness.percent} />
              </div>
            ) : null}
            <nav className="drawer-tabs" aria-label="İş dosyası bölümleri">
              {(
                [
                  ['general', 'Genel'],
                  ['commercial', 'Ticari'],
                  ['technical', 'Teknik'],
                  ['checklist', 'Kontrol Listesi'],
                  ['operation', 'Operasyon'],
                  ['tasks', 'Görevler'],
                  ['activity', 'Aktivite'],
                  ['files', 'Dosyalar'],
                ] as const
              ).map(([tab, label]) => (
                <button
                  className={activeTab === tab ? 'active' : ''}
                  type="button"
                  key={tab}
                  onClick={() => changeDrawerTab(tab)}
                  disabled={tab === 'operation' && selectedProject.stage.code !== 'KAZANILDI'}
                  title={
                    tab === 'operation' && selectedProject.stage.code !== 'KAZANILDI'
                      ? 'BOM ve Satınalma yönetimi, iş Kazanıldı aşamasına geçtiğinde açılır.'
                      : undefined
                  }
                >
                  {label}
                </button>
              ))}
            </nav>
            {activeTab === 'general' ? (
              <section className="drawer-section">
                <h3>Genel</h3>
                <div className="section-toolbar">
                  <span>İşin temel ve operasyonel bilgileri</span>
                  {!isEditing ? (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => {
                        setEditCustomerId(selectedProject.customer?.id ?? '');
                        setIsEditing(true);
                      }}
                    >
                      Düzenle
                    </button>
                  ) : null}
                </div>
                {isEditing ? (
                  <form
                    className="drawer-edit-form"
                    onSubmit={handleUpdateWork}
                    onChange={() => setHasUnsavedChanges(true)}
                  >
                    <label className="form-wide">
                      İş / Talep Adı
                      <input name="name" required defaultValue={selectedProject.name} />
                    </label>
                    <label className="form-wide">
                      Müşteri
                      <span className="entity-select-row">
                        <select
                          name="customerId"
                          value={editCustomerId}
                          onChange={(event) => setEditCustomerId(event.target.value)}
                        >
                          <option value="">Seçilmedi</option>
                          {options.customers.map((item) => (
                            <option value={item.id} key={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => setQuickCustomerContext('edit')}
                        >
                          + Yeni Müşteri
                        </button>
                      </span>
                    </label>
                    <label>
                      Müşteri Yetkilisi
                      <input
                        name="customerContactName"
                        defaultValue={selectedProject.customerContactName ?? ''}
                      />
                    </label>
                    <label>
                      Telefon
                      <input
                        name="customerContactPhone"
                        defaultValue={selectedProject.customerContactPhone ?? ''}
                      />
                    </label>
                    <label>
                      E-posta
                      <input
                        name="customerContactEmail"
                        type="email"
                        defaultValue={selectedProject.customerContactEmail ?? ''}
                      />
                    </label>
                    <label>
                      İş Kategorisi
                      <select name="category" defaultValue={selectedProject.category ?? ''}>
                        <option value="">Seçilmedi</option>
                        {Object.entries(categoryLabels).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Kaynak
                      <select name="source" defaultValue={selectedProject.source ?? ''}>
                        <option value="">Seçilmedi</option>
                        {['Telefon', 'E-posta', 'WhatsApp', 'İhale', 'Referans', 'Diğer'].map(
                          (item) => (
                            <option key={item}>{item}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <label>
                      Lokasyon / Saha
                      <input name="location" defaultValue={selectedProject.location ?? ''} />
                    </label>
                    <label>
                      Sorumlu
                      <select name="ownerId" defaultValue={selectedProject.owner?.id ?? ''}>
                        <option value="">Seçilmedi</option>
                        {options.owners.map((item) => (
                          <option value={item.id} key={item.id}>
                            {item.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Öncelik
                      <select name="priority" defaultValue={selectedProject.priority}>
                        {Object.entries(priorityLabels).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Termin
                      <input
                        name="dueDate"
                        type="date"
                        defaultValue={selectedProject.dueDate?.slice(0, 10) ?? ''}
                      />
                    </label>
                    <label className="form-wide">
                      Sonraki Aksiyon
                      <input name="nextAction" defaultValue={selectedProject.nextAction ?? ''} />
                    </label>
                    <label>
                      Sonraki Aksiyon Tarihi
                      <input
                        name="nextActionDate"
                        type="date"
                        defaultValue={selectedProject.nextActionDate?.slice(0, 10) ?? ''}
                      />
                    </label>
                    <label className="form-wide">
                      Açıklama
                      <textarea
                        name="description"
                        rows={4}
                        defaultValue={selectedProject.description ?? ''}
                      />
                    </label>
                    <div className="form-actions form-wide">
                      <button className="secondary-button" type="button" onClick={cancelEditing}>
                        Vazgeç
                      </button>
                      <button className="primary-button" type="submit" disabled={isSaving}>
                        Kaydet
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl className="detail-grid">
                    <div>
                      <dt>İş / Talep adı</dt>
                      <dd>{selectedProject.name}</dd>
                    </div>
                    <div>
                      <dt>Müşteri</dt>
                      <dd>{selectedProject.customer?.name ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Kaynak</dt>
                      <dd>{selectedProject.source ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Sorumlu</dt>
                      <dd>{selectedProject.owner?.fullName ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Öncelik</dt>
                      <dd>{priorityLabels[selectedProject.priority]}</dd>
                    </div>
                    <div>
                      <dt>İş kategorisi</dt>
                      <dd>
                        {selectedProject.category ? categoryLabels[selectedProject.category] : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Para birimi</dt>
                      <dd>{selectedProject.currency ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Termin</dt>
                      <dd>{selectedProject.dueDate ? formatDate(selectedProject.dueDate) : '—'}</dd>
                    </div>
                    <div className="detail-wide">
                      <dt>Açıklama</dt>
                      <dd>{selectedProject.description || '—'}</dd>
                    </div>
                    <div className="detail-wide">
                      <dt>Sonraki aksiyon</dt>
                      <dd>
                        {selectedProject.nextAction ?? '—'}
                        {selectedProject.nextActionDate
                          ? ` · ${formatDate(selectedProject.nextActionDate)}`
                          : ''}
                      </dd>
                    </div>
                  </dl>
                )}
              </section>
            ) : null}
            {activeTab === 'general' && selectedProject.nextAction ? (
              <section
                className={`next-action-panel ${selectedProject.nextActionDate && new Date(selectedProject.nextActionDate).getTime() < Date.now() ? 'next-action-overdue' : ''}`}
              >
                <div>
                  <span>Sonraki Aksiyon</span>
                  <strong>{selectedProject.nextAction}</strong>
                  {selectedProject.nextActionDate ? (
                    <time>{formatDate(selectedProject.nextActionDate)}</time>
                  ) : null}
                </div>
                <button
                  className="primary-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleCompleteNextAction()}
                >
                  Tamamlandı
                </button>
              </section>
            ) : null}
            {activeTab === 'commercial' ? (
              <section className="drawer-section">
                <h3>Ticari</h3>
                <div className="section-toolbar">
                  <span>Fırsat, teklif ve maliyet özeti</span>
                  {!isEditing ? (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => setIsEditing(true)}
                    >
                      Düzenle
                    </button>
                  ) : null}
                </div>
                <div className="commercial-summary">
                  <div>
                    <span>Beklenen Brüt Kâr</span>
                    <strong>
                      {grossProfit !== null
                        ? formatMoney(grossProfit, selectedProject.currency ?? 'TRY')
                        : '—'}
                    </strong>
                  </div>
                  <div>
                    <span>Beklenen Brüt Marj %</span>
                    <strong>{grossMargin !== null ? `%${grossMargin.toFixed(1)}` : '—'}</strong>
                  </div>
                </div>
                {isEditing ? (
                  <form
                    className="drawer-edit-form"
                    onSubmit={handleUpdateWork}
                    onChange={() => setHasUnsavedChanges(true)}
                  >
                    <label>
                      Tahmini Fırsat Bedeli
                      <input
                        name="estimatedValue"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={selectedProject.estimatedValue?.toString() ?? ''}
                      />
                    </label>
                    <label>
                      Teklif Bedeli
                      <input
                        name="quotedValue"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={selectedProject.quotedValue?.toString() ?? ''}
                      />
                    </label>
                    <label>
                      Para Birimi
                      <select name="currency" defaultValue={selectedProject.currency ?? ''}>
                        <option value="">Seçilmedi</option>
                        <option>TRY</option>
                        <option>USD</option>
                        <option>EUR</option>
                      </select>
                    </label>
                    <label>
                      Planlanan Maliyet
                      <input
                        name="plannedCost"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={selectedProject.plannedCost?.toString() ?? ''}
                      />
                    </label>
                    <label>
                      Kazanma Olasılığı %
                      <input
                        name="probabilityPercent"
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={selectedProject.probabilityPercent ?? ''}
                      />
                    </label>
                    <label>
                      Teklif No
                      <input name="offerNumber" defaultValue={selectedProject.offerNumber ?? ''} />
                    </label>
                    <label>
                      Revizyon
                      <input
                        name="offerRevision"
                        defaultValue={selectedProject.offerRevision ?? ''}
                      />
                    </label>
                    <label>
                      Teklif Tarihi
                      <input
                        name="offerDate"
                        type="date"
                        defaultValue={selectedProject.offerDate?.slice(0, 10) ?? ''}
                      />
                    </label>
                    <label>
                      Teklif Geçerlilik Tarihi
                      <input
                        name="offerValidUntil"
                        type="date"
                        defaultValue={selectedProject.offerValidUntil?.slice(0, 10) ?? ''}
                      />
                    </label>
                    <label className="form-wide">
                      Ödeme Şartı
                      <textarea
                        name="paymentTerms"
                        rows={2}
                        defaultValue={selectedProject.paymentTerms ?? ''}
                      />
                    </label>
                    <label className="form-wide">
                      Teslim Şartı
                      <textarea
                        name="deliveryTerms"
                        rows={2}
                        defaultValue={selectedProject.deliveryTerms ?? ''}
                      />
                    </label>
                    <label className="form-wide">
                      Sözleşme / PO Bilgisi
                      <input
                        name="contractPoReference"
                        defaultValue={selectedProject.contractPoReference ?? ''}
                      />
                    </label>
                    <div className="form-actions form-wide">
                      <button className="secondary-button" type="button" onClick={cancelEditing}>
                        Vazgeç
                      </button>
                      <button className="primary-button" type="submit" disabled={isSaving}>
                        Kaydet
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl className="detail-grid">
                    <div>
                      <dt>Tahmini fırsat</dt>
                      <dd>
                        {selectedProject.estimatedValue != null
                          ? formatMoney(
                              selectedProject.estimatedValue,
                              selectedProject.currency ?? 'TRY',
                            )
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Teklif bedeli</dt>
                      <dd>
                        {selectedProject.quotedValue != null
                          ? formatMoney(
                              selectedProject.quotedValue,
                              selectedProject.currency ?? 'TRY',
                            )
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Planlanan maliyet</dt>
                      <dd>
                        {selectedProject.plannedCost != null
                          ? formatMoney(
                              selectedProject.plannedCost,
                              selectedProject.currency ?? 'TRY',
                            )
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Kazanma olasılığı</dt>
                      <dd>
                        {selectedProject.probabilityPercent != null
                          ? `%${selectedProject.probabilityPercent}`
                          : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Teklif No / Revizyon</dt>
                      <dd>
                        {selectedProject.offerNumber ?? '—'} /{' '}
                        {selectedProject.offerRevision ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Geçerlilik</dt>
                      <dd>
                        {selectedProject.offerValidUntil
                          ? formatDate(selectedProject.offerValidUntil)
                          : '—'}
                      </dd>
                    </div>
                    <div className="detail-wide">
                      <dt>Ödeme / Teslim şartı</dt>
                      <dd>
                        {selectedProject.paymentTerms ?? '—'} /{' '}
                        {selectedProject.deliveryTerms ?? '—'}
                      </dd>
                    </div>
                    <div className="detail-wide">
                      <dt>Sözleşme / PO</dt>
                      <dd>{selectedProject.contractPoReference ?? '—'}</dd>
                    </div>
                  </dl>
                )}
              </section>
            ) : null}
            {activeTab === 'technical' ? (
              <section className="drawer-section">
                <h3>Teknik</h3>
                <div className="section-toolbar">
                  <span>Teknik çözümün kısa özeti</span>
                  {!isEditing ? (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => setIsEditing(true)}
                    >
                      Düzenle
                    </button>
                  ) : null}
                </div>
                {isEditing ? (
                  <form
                    className="drawer-edit-form"
                    onSubmit={handleUpdateWork}
                    onChange={() => setHasUnsavedChanges(true)}
                  >
                    <label>
                      İş Kategorisi
                      <select name="category" defaultValue={selectedProject.category ?? ''}>
                        <option value="">Seçilmedi</option>
                        {Object.entries(categoryLabels).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Frekans / Bant
                      <input
                        name="frequencyBand"
                        defaultValue={selectedProject.frequencyBand ?? ''}
                      />
                    </label>
                    <label>
                      Tahmini Adet / Sistem Sayısı
                      <input
                        name="estimatedQuantity"
                        type="number"
                        min="0"
                        defaultValue={selectedProject.estimatedQuantity ?? ''}
                      />
                    </label>
                    <label>
                      Lokasyon
                      <input name="location" defaultValue={selectedProject.location ?? ''} />
                    </label>
                    <label className="form-wide">
                      Teknik Çözüm Özeti
                      <textarea
                        name="technicalSummary"
                        rows={5}
                        defaultValue={selectedProject.technicalSummary ?? ''}
                      />
                    </label>
                    <div className="form-actions form-wide">
                      <button className="secondary-button" type="button" onClick={cancelEditing}>
                        Vazgeç
                      </button>
                      <button className="primary-button" type="submit" disabled={isSaving}>
                        Kaydet
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl className="detail-grid">
                    <div>
                      <dt>İş kategorisi</dt>
                      <dd>
                        {selectedProject.category ? categoryLabels[selectedProject.category] : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Frekans / Bant</dt>
                      <dd>{selectedProject.frequencyBand ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Tahmini adet</dt>
                      <dd>{selectedProject.estimatedQuantity ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Lokasyon</dt>
                      <dd>{selectedProject.location ?? '—'}</dd>
                    </div>
                    <div className="detail-wide">
                      <dt>Teknik çözüm özeti</dt>
                      <dd>{selectedProject.technicalSummary ?? '—'}</dd>
                    </div>
                  </dl>
                )}
                {workspaceRoute && workspaceLabel ? (
                  <div className="future-module">
                    <strong>{workspaceLabel}</strong>
                    <p>Uzman çalışma alanı için güvenli proje yönlendirmesi hazır.</p>
                    <Link
                      className="secondary-button workspace-link"
                      href={`/workspaces/${workspaceRoute}/${selectedProject.id}`}
                    >
                      {workspaceLabel}
                    </Link>
                  </div>
                ) : null}
              </section>
            ) : null}
            {activeTab === 'checklist' ? (
              <section className="drawer-section" id="project-checklist" tabIndex={-1}>
                <div className="checklist-heading">
                  <div>
                    <h3>Kontrol Listesi</h3>
                    <p>
                      {checklist.filter((item) => item.isCompleted).length} / {checklist.length}{' '}
                      tamamlandı
                    </p>
                  </div>
                </div>
                {Array.from(new Set(checklist.map((item) => item.stageCode))).map((stageCode) => (
                  <div className="checklist-group" key={stageCode}>
                    <h4>{stageName(stageCode)}</h4>
                    {checklist
                      .filter((item) => item.stageCode === stageCode)
                      .map((item) => (
                        <label
                          className={`checklist-row ${item.isCompleted ? 'completed' : ''}`}
                          key={item.id}
                        >
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            disabled={isSaving}
                            onChange={() => void handleChecklistToggle(item)}
                          />
                          <span>
                            <strong>{item.title}</strong>
                            <small>
                              {item.isRequired ? 'Zorunlu' : 'Opsiyonel'}
                              {item.completedAt ? ` · ${formatDate(item.completedAt)}` : ''}
                              {item.completedBy ? ` · ${item.completedBy.fullName}` : ''}
                            </small>
                          </span>
                        </label>
                      ))}
                  </div>
                ))}
                {checklist.length === 0 ? (
                  <p className="drawer-empty">Bu iş için henüz kontrol listesi oluşturulmadı.</p>
                ) : null}
              </section>
            ) : null}
            {activeTab === 'operation' ? (
              <section className="drawer-section operation-section">
                <div className="section-toolbar">
                  <span>Operasyon planı ve aşama yönetimi</span>
                  {operation && !isOperationEditing ? (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => setIsOperationEditing(true)}
                    >
                      Düzenle
                    </button>
                  ) : null}
                </div>
                {operation && !isOperationEditing ? (
                  <OperationReadinessPanel
                    key={selectedProject.id}
                    projectId={selectedProject.id}
                    onCorrect={handleReadinessCorrection}
                  />
                ) : null}
                {operation && activeTab === 'operation' && hrManager(currentUser?.roles ?? []) ? (
                  <ProjectLaborSummary projectId={selectedProject.id} />
                ) : null}
                {operation ? (
                  <>
                    <div className="operation-stage-header">
                      <div>
                        <span>Mevcut Aşama</span>
                        <strong>{operationStages[operationStageIndex]?.label}</strong>
                      </div>
                      <div>
                        <span>Tamamlanma</span>
                        <strong>%{operation.completionPercent}</strong>
                      </div>
                    </div>
                    <div className="operation-progress" aria-label="Operasyon aşama ilerlemesi">
                      {operationStages.map((stage, index) => (
                        <div
                          className={`${index < operationStageIndex ? 'done' : ''} ${index === operationStageIndex ? 'current' : ''}`}
                          key={stage.code}
                        >
                          <i />
                          <span>{stage.label}</span>
                        </div>
                      ))}
                    </div>
                    {isOperationEditing ? (
                      <form
                        className="drawer-edit-form operation-form"
                        onSubmit={handleOperationUpdate}
                        onChange={() => setHasUnsavedChanges(true)}
                      >
                        <label className="form-wide">
                          Operasyon Sorumlusu
                          <select
                            name="operationManagerId"
                            defaultValue={operation.operationManager?.id ?? ''}
                          >
                            <option value="">Atanmadı</option>
                            {options.owners.map((owner) => (
                              <option value={owner.id} key={owner.id}>
                                {owner.fullName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Planlanan Başlangıç
                          <input
                            name="plannedStartAt"
                            type="date"
                            defaultValue={operation.plannedStartAt?.slice(0, 10) ?? ''}
                          />
                        </label>
                        <label>
                          Planlanan Bitiş
                          <input
                            name="plannedEndAt"
                            type="date"
                            defaultValue={operation.plannedEndAt?.slice(0, 10) ?? ''}
                          />
                        </label>
                        <label>
                          Gerçek Başlangıç
                          <input
                            name="actualStartAt"
                            type="date"
                            defaultValue={operation.actualStartAt?.slice(0, 10) ?? ''}
                          />
                        </label>
                        <label>
                          Gerçek Bitiş
                          <input
                            name="actualEndAt"
                            type="date"
                            defaultValue={operation.actualEndAt?.slice(0, 10) ?? ''}
                          />
                        </label>
                        <label>
                          Tamamlanma Yüzdesi
                          <input
                            name="completionPercent"
                            type="number"
                            min="0"
                            max="100"
                            defaultValue={operation.completionPercent}
                          />
                        </label>
                        <label>
                          Sonraki Aksiyon Tarihi
                          <input
                            name="nextActionDueAt"
                            type="date"
                            defaultValue={operation.nextActionDueAt?.slice(0, 10) ?? ''}
                          />
                        </label>
                        <label className="form-wide">
                          Sonraki Aksiyon
                          <input name="nextAction" defaultValue={operation.nextAction ?? ''} />
                        </label>
                        <label className="form-wide">
                          Notlar
                          <textarea name="notes" rows={4} defaultValue={operation.notes ?? ''} />
                        </label>
                        <div className="form-actions form-wide">
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={cancelEditing}
                          >
                            Vazgeç
                          </button>
                          <button className="primary-button" type="submit" disabled={isSaving}>
                            Kaydet
                          </button>
                        </div>
                      </form>
                    ) : (
                      <dl className="detail-grid operation-details">
                        <div>
                          <dt>Operasyon sorumlusu</dt>
                          <dd>{operation.operationManager?.fullName ?? '—'}</dd>
                        </div>
                        <div>
                          <dt>Planlanan dönem</dt>
                          <dd>
                            {operation.plannedStartAt ? formatDate(operation.plannedStartAt) : '—'}{' '}
                            / {operation.plannedEndAt ? formatDate(operation.plannedEndAt) : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt>Gerçek dönem</dt>
                          <dd>
                            {operation.actualStartAt ? formatDate(operation.actualStartAt) : '—'} /{' '}
                            {operation.actualEndAt ? formatDate(operation.actualEndAt) : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt>Sonraki aksiyon tarihi</dt>
                          <dd>
                            {operation.nextActionDueAt
                              ? formatDate(operation.nextActionDueAt)
                              : '—'}
                          </dd>
                        </div>
                        <div className="detail-wide">
                          <dt>Sonraki aksiyon</dt>
                          <dd>{operation.nextAction ?? '—'}</dd>
                        </div>
                        <div className="detail-wide">
                          <dt>Notlar</dt>
                          <dd>{operation.notes ?? '—'}</dd>
                        </div>
                      </dl>
                    )}
                    <div className="operation-movement">
                      <button
                        className="primary-button"
                        type="button"
                        disabled={isSaving || operationStageIndex >= operationStages.length - 1}
                        onClick={() => void handleOperationAdvance()}
                      >
                        Sonraki Operasyon Aşaması
                      </button>
                      <form
                        onSubmit={handleOperationRevert}
                        onChange={() => setHasUnsavedChanges(true)}
                      >
                        <input
                          name="reason"
                          required
                          maxLength={1000}
                          disabled={operationStageIndex <= 0}
                          placeholder="Geri alma nedeni *"
                        />
                        <button
                          className="secondary-button"
                          type="submit"
                          disabled={isSaving || operationStageIndex <= 0}
                        >
                          Bir Aşama Geri Al
                        </button>
                      </form>
                    </div>
                    <div className="operation-history">
                      <h4>Operasyon Aşama Geçmişi</h4>
                      {operationEvents.map((event) => (
                        <article key={event.id}>
                          <time>{formatDateTime(event.occurredAt)}</time>
                          <strong>{event.summary}</strong>
                          {event.details ? <p>{event.details}</p> : null}
                        </article>
                      ))}
                      {operationEvents.length === 0 ? (
                        <p className="drawer-empty">Henüz operasyon hareketi bulunmuyor.</p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="drawer-empty">
                    Operasyon kaydı henüz oluşturulmadı. Kazanılmış işler için güvenli
                    initialization scriptini çalıştırın.
                  </p>
                )}
                {operation ? (
                  <ProcurementPanel
                    projectId={selectedProject.id}
                    onChanged={() => {
                      void loadTimeline(selectedProject.id);
                      void fetchProject(selectedProject.id).then((updated) => {
                        setSelectedDetail(updated);
                        setProjects((current) =>
                          current.map((item) => (item.id === updated.id ? updated : item)),
                        );
                      });
                    }}
                  />
                ) : null}
              </section>
            ) : null}
            <section className="drawer-section workflow-actions">
              <h3>Aksiyonlar</h3>
              <form className="stage-form" onSubmit={handleStageChange}>
                <select
                  name="stageCode"
                  value={selectedStageCode}
                  onChange={(event) => setSelectedStageCode(event.target.value)}
                  disabled={!stageChoices.length}
                >
                  <option value="">Aşamayı Değiştir</option>
                  {stageChoices.map((code) => (
                    <option value={code} key={code}>
                      {stageName(code)}
                      {backwardStages[selectedProject.stage.code] === code ? ' · Geri Al' : ''}
                    </option>
                  ))}
                </select>
                {isBackwardSelection ? (
                  <input
                    className="stage-reason"
                    name="reason"
                    required
                    maxLength={1000}
                    placeholder="Geri alma gerekçesi *"
                  />
                ) : null}
                <button
                  className="primary-button compact-button"
                  type="submit"
                  disabled={isSaving || !selectedStageCode}
                >
                  Kaydet
                </button>
              </form>
              <div className="action-row">
                <button className="secondary-button" type="button" onClick={toggleTaskComposer}>
                  + Görev Ekle
                </button>
                <button className="secondary-button" type="button" onClick={toggleNoteComposer}>
                  Aktivite Ekle
                </button>
              </div>
              {isNoteOpen ? (
                <form
                  className="inline-composer"
                  onSubmit={handleAddNote}
                  onChange={() => setHasUnsavedChanges(true)}
                >
                  <label>
                    Aktivite / Not
                    <textarea
                      name="note"
                      required
                      maxLength={5000}
                      rows={3}
                      placeholder="Müşteri ile telefon görüşmesi yapıldı."
                    />
                  </label>
                  <button className="primary-button" type="submit" disabled={isSaving}>
                    Notu Kaydet
                  </button>
                </form>
              ) : null}
              {isTaskOpen ? (
                <form
                  className="inline-composer task-composer"
                  onSubmit={handleCreateTask}
                  onChange={() => setHasUnsavedChanges(true)}
                >
                  <label className="composer-wide">
                    Başlık
                    <input name="title" required maxLength={200} />
                  </label>
                  <label>
                    Sorumlu
                    <select name="assigneeId" defaultValue="">
                      <option value="">Ben</option>
                      {options.owners.map((owner) => (
                        <option value={owner.id} key={owner.id}>
                          {owner.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Termin
                    <input name="dueDate" type="date" />
                  </label>
                  <label>
                    Öncelik
                    <select name="priority" defaultValue="MEDIUM">
                      {Object.entries(taskPriorityLabels).map(([value, label]) => (
                        <option value={value} key={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="primary-button" type="submit" disabled={isSaving}>
                    Görevi Kaydet
                  </button>
                </form>
              ) : null}
            </section>
            {selectedProject.stage.code === 'KAZANILDI' ? (
              <section className="drawer-section readiness-panel">
                <h3>Proje Operasyonuna Hazırlık</h3>
                <p>
                  <strong>
                    {readinessItems.filter(([, ready]) => ready).length} / {readinessItems.length}
                  </strong>{' '}
                  hazır
                </p>
                <ul>
                  {readinessItems.map(([label, ready]) => (
                    <li className={ready ? 'ready' : ''} key={label}>
                      <span>{ready ? '✓' : '○'}</span>
                      {label}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className="drawer-section">
              <h3>Özet</h3>
              <div className="summary-grid">
                <div>
                  <strong>
                    {selectedProject.tasks.filter((task) => task.status !== 'DONE').length}
                  </strong>
                  <span>Açık görev</span>
                </div>
                <div>
                  <strong>{timeline[0] ? formatDateTime(timeline[0].occurredAt) : '—'}</strong>
                  <span>Son aktivite</span>
                </div>
                <div>
                  <strong>{formatDate(selectedProject.createdAt)}</strong>
                  <span>Oluşturulma</span>
                </div>
                <div>
                  <strong>{formatDate(selectedProject.updatedAt)}</strong>
                  <span>Güncellenme</span>
                </div>
              </div>
            </section>
            <section className={`drawer-section ${activeTab === 'tasks' ? '' : 'tab-hidden'}`}>
              <h3>Görevler</h3>
              <div className="task-tab-summary">
                <span>
                  Aktif: {selectedProject.tasks.filter((task) => task.status !== 'DONE').length}
                </span>
                <span>
                  Tamamlanan:{' '}
                  {selectedProject.tasks.filter((task) => task.status === 'DONE').length}
                </span>
              </div>
              <div className="drawer-list">
                {selectedProject.tasks.map((task) =>
                  editingTaskId === task.id ? (
                    <form
                      className="task-edit-row"
                      key={task.id}
                      onSubmit={(event) => void handleTaskEdit(event, task.id)}
                      onChange={() => setHasUnsavedChanges(true)}
                    >
                      <input name="title" required defaultValue={task.title} />
                      <select name="assigneeId" defaultValue={task.assignee?.id ?? ''}>
                        <option value="">Sorumlu yok</option>
                        {options.owners.map((owner) => (
                          <option value={owner.id} key={owner.id}>
                            {owner.fullName}
                          </option>
                        ))}
                      </select>
                      <input
                        name="dueDate"
                        type="date"
                        defaultValue={task.dueDate?.slice(0, 10) ?? ''}
                      />
                      <select name="priority" defaultValue={task.priority}>
                        {Object.entries(taskPriorityLabels).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <select name="status" defaultValue={task.status}>
                        <option value="TODO">Yapılacak</option>
                        <option value="IN_PROGRESS">Devam Ediyor</option>
                        <option value="BLOCKED">Bloke</option>
                        <option value="DONE">Tamamlandı</option>
                      </select>
                      <div className="task-actions">
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => {
                            setEditingTaskId(null);
                            setHasUnsavedChanges(false);
                          }}
                        >
                          Vazgeç
                        </button>
                        <button className="primary-button" type="submit" disabled={isSaving}>
                          Kaydet
                        </button>
                      </div>
                    </form>
                  ) : (
                    <article
                      className={`task-row ${task.status === 'DONE' ? 'task-completed' : ''} ${task.status !== 'DONE' && task.dueDate && new Date(task.dueDate).getTime() < Date.now() ? 'task-overdue' : ''}`}
                      key={task.id}
                    >
                      <div>
                        <strong>{task.title}</strong>
                        <p>
                          {task.assignee?.fullName ?? 'Sorumlu yok'}
                          {task.dueDate ? ` · ${formatDate(task.dueDate)}` : ''}
                          {task.status === 'DONE' ? ' · Tamamlandı' : ''}
                        </p>
                      </div>
                      <div className="task-row-actions">
                        <span className={`priority priority-${task.priority.toLowerCase()}`}>
                          {taskPriorityLabels[task.priority]}
                        </span>
                        <button type="button" onClick={() => setEditingTaskId(task.id)}>
                          Düzenle
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            void handleTaskStatus(task.id, task.status === 'DONE' ? 'TODO' : 'DONE')
                          }
                        >
                          {task.status === 'DONE' ? 'Yeniden Aç' : 'Tamamla'}
                        </button>
                      </div>
                    </article>
                  ),
                )}
                {selectedProject.tasks.length === 0 ? (
                  <p className="drawer-empty">Açık görev bulunmuyor.</p>
                ) : null}
              </div>
            </section>
            <section className={`drawer-section ${activeTab === 'activity' ? '' : 'tab-hidden'}`}>
              <h3>Aktivite Geçmişi</h3>
              <div className="timeline-list">
                {timeline.map((event) => (
                  <article className="timeline-item" key={event.id}>
                    <time>{formatDateTime(event.occurredAt)}</time>
                    <strong>{event.summary}</strong>
                    {event.details ? (
                      <p>
                        {event.eventType === 'NOTE_ADDED' ? `“${event.details}”` : event.details}
                      </p>
                    ) : null}
                    {event.actor ? <span>{event.actor.fullName}</span> : null}
                  </article>
                ))}
                {!timelineLoading && timeline.length === 0 ? (
                  <p className="drawer-empty">Bu iş için henüz aktivite bulunmuyor.</p>
                ) : null}
                {timelineLoading ? <p className="drawer-empty">Aktiviteler yükleniyor…</p> : null}
              </div>
            </section>
            {activeTab === 'files' ? (
              <section className="drawer-section">
                <h3>Dosyalar</h3>
                <p className="muted">
                  Doküman hazırlık kontrol listesi. Dosya yükleme sonraki pakette
                  etkinleştirilecektir.
                </p>
                <ul className="document-checklist">
                  {[
                    'Keşif / Saha Dokümanı',
                    'Teknik Çözüm',
                    'Maliyet Çalışması',
                    'Teklif',
                    'Sipariş / PO',
                    'Sözleşme',
                    'Test / SAT',
                    'Teslim Tutanağı',
                    'Diğer',
                  ].map((item) => (
                    <li key={item}>
                      <span />
                      {item}
                      <small>Hazırlanacak</small>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        </div>
      ) : null}

      {isNewWorkOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setIsNewWorkOpen(false)}
        >
          <section
            className="work-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-work-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Yeni kayıt</p>
                <h2 id="new-work-title">Yeni İş / Talep</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Kapat"
                onClick={() => setIsNewWorkOpen(false)}
              >
                ×
              </button>
            </div>
            <form className="work-form" onSubmit={handleCreateWork}>
              <label className="form-wide">
                İş / Talep Adı *<input name="name" required maxLength={200} autoFocus />
              </label>
              <label className="form-wide">
                Müşteri
                <span className="entity-select-row">
                  <select
                    name="customerId"
                    value={newCustomerId}
                    onChange={(event) => setNewCustomerId(event.target.value)}
                  >
                    <option value="">Müşteri seçilmedi</option>
                    {options.customers.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setQuickCustomerContext('new')}
                  >
                    + Yeni Müşteri
                  </button>
                </span>
              </label>
              <label>
                Kaynak
                <select name="source" defaultValue="">
                  <option value="">Seçilmedi</option>
                  {['Telefon', 'E-posta', 'WhatsApp', 'İhale', 'Referans', 'Diğer'].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Sorumlu
                <select name="ownerId" defaultValue="">
                  <option value="">Ben</option>
                  {options.owners.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Öncelik
                <select name="priority" defaultValue="NORMAL">
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tahmini Bedel
                <input name="estimatedValue" type="number" min="0" step="0.01" />
              </label>
              <label>
                Para Birimi
                <select name="currency" defaultValue="TRY">
                  <option>TRY</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </label>
              <label className="form-wide">
                Hedef / Termin Tarihi
                <input name="dueDate" type="date" />
              </label>
              <label className="form-wide">
                Açıklama
                <textarea name="description" rows={4} maxLength={5000} />
              </label>
              <div className="form-actions form-wide">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setIsNewWorkOpen(false)}
                >
                  Vazgeç
                </button>
                <button className="primary-button" type="submit" disabled={isSaving}>
                  {isSaving ? 'Kaydediliyor…' : 'İşi Kaydet'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      {quickCustomerContext ? (
        <BusinessEntityModal
          type="customer"
          onClose={() => setQuickCustomerContext(null)}
          onSaved={(entity) => {
            setOptions((current) => ({
              ...current,
              customers: [
                ...current.customers.filter((item) => item.id !== entity.id),
                { id: entity.id, name: entity.name },
              ].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
            }));
            if (quickCustomerContext === 'edit') setEditCustomerId(entity.id);
            else setNewCustomerId(entity.id);
            setQuickCustomerContext(null);
          }}
        />
      ) : null}
    </section>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<p>İşler yükleniyor…</p>}>
      <ProjectsWorkspace />
    </Suspense>
  );
}
