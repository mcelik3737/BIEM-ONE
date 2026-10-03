import Link from 'next/link';

export default function TasksPage() {
  return (
    <section className="stack">
      <div className="page-heading">
        <p className="eyebrow">Görevler</p>
        <h1>İşe bağlı görevler</h1>
        <p className="muted">
          Görev oluşturma ve durum güncelleme İş Dosyası içindedir. Tüm görevleri birleştiren pano
          henüz kullanıma açılmadı.
        </p>
      </div>
      <Link className="primary-button" href="/projects">
        İş Dosyalarına Git
      </Link>
    </section>
  );
}
