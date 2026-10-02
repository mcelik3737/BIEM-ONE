export interface User {
  id: string;
  fullName: string;
  email: string;
  companyId: string;
  roles: string[];
}
export interface Party {
  id: string;
  name: string;
  shortName?: string;
  contactName?: string;
  taxOffice?: string;
  taxNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
}
export interface Bom {
  estimatedCost: string;
  availableQuantity: string;
  id: string;
  name: string;
  partNumber?: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  currency: string;
  notes?: string;
  purchaseItems: { quantity: string; purchaseOrder: { status: string } }[];
}
export interface OrderItem {
  id: string;
  name: string;
  unit: string;
  quantity: string;
  receivedQuantity: string;
  unitPrice: string;
  taxRate: string;
  total: string;
}
export interface Order {
  id: string;
  number: string;
  supplier: Party;
  status: string;
  currency: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  items: OrderItem[];
  receipts: {
    id: string;
    createdAt: string;
    note?: string;
    items: { purchaseOrderItemId: string; quantity: string }[];
  }[];
}
export interface Timeline {
  id: string;
  summary: string;
  occurredAt: string;
  project?: { id: string; name: string };
}
export interface Project {
  id: string;
  name: string;
  code?: string;
  description?: string;
  location?: string;
  customer: Party;
  salesStatus: string;
  stage: { name: string };
  operation?: {
    id: string;
    status: string;
    bomTotals: Record<string, string>;
    bomItems: Bom[];
    purchaseOrders: Order[];
  };
  timelineEvents: Timeline[];
}
export const salesLabels: Record<string, string> = {
  REVIEW: 'Değerlendirme',
  SURVEY: 'Çözüm / keşif',
  QUOTED: 'Teklif verildi',
  DECISION: 'Karar bekleniyor',
  WON: 'Kazanıldı',
  LOST: 'Kaybedildi',
};
export const operationLabels: Record<string, string> = {
  PREPARATION: 'Hazırlık',
  PROCUREMENT: 'Satınalma',
  INSTALLATION: 'Kurulum',
  TEST: 'Test',
  ACCEPTANCE: 'Kabul',
  MAINTENANCE: 'Bakım',
  COMPLETED: 'Tamamlandı',
};
export const orderLabels: Record<string, string> = {
  DRAFT: 'Taslak',
  SUBMITTED: 'Onay bekliyor',
  APPROVED: 'Onaylandı',
  ORDERED: 'Sipariş verildi',
  PARTIALLY_RECEIVED: 'Kısmi teslim',
  RECEIVED: 'Teslim alındı',
  CANCELLED: 'İptal',
};
