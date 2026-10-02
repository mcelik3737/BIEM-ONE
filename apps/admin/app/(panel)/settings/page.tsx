'use client';
import { useUser } from '../../../components/app-shell';
export default function Page() {
  const user = useUser();
  const roles: Record<string, string> = {
    SUPER_ADMIN: 'Sistem yöneticisi',
    COMPANY_ADMIN: 'Şirket yöneticisi',
    PROJECT_MANAGER: 'Proje yöneticisi',
    FIELD_ENGINEER: 'Saha mühendisi',
  };
  return (
    <>
      <header className="page-heading">
        <p className="eyebrow">HESAP</p>
        <h1>Çalışma alanı</h1>
      </header>
      <section className="panel-card">
        <h2>{user?.fullName}</h2>
        <p>{user?.email}</p>
        <p className="muted">Yetkiler: {user?.roles.map((r) => roles[r] || r).join(', ')}</p>
        <p className="small muted">
          Hesap ve yetki değişiklikleri şirket yöneticiniz tarafından yapılır.
        </p>
      </section>
      <section className="panel-card">
        <h2>Bu sürümde</h2>
        <p>
          Müşteri ve tedarikçi rehberi, iş dosyaları, operasyon, BOM, satınalma onayı ve teslimat
          takibi.
        </p>
        <h2>Geliştirme sırası</h2>
        <p className="muted">
          RF planlama, cihaz araştırma ekranı, İSG / SAT, finans ve DENİZ modülleri henüz bu
          arayüzde kullanıma açılmadı.
        </p>
      </section>
    </>
  );
}
