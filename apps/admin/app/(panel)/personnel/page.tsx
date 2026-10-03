'use client';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCurrentUser, SessionExpiredError } from '../../../lib/auth-client';
import {
  Compensation,
  Person,
  PersonDetail,
  PersonnelDocument,
  PersonnelOptions,
  TimeEntry,
  LaborCosts,
  hrManager,
  personnelRequest as api,
  formatMoney,
  dateOnly,
  dateLabel,
  documentLabels,
  timeLabels,
  kindLabels,
  downloadPersonnelDocument,
} from '../../../lib/personnel-client';

const currentDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const val = (f: FormData, key: string) => String(f.get(key) || '').trim();
const nullable = (f: FormData, key: string) => val(f, key) || null;
type Tab = 'profile' | 'pay' | 'documents' | 'time';

export default function PersonnelPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [options, setOptions] = useState<PersonnelOptions>({ users: [], projects: [] });
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [times, setTimes] = useState<TimeEntry[]>([]);
  const [costs, setCosts] = useState<LaborCosts | null>(null);
  const [month, setMonth] = useState(currentDate().slice(0, 7));
  const [tab, setTab] = useState<Tab>('profile');
  const [view, setView] = useState<'people' | 'costs'>('people');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [profileForm, setProfileForm] = useState<PersonDetail | null | undefined>();
  const [documentForm, setDocumentForm] = useState<PersonnelDocument | null | undefined>();
  const [timeKind, setTimeKind] = useState('PROJECT');
  const [voidEntry, setVoidEntry] = useState('');
  function fail(error: unknown) {
    if (error instanceof SessionExpiredError) router.replace('/login');
    else setError(error instanceof Error ? error.message : 'İşlem tamamlanamadı.');
  }
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCurrentUser()
      .then(async (user) => {
        const canUse = hrManager(user.roles);
        if (active) setAllowed(canUse);
        if (!canUse) return;
        const [list, choices, totals] = await Promise.all([
          api<Person[]>(''),
          api<PersonnelOptions>('/options'),
          api<LaborCosts>(`/costs?month=${month}`),
        ]);
        if (active) {
          setPeople(list);
          setOptions(choices);
          setCosts(totals);
        }
      })
      .catch((e) => {
        if (active) {
          if (e instanceof SessionExpiredError) router.replace('/login');
          else setError(e.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month, refresh, router]);
  useEffect(() => {
    let active = true;
    setDetail(null);
    setTimes([]);
    if (selected && allowed)
      Promise.all([
        api<PersonDetail>(`/${selected}`),
        api<TimeEntry[]>(`/${selected}/time-entries?month=${month}`),
      ])
        .then(([person, records]) => {
          if (active) {
            setDetail(person);
            setTimes(records);
          }
        })
        .catch((e) => {
          if (active) {
            if (e instanceof SessionExpiredError) router.replace('/login');
            else setError(e.message);
          }
        });
    return () => {
      active = false;
    };
  }, [selected, month, refresh, allowed, router]);
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      setRefresh((v) => v + 1);
      return true;
    } catch (e) {
      fail(e);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = {
      fullName: val(data, 'fullName'),
      jobTitle: val(data, 'jobTitle'),
      jobDescription: nullable(data, 'jobDescription'),
      department: nullable(data, 'department'),
      email: nullable(data, 'email'),
      phone: nullable(data, 'phone'),
      userId: nullable(data, 'userId'),
      startDate: val(data, 'startDate'),
      endDate: nullable(data, 'endDate'),
      isActive: data.has('isActive'),
    };
    await run(async () => {
      const person = await api<Person>(
        profileForm ? `/${profileForm.id}` : '',
        profileForm ? 'PATCH' : 'POST',
        input,
      );
      setSelected(person.id);
      setProfileForm(undefined);
      setTab('profile');
    }, 'Personel dosyası kaydedildi.');
  }
  async function savePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    if (
      await run(
        () =>
          api(
            `/${selected}/compensations`,
            'POST',
            Object.fromEntries(
              [
                'effectiveFrom',
                'salaryBasis',
                'monthlySalary',
                'monthlyEmployerCost',
                'monthlyHours',
                'currency',
              ].map((k) => [k, val(data, k)]),
            ),
          ),
        'Ücret dönemi eklendi. Önceki onaylı maliyetler korundu.',
      )
    )
      form.reset();
  }
  async function saveDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (
      await run(
        () =>
          api(
            `/${selected}/documents${documentForm ? `/${documentForm.id}` : ''}`,
            documentForm ? 'PATCH' : 'POST',
            {
              title: val(data, 'title'),
              isRequired: data.has('isRequired'),
              expiryRequired: data.has('expiryRequired'),
              issuedAt: nullable(data, 'issuedAt'),
              expiresAt: nullable(data, 'expiresAt'),
              notes: nullable(data, 'notes'),
            },
          ),
        'Belge gerekliliği kaydedildi.',
      )
    )
      setDocumentForm(undefined);
  }
  async function saveTime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    if (
      await run(
        () =>
          api(`/${selected}/time-entries`, 'POST', {
            workDate: val(data, 'workDate'),
            kind: timeKind,
            projectId: timeKind === 'PROJECT' ? nullable(data, 'projectId') : null,
            hours: val(data, 'hours'),
            costMultiplier: val(data, 'costMultiplier'),
            description: val(data, 'description'),
          }),
        'Puantaj kaydı eklendi; maliyete katılması için onaylayın.',
      )
    )
      form.reset();
  }
  const shown = people.filter(
    (p) =>
      `${p.fullName} ${p.jobTitle} ${p.department || ''}`
        .toLocaleLowerCase('tr-TR')
        .includes(search.toLocaleLowerCase('tr-TR')) &&
      (filter === 'all' ||
        (filter === 'active' && p.isActive) ||
        (filter === 'issues' &&
          p.isActive &&
          (p.missingDocuments > 0 || p.expiringDocuments > 0 || p.requiredDocuments === 0))),
  );
  if (allowed === false)
    return (
      <section className="panel-card">
        <h1>Personel / İK</h1>
        <p>Personel, ücret ve belge kayıtlarına yalnız şirket yöneticileri erişebilir.</p>
      </section>
    );
  return (
    <section className="stack hr-page">
      <div className="task-board-heading">
        <div>
          <p className="eyebrow">İdari işler ve insan kaynakları</p>
          <h1>Personel / İK</h1>
          <p className="muted">Özlük, görev tanımı, ücret, İSG belgeleri ve puantaj tek dosyada.</p>
        </div>
        <button
          className="primary-button"
          disabled={busy || loading || !allowed}
          onClick={() => {
            setProfileForm(null);
            setView('people');
          }}
        >
          + Yeni Personel
        </button>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}{' '}
          <button
            onClick={() => {
              setError('');
              setRefresh((v) => v + 1);
            }}
          >
            Yenile
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="form-success">
          {message}
        </p>
      )}
      <nav className="hr-tabs" aria-label="Personel bölümleri">
        <button aria-pressed={view === 'people'} onClick={() => setView('people')}>
          Personel dosyaları
        </button>
        <button aria-pressed={view === 'costs'} onClick={() => setView('costs')}>
          İşçilik maliyetleri
        </button>
      </nav>
      {loading && <p role="status">Personel kayıtları yükleniyor…</p>}
      {view === 'costs' ? (
        <section className="panel-card stack">
          <h2>Onaylı işçilik maliyetleri</h2>
          <label className="hr-field">
            Maliyet dönemi
            <input
              type="month"
              value={month}
              required
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
          </label>
          <p>
            Aylık işveren maliyeti ÷ aylık maliyet kapasitesi × çalışma saati × maliyet katsayısı.
          </p>
          <p className="muted">
            Yalnız onaylı puantaj kayıtları dahil edilir. İdari çalışma ve izin ayrı gösterilir;
            farklı para birimleri birleştirilmez.
          </p>
          {costs && (
            <>
              <p>{costs.pendingCount} puantaj kaydı onay bekliyor.</p>
              <div className="hr-total-row">
                {Object.entries(costs.totals).map(([currency, total]) => (
                  <strong key={currency}>{formatMoney(total, currency)}</strong>
                ))}
              </div>
              {costs.rows.length ? (
                <div className="hr-table-wrap">
                  <table className="hr-table">
                    <thead>
                      <tr>
                        <th>İş / tür</th>
                        <th>Saat</th>
                        <th>Maliyet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costs.rows.map((row) => (
                        <tr key={`${row.projectId || row.label}-${row.currency}`}>
                          <td>
                            {row.projectId ? (
                              <Link href={`/projects?project=${row.projectId}&tab=operation`}>
                                {row.label}
                              </Link>
                            ) : (
                              row.label
                            )}
                          </td>
                          <td>{row.hours}</td>
                          <td>{formatMoney(row.cost, row.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>Bu dönemde onaylı işçilik maliyeti yok.</p>
              )}
            </>
          )}
        </section>
      ) : (
        <>
          {profileForm !== undefined && (
            <form
              className="panel-card"
              onSubmit={saveProfile}
              key={profileForm?.id || 'new-person'}
              aria-label="Personel formu"
            >
              <h2>{profileForm ? 'Personeli düzenle' : 'Yeni personel'}</h2>
              <fieldset disabled={busy} className="hr-form">
                <label>
                  Ad soyad
                  <input
                    name="fullName"
                    required
                    minLength={2}
                    maxLength={160}
                    defaultValue={profileForm?.fullName}
                  />
                </label>
                <label>
                  Görev / unvan
                  <input
                    name="jobTitle"
                    required
                    minLength={2}
                    maxLength={160}
                    defaultValue={profileForm?.jobTitle}
                  />
                </label>
                <label>
                  Birim
                  <input
                    name="department"
                    maxLength={160}
                    defaultValue={profileForm?.department || ''}
                  />
                </label>
                <label>
                  Kullanıcı hesabı
                  <select name="userId" defaultValue={profileForm?.userId || ''}>
                    <option value="">Giriş hesabı bağlama</option>
                    {options.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} · {u.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  E-posta
                  <input name="email" type="email" defaultValue={profileForm?.email || ''} />
                </label>
                <label>
                  Telefon
                  <input name="phone" maxLength={40} defaultValue={profileForm?.phone || ''} />
                </label>
                <label>
                  İşe giriş
                  <input
                    name="startDate"
                    type="date"
                    required
                    defaultValue={dateOnly(profileForm?.startDate) || currentDate()}
                  />
                </label>
                <label>
                  İşten ayrılma
                  <input name="endDate" type="date" defaultValue={dateOnly(profileForm?.endDate)} />
                </label>
                <label className="hr-wide">
                  Görev tanımı
                  <textarea
                    name="jobDescription"
                    maxLength={4000}
                    rows={4}
                    defaultValue={profileForm?.jobDescription || ''}
                  />
                </label>
                <label className="hr-check">
                  <input
                    name="isActive"
                    type="checkbox"
                    defaultChecked={profileForm?.isActive ?? true}
                  />
                  Personel aktif
                </label>
                <div className="hr-wide form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setProfileForm(undefined)}
                  >
                    Vazgeç
                  </button>
                  <button className="primary-button">Personeli kaydet</button>
                </div>
              </fieldset>
            </form>
          )}
          <div className="hr-layout">
            <aside className="panel-card stack">
              <label className="hr-field">
                Personel ara
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ad, unvan veya birim"
                />
              </label>
              <label className="hr-field">
                Personel görünümü
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="active">Aktif personel</option>
                  <option value="issues">İSG takibi gerekenler</option>
                  <option value="all">Tüm personel</option>
                </select>
              </label>
              <div className="hr-person-list">
                {shown.map((p) => (
                  <button
                    key={p.id}
                    className="hr-person"
                    aria-pressed={selected === p.id}
                    onClick={() => {
                      setSelected(p.id);
                      setDocumentForm(undefined);
                      setVoidEntry('');
                    }}
                  >
                    <strong>{p.fullName}</strong>
                    <span>
                      {p.jobTitle}
                      {!p.isActive ? ' · Pasif' : ''}
                    </span>
                    <small>
                      {!p.requiredDocuments
                        ? 'İSG gerekliliği tanımlanmamış'
                        : `${p.missingDocuments} eksik / kontrol · ${p.expiringDocuments} yaklaşan`}
                    </small>
                  </button>
                ))}
                {!loading && !shown.length && <p>Bu görünümde personel yok.</p>}
              </div>
            </aside>
            <div className="hr-detail stack">
              {!selected ? (
                <div className="panel-card">
                  <h2>Personel dosyası</h2>
                  <p>Bir çalışan seçin veya yeni personel oluşturun.</p>
                </div>
              ) : !detail ? (
                <p role="status">Personel dosyası yükleniyor…</p>
              ) : (
                <>
                  <div className="panel-card">
                    <div className="task-board-heading">
                      <div>
                        <h2>{detail.fullName}</h2>
                        <p>
                          {detail.jobTitle} · {detail.department || 'Birim belirtilmedi'}
                        </p>
                      </div>
                      <span className="task-state">{detail.isActive ? 'Aktif' : 'Pasif'}</span>
                    </div>
                    <nav className="hr-tabs" aria-label="Personel dosyası sekmeleri">
                      {(
                        [
                          ['profile', 'Özlük ve görev'],
                          ['pay', 'Ücret ve maliyet'],
                          ['documents', 'İSG belgeleri'],
                          ['time', 'Puantaj'],
                        ] as const
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          aria-pressed={tab === key}
                          onClick={() => {
                            setTab(key);
                            setDocumentForm(undefined);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </nav>
                  </div>
                  {tab === 'profile' && (
                    <section className="panel-card stack">
                      <h3>Özlük ve görev tanımı</h3>
                      <dl className="hr-facts">
                        <div>
                          <dt>İşe giriş</dt>
                          <dd>{dateLabel(detail.startDate)}</dd>
                        </div>
                        <div>
                          <dt>İşten ayrılma</dt>
                          <dd>{dateLabel(detail.endDate)}</dd>
                        </div>
                        <div>
                          <dt>E-posta</dt>
                          <dd>{detail.email || '—'}</dd>
                        </div>
                        <div>
                          <dt>Telefon</dt>
                          <dd>{detail.phone || '—'}</dd>
                        </div>
                        <div>
                          <dt>Kullanıcı hesabı</dt>
                          <dd>
                            {options.users.find((u) => u.id === detail.userId)?.email ||
                              'Bağlı hesap yok'}
                          </dd>
                        </div>
                      </dl>
                      <p className="hr-description">
                        {detail.jobDescription || 'Görev tanımı henüz girilmedi.'}
                      </p>
                      <p className="muted">
                        Personel kartı giriş hesabından bağımsızdır. Kartı pasife almak kullanıcı
                        hesabını kapatmaz.
                      </p>
                      <button
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => setProfileForm(detail)}
                      >
                        Personeli düzenle
                      </button>
                    </section>
                  )}
                  {tab === 'pay' && (
                    <>
                      <form className="panel-card" onSubmit={savePay}>
                        <h3>Yeni ücret dönemi</h3>
                        <p className="muted">
                          İşveren maliyetine maaş, işveren payları ve yan hakları dahil edin. Netten
                          brüte veya vergi hesabı yapılmaz. Saat kapasitesi kurumunuzun maliyet
                          dağıtımı içindir.
                        </p>
                        <fieldset disabled={busy} className="hr-form">
                          <label>
                            Geçerlilik başlangıcı
                            <input
                              type="date"
                              name="effectiveFrom"
                              required
                              defaultValue={currentDate()}
                            />
                          </label>
                          <label>
                            Maaş türü
                            <select name="salaryBasis">
                              <option value="NET">Net</option>
                              <option value="GROSS">Brüt</option>
                            </select>
                          </label>
                          <label>
                            Aylık maaş
                            <input
                              name="monthlySalary"
                              type="number"
                              min="0"
                              step="0.01"
                              required
                            />
                          </label>
                          <label>
                            Toplam aylık işveren maliyeti
                            <input
                              name="monthlyEmployerCost"
                              type="number"
                              min="0"
                              step="0.01"
                              required
                            />
                          </label>
                          <label>
                            Aylık maliyet kapasitesi (saat)
                            <input
                              name="monthlyHours"
                              type="number"
                              min="0.01"
                              max="744"
                              step="0.01"
                              required
                            />
                          </label>
                          <label>
                            Para birimi
                            <select name="currency">
                              {['TRY', 'USD', 'EUR', 'GBP'].map((c) => (
                                <option key={c}>{c}</option>
                              ))}
                            </select>
                          </label>
                          <button className="primary-button hr-wide">Ücret dönemini kaydet</button>
                        </fieldset>
                      </form>
                      <section className="panel-card stack">
                        <h3>Ücret geçmişi</h3>
                        {detail.compensations.length ? (
                          detail.compensations.map((c: Compensation) => (
                            <article key={c.id} className="hr-row">
                              <strong>{dateLabel(c.effectiveFrom)} itibarıyla</strong>
                              <p>
                                {c.salaryBasis === 'NET' ? 'Net' : 'Brüt'} maaş:{' '}
                                {formatMoney(c.monthlySalary, c.currency)}
                              </p>
                              <p>
                                İşveren maliyeti: {formatMoney(c.monthlyEmployerCost, c.currency)} /
                                ay
                              </p>
                              <p>
                                {c.monthlyHours} saat kapasite ·{' '}
                                {formatMoney(c.hourlyCost, c.currency)} / saat
                              </p>
                            </article>
                          ))
                        ) : (
                          <p>Ücret dönemi yok; puantaj maliyeti onaylanamaz.</p>
                        )}
                      </section>
                    </>
                  )}
                  {tab === 'documents' && (
                    <section className="panel-card stack">
                      <div className="task-board-heading">
                        <h3>İSG belgeleri ve eksikler</h3>
                        <button
                          className="secondary-button"
                          disabled={busy}
                          onClick={() => setDocumentForm(null)}
                        >
                          + Belge gerekliliği
                        </button>
                      </div>
                      <p className="muted">
                        Gereken belgeleri görev ve saha için tanımlayın. Takip yalnız kayıtlı
                        gerekliliklere göre yapılır; süre uyarısı 30 gündür.
                      </p>
                      {documentForm !== undefined && (
                        <form
                          onSubmit={saveDocument}
                          key={documentForm?.id || 'new-document'}
                          aria-label="Belge gerekliliği formu"
                        >
                          <fieldset disabled={busy} className="hr-form">
                            <label className="hr-wide">
                              Belge adı
                              <input
                                name="title"
                                required
                                minLength={2}
                                maxLength={200}
                                defaultValue={documentForm?.title}
                              />
                            </label>
                            <label>
                              Düzenlenme tarihi
                              <input
                                name="issuedAt"
                                type="date"
                                defaultValue={dateOnly(documentForm?.issuedAt)}
                              />
                            </label>
                            <label>
                              Geçerlilik bitişi
                              <input
                                name="expiresAt"
                                type="date"
                                defaultValue={dateOnly(documentForm?.expiresAt)}
                              />
                            </label>
                            <label className="hr-check">
                              <input
                                name="isRequired"
                                type="checkbox"
                                defaultChecked={documentForm?.isRequired ?? true}
                              />
                              Zorunlu belge
                            </label>
                            <label className="hr-check">
                              <input
                                name="expiryRequired"
                                type="checkbox"
                                defaultChecked={documentForm?.expiryRequired ?? true}
                              />
                              Bitiş tarihi gerekli
                            </label>
                            <label className="hr-wide">
                              Belge notu
                              <textarea
                                name="notes"
                                rows={2}
                                maxLength={2000}
                                defaultValue={documentForm?.notes || ''}
                              />
                            </label>
                            <div className="form-actions hr-wide">
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={() => setDocumentForm(undefined)}
                              >
                                Vazgeç
                              </button>
                              <button className="primary-button">Gerekliliği kaydet</button>
                            </div>
                          </fieldset>
                        </form>
                      )}
                      {detail.documents.map((doc) => (
                        <article className="hr-document hr-row" key={doc.id} aria-label={doc.title}>
                          <div className="task-board-heading">
                            <h4>{doc.title}</h4>
                            <span className={`hr-status hr-status-${doc.status.toLowerCase()}`}>
                              {documentLabels[doc.status]}
                            </span>
                          </div>
                          <p>
                            {doc.isRequired ? 'Zorunlu' : 'İsteğe bağlı'} · Bitiş:{' '}
                            {dateLabel(doc.expiresAt)}
                            {doc.daysLeft !== null
                              ? ` · ${doc.daysLeft < 0 ? `${-doc.daysLeft} gün geçti` : `${doc.daysLeft} gün kaldı`}`
                              : ''}
                          </p>
                          {doc.notes && <p>{doc.notes}</p>}
                          <p>{doc.fileName || 'Dosya yüklenmedi.'}</p>
                          <div className="hr-actions">
                            <button
                              className="secondary-button"
                              disabled={busy}
                              onClick={() => setDocumentForm(doc)}
                            >
                              Belgeyi düzenle
                            </button>
                            {doc.hasFile && (
                              <button
                                className="secondary-button"
                                disabled={busy}
                                onClick={() =>
                                  void downloadPersonnelDocument(selected, doc).catch(fail)
                                }
                              >
                                Dosyayı indir
                              </button>
                            )}
                            {doc.status === 'PENDING_REVIEW' && (
                              <button
                                className="primary-button"
                                disabled={busy}
                                onClick={() =>
                                  void run(
                                    () =>
                                      api(`/${selected}/documents/${doc.id}/review`, 'POST', {}),
                                    'Belge kontrolü kaydedildi.',
                                  )
                                }
                              >
                                Kontrol edildi
                              </button>
                            )}
                          </div>
                          <label className="hr-field">
                            Belge dosyası (PDF / PNG / JPEG, en fazla 5 MB)
                            <input
                              type="file"
                              accept="application/pdf,image/png,image/jpeg"
                              disabled={busy}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const data = new FormData();
                                data.append('file', file);
                                void run(
                                  () => api(`/${selected}/documents/${doc.id}/file`, 'POST', data),
                                  'Belge yüklendi; kontrol onayı bekliyor.',
                                );
                              }}
                            />
                          </label>
                        </article>
                      ))}
                      {!detail.documents.length && <p>Henüz belge gerekliliği tanımlanmadı.</p>}
                    </section>
                  )}
                  {tab === 'time' && (
                    <>
                      <form className="panel-card" onSubmit={saveTime}>
                        <h3>Çalışma / izin kaydı</h3>
                        <fieldset disabled={busy || !detail.isActive} className="hr-form">
                          <label>
                            Çalışma tarihi
                            <input
                              type="date"
                              name="workDate"
                              required
                              defaultValue={currentDate()}
                            />
                          </label>
                          <label>
                            Kayıt türü
                            <select value={timeKind} onChange={(e) => setTimeKind(e.target.value)}>
                              {Object.entries(kindLabels).map(([key, label]) => (
                                <option value={key} key={key}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                          {timeKind === 'PROJECT' && (
                            <label className="hr-wide">
                              Bağlı iş
                              <select name="projectId" required>
                                <option value="">İş seçin</option>
                                {options.projects.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.workNumber} · {p.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          <label>
                            Çalışma süresi (saat)
                            <input
                              name="hours"
                              type="number"
                              min="0.01"
                              max="24"
                              step="0.01"
                              required
                            />
                          </label>
                          <label>
                            Maliyet katsayısı
                            <input
                              name="costMultiplier"
                              type="number"
                              min="0.01"
                              max="10"
                              step="0.01"
                              defaultValue="1"
                              required
                            />
                          </label>
                          <label className="hr-wide">
                            Yapılan iş / izin açıklaması
                            <textarea
                              name="description"
                              required
                              minLength={2}
                              maxLength={1000}
                              rows={2}
                            />
                          </label>
                          <button className="primary-button hr-wide">Puantajı kaydet</button>
                        </fieldset>
                        <p className="muted">
                          Katsayı maliyet dağıtımı içindir; yasal fazla mesai veya bordro hesabı
                          değildir. İzin saatleri, seçilen katsayıyla idari maliyette ayrı
                          gösterilir.
                        </p>
                      </form>
                      <section className="panel-card stack">
                        <h3>Puantaj ve maliyet</h3>
                        <label className="hr-field">
                          Puantaj dönemi
                          <input
                            type="month"
                            value={month}
                            onChange={(e) => {
                              if (e.target.value) setMonth(e.target.value);
                            }}
                          />
                        </label>
                        {times.map((entry) => (
                          <article
                            key={entry.id}
                            className="hr-time hr-row"
                            aria-label={entry.description}
                          >
                            <strong>
                              {dateLabel(entry.workDate)} · {entry.hours} saat ·{' '}
                              {timeLabels[entry.status]}
                            </strong>
                            <p>
                              {entry.project?.name || kindLabels[entry.kind]} · {entry.description}
                            </p>
                            <p>
                              {entry.totalCost !== null && entry.currency
                                ? formatMoney(entry.totalCost, entry.currency)
                                : 'Maliyet onayda hesaplanır.'}
                            </p>
                            {entry.voidReason && <p>İptal gerekçesi: {entry.voidReason}</p>}
                            <div className="hr-actions">
                              {entry.status === 'DRAFT' && (
                                <button
                                  className="primary-button"
                                  disabled={busy}
                                  onClick={() =>
                                    void run(
                                      () =>
                                        api(
                                          `/${selected}/time-entries/${entry.id}/approve`,
                                          'POST',
                                          {},
                                        ),
                                      'Puantaj onaylandı; maliyet iş dosyasına işlendi.',
                                    )
                                  }
                                >
                                  Puantajı onayla
                                </button>
                              )}
                              {entry.status !== 'VOID' && (
                                <button
                                  className="secondary-button"
                                  disabled={busy}
                                  onClick={() => setVoidEntry(entry.id)}
                                >
                                  Kaydı iptal et
                                </button>
                              )}
                            </div>
                            {voidEntry === entry.id && (
                              <form
                                className="hr-inline-form"
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  const reason = val(new FormData(e.currentTarget), 'reason');
                                  if (
                                    await run(
                                      () =>
                                        api(`/${selected}/time-entries/${entry.id}/void`, 'POST', {
                                          reason,
                                        }),
                                      'Kayıt iptal edildi; geçmiş korundu.',
                                    )
                                  )
                                    setVoidEntry('');
                                }}
                              >
                                <label>
                                  İptal gerekçesi
                                  <input name="reason" minLength={3} maxLength={1000} required />
                                </label>
                                <button disabled={busy} className="secondary-button">
                                  İptali kaydet
                                </button>
                              </form>
                            )}
                          </article>
                        ))}
                        {!times.length && <p>Bu dönemde puantaj kaydı yok.</p>}
                      </section>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
