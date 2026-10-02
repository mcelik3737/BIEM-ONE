import { WorkCategory } from '@prisma/client';

export interface ChecklistTemplateItem {
  key: string;
  title: string;
  stageCode: string;
  isRequired: boolean;
}

const discovery = (category: string, titles: string[]): ChecklistTemplateItem[] =>
  titles.map((title, index) => ({
    key: `${category.toLowerCase()}.cozum_kesif.${index + 1}`,
    title,
    stageCode: 'COZUM_KESIF',
    isRequired: index < 4,
  }));

export const workflowTemplates: Record<WorkCategory, ChecklistTemplateItem[]> = {
  EV_CHARGING: discovery('ev_charging', [
    'Güç bilgisi alındı',
    'Lokasyon keşfi yapıldı',
    'Şarj cihazı tipi belirlendi',
    'Kablo güzergahı belirlendi',
    'Pano ihtiyacı değerlendirildi',
    'Maliyet girdileri hazırlandı',
  ]),
  RF_COVERAGE_DAS: discovery('rf_coverage_das', [
    'Frekans bilgileri alındı',
    'Kapsama ihtiyacı tanımlandı',
    'Saha/RF keşfi yapıldı',
    'Ölçüm ihtiyacı değerlendirildi',
    'Sistem yaklaşımı belirlendi',
    'RF Planner çalışma ihtiyacı belirlendi',
  ]),
  RADIO_COMMUNICATION: discovery('radio_communication', [
    'Kullanıcı sayısı belirlendi',
    'Kanal/grup ihtiyacı belirlendi',
    'Sistem tipi belirlendi',
    'Kapsama alanı tanımlandı',
    'Röle ihtiyacı değerlendirildi',
    'Terminal tipi belirlendi',
  ]),
  SERVICE_MAINTENANCE: discovery('service_maintenance', [
    'Cihaz bilgisi kaydedildi',
    'Arıza açıklaması alındı',
    'Seri numarası kaydedildi',
    'Servis kabul durumu belirlendi',
    'Yedek parça ihtiyacı değerlendirildi',
    'Teslim hedefi belirlendi',
  ]),
  RAIL_SYSTEMS: discovery('rail_systems', [
    'Hat ve istasyon kapsamı tanımlandı',
    'Saha arayüzleri belirlendi',
    'İşletme gereksinimleri alındı',
    'Entegrasyon noktaları değerlendirildi',
    'Keşif ihtiyacı planlandı',
    'Teknik yaklaşım belirlendi',
  ]),
  EMERGENCY_COMMUNICATION: discovery('emergency_communication', [
    'Acil durum senaryosu tanımlandı',
    'Kullanıcı grupları belirlendi',
    'Kapsama alanı tanımlandı',
    'Yedeklilik ihtiyacı değerlendirildi',
    'Entegrasyon noktaları belirlendi',
    'Teknik yaklaşım belirlendi',
  ]),
  OTHER: discovery('other', [
    'İhtiyaç tanımlandı',
    'Lokasyon bilgisi alındı',
    'Teknik kapsam netleştirildi',
    'Maliyet girdileri hazırlandı',
  ]),
};
