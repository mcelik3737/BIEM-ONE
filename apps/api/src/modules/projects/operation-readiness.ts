import { WorkCategory } from '@prisma/client';
import { workflowTemplates } from './workflow-templates';

export type ReadinessTarget = 'MANAGER' | 'SCHEDULE' | 'NEXT_ACTION' | 'CATEGORY' | 'CHECKLIST';
export interface ReadinessCheck {
  code: string;
  label: string;
  status: 'COMPLETE' | 'MISSING' | 'NOT_IMPLEMENTED';
  description: string;
  target: ReadinessTarget | null;
  missingItems?: string[];
}
interface ReadinessInput {
  operationManager: { isActive: boolean; companyId: string } | null;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  nextAction: string | null;
  nextActionDueAt: Date | null;
  project: {
    category: WorkCategory | null;
    checklistItems: Array<{
      key: string;
      title: string;
      category: WorkCategory;
      stageCode: string;
      isRequired: boolean;
      isCompleted: boolean;
    }>;
  };
}

export function operationReadiness(operation: ReadinessInput, companyId: string) {
  const managerReady = Boolean(
    operation.operationManager?.isActive && operation.operationManager.companyId === companyId,
  );
  const datesReady = Boolean(
    operation.plannedStartAt &&
    operation.plannedEndAt &&
    operation.plannedEndAt >= operation.plannedStartAt,
  );
  const actionReady = Boolean(operation.nextAction?.trim() && operation.nextActionDueAt);
  const { category, checklistItems } = operation.project;
  const currentItems = checklistItems.filter(
    (item) => item.category === category && item.stageCode === 'COZUM_KESIF',
  );
  const requiredTemplate = category
    ? workflowTemplates[category].filter((item) => item.isRequired)
    : [];
  // Missing template rows must not turn a partial/empty checklist into a success.
  const missing = new Map<string, string>();
  for (const item of requiredTemplate) {
    if (!currentItems.some((stored) => stored.key === item.key && stored.isCompleted)) {
      missing.set(item.key, item.title);
    }
  }
  for (const item of currentItems) {
    if (item.isRequired && !item.isCompleted) missing.set(item.key, item.title);
  }
  const checklistReady = Boolean(category && currentItems.length && missing.size === 0);
  const checks: ReadinessCheck[] = [
    {
      code: 'OPERATION_MANAGER',
      label: 'Operasyon sorumlusu',
      status: managerReady ? 'COMPLETE' : 'MISSING',
      description: managerReady
        ? 'Aktif bir operasyon sorumlusu atanmış.'
        : 'Bu şirketten aktif bir operasyon sorumlusu seçin.',
      target: 'MANAGER',
    },
    {
      code: 'PLANNED_DATES',
      label: 'İş programı tarihleri',
      status: datesReady ? 'COMPLETE' : 'MISSING',
      description: datesReady
        ? 'Planlanan başlangıç ve bitiş tarihleri tanımlı.'
        : operation.plannedStartAt && operation.plannedEndAt
          ? 'Planlanan bitiş, başlangıçtan önce olamaz.'
          : 'Planlanan başlangıç ve bitiş tarihlerini girin.',
      target: 'SCHEDULE',
    },
    {
      code: 'NEXT_ACTION',
      label: 'Sonraki aksiyon',
      status: actionReady ? 'COMPLETE' : 'MISSING',
      description: actionReady
        ? 'Sonraki aksiyon ve hedef tarihi tanımlı.'
        : 'Sonraki aksiyonu ve hedef tarihini girin.',
      target: 'NEXT_ACTION',
    },
    {
      code: 'DISCOVERY_CHECKLIST',
      label: 'Zorunlu keşif maddeleri',
      status: checklistReady ? 'COMPLETE' : 'MISSING',
      description: !category
        ? 'Kontrol listesi tanımlanmamış. Önce iş kategorisini seçin.'
        : !currentItems.length
          ? 'Kontrol listesi tanımlanmamış. Kontrol Listesi bölümünü açın.'
          : missing.size
            ? `${missing.size} zorunlu keşif maddesi eksik.`
            : 'Zorunlu keşif maddeleri tamamlanmış.',
      target: category ? 'CHECKLIST' : 'CATEGORY',
      missingItems: [...missing.values()],
    },
    {
      code: 'PROJECT_TEAM_SAFETY',
      label: 'Ekip ve İSG uygunluğu',
      status: 'NOT_IMPLEMENTED',
      description:
        'Proje ekibi, saha tarihleri ve İSG belgeleri birlikte henüz denetlenmiyor. Saha öncesi ayrıca değerlendirilmelidir.',
      target: null,
    },
    {
      code: 'ACCEPTANCE_EVIDENCE',
      label: 'Test ve kabul kanıtları',
      status: 'NOT_IMPLEMENTED',
      description:
        'Ölçüm sonuçları ve kabul belgeleri bu listede henüz denetlenmiyor. Teslim öncesi ayrıca değerlendirilmelidir.',
      target: null,
    },
  ];
  return {
    policyVersion: 'readiness-v1' as const,
    evaluatedAt: new Date().toISOString(),
    advisoryOnly: true as const,
    checks,
  };
}
