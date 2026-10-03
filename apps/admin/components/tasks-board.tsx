'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Project,
  ProjectOptions,
  TaskPriority,
  TaskRecord,
  UnauthorizedError,
  createProjectTask,
  fetchProjectOptions,
  fetchProjects,
  fetchTasks,
  updateTask,
} from '../lib/projects-client';

const views = { open: 'Açık görevler', overdue: 'Gecikenler', done: 'Tamamlananlar', all: 'Tümü' };
type View = keyof typeof views;
const priorities: Record<TaskPriority, string> = {
  LOW: 'Düşük',
  MEDIUM: 'Normal',
  HIGH: 'Yüksek',
  CRITICAL: 'Kritik',
};
const statuses: Record<TaskRecord['status'], string> = {
  TODO: 'Yapılacak',
  IN_PROGRESS: 'Devam ediyor',
  BLOCKED: 'Engelli',
  DONE: 'Tamamlandı',
};
const dateLabel = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value))
    : 'Termin yok';

export function TasksBoard() {
  const router = useRouter();
  const params = useSearchParams();
  const requestedView = params.get('view') || 'open';
  const view: View = Object.hasOwn(views, requestedView) ? (requestedView as View) : 'open';
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [options, setOptions] = useState<ProjectOptions>({ customers: [], owners: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [editing, setEditing] = useState<TaskRecord | null | undefined>(undefined);
  const [pending, setPending] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([fetchTasks(), fetchProjects(), fetchProjectOptions()])
      .then(([records, work, choices]) => {
        if (!active) return;
        setTasks(records);
        setProjects(work);
        setOptions(choices);
      })
      .catch((caught) => {
        if (!active) return;
        if (caught instanceof UnauthorizedError) router.replace('/login');
        else setError(caught instanceof Error ? caught.message : 'Görevler yüklenemedi.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router, attempt]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  const overdue = (task: TaskRecord) =>
    task.status !== 'DONE' && !!task.dueDate && new Date(task.dueDate).getTime() < todayTime;
  const visible = useMemo(
    () =>
      tasks
        .filter((task) => {
          if (view === 'open' && task.status === 'DONE') return false;
          if (view === 'done' && task.status !== 'DONE') return false;
          if (
            view === 'overdue' &&
            !(
              task.status !== 'DONE' &&
              task.dueDate &&
              new Date(task.dueDate).getTime() < todayTime
            )
          )
            return false;
          return (
            (!projectFilter || task.projectId === projectFilter) &&
            (!ownerFilter || task.assignee?.id === ownerFilter) &&
            `${task.title} ${task.project.name} ${task.project.workNumber ?? ''}`
              .toLocaleLowerCase('tr-TR')
              .includes(search.toLocaleLowerCase('tr-TR'))
          );
        })
        .sort((a, b) => {
          if ((a.status === 'DONE') !== (b.status === 'DONE')) return a.status === 'DONE' ? 1 : -1;
          return (
            (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) -
            (b.dueDate ? new Date(b.dueDate).getTime() : Infinity)
          );
        }),
    [tasks, view, projectFilter, ownerFilter, search, todayTime],
  );

  function report(caught: unknown) {
    if (caught instanceof UnauthorizedError) router.replace('/login');
    else setError(caught instanceof Error ? caught.message : 'Görev kaydedilemedi.');
  }
  async function changeStatus(task: TaskRecord) {
    setPending(task.id);
    setError('');
    setMessage('');
    try {
      const updated = await updateTask(task.id, {
        status: task.status === 'DONE' ? 'TODO' : 'DONE',
      });
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? { ...item, ...updated } : item)),
      );
      setMessage(updated.status === 'DONE' ? 'Görev tamamlandı.' : 'Görev yeniden açıldı.');
    } catch (caught) {
      report(caught);
    } finally {
      setPending('');
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') || '').trim();
    if (!title) {
      setError('Görev başlığını girin.');
      return;
    }
    const projectId = editing?.projectId || String(data.get('projectId') || '');
    const dueDate = String(data.get('dueDate') || '');
    const assigneeId = String(data.get('assigneeId') || '');
    const priority = data.get('priority') as TaskPriority;
    setPending('form');
    setError('');
    setMessage('');
    try {
      if (editing) {
        const updated = await updateTask(editing.id, {
          title,
          priority,
          assigneeId: assigneeId || null,
          dueDate: dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null,
          status: data.get('status') as TaskRecord['status'],
        });
        setTasks((current) =>
          current.map((item) => (item.id === editing.id ? { ...item, ...updated } : item)),
        );
      } else {
        const project = projects.find((item) => item.id === projectId);
        if (!project) throw new Error('Görevin bağlı olduğu işi seçin.');
        const created = await createProjectTask(projectId, {
          title,
          priority,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : undefined,
        });
        setTasks((current) => [{ ...created, projectId, project }, ...current]);
        setSearch('');
        setProjectFilter('');
        setOwnerFilter('');
        router.replace('/tasks?view=open', { scroll: false });
      }
      setEditing(undefined);
      setMessage(editing ? 'Görev güncellendi.' : 'Görev oluşturuldu.');
    } catch (caught) {
      report(caught);
    } finally {
      setPending('');
    }
  }

  return (
    <section className="stack task-board">
      <div className="page-heading task-board-heading">
        <div>
          <p className="eyebrow">Günlük takip</p>
          <h1>Görevler</h1>
          <p className="muted">
            İşlere bağlı görevleri, sorumluları ve terminleri tek yerden yönetin.
          </p>
        </div>
        <button
          className="primary-button"
          disabled={loading || !!pending}
          onClick={() => {
            setEditing(null);
            setError('');
          }}
        >
          + Yeni Görev
        </button>
      </div>
      {error ? (
        <div className="form-error" role="alert">
          {error}{' '}
          <button
            type="button"
            disabled={!!pending}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Yenile
          </button>
        </div>
      ) : null}
      {message ? (
        <p className="form-success" role="status">
          {message}
        </p>
      ) : null}
      {editing !== undefined ? (
        <form className="panel-card task-board-form" key={editing?.id || 'new'} onSubmit={save}>
          <h2>{editing ? 'Görevi düzenle' : 'Yeni görev'}</h2>
          <label className="task-form-wide">
            Görev başlığı
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={editing?.title || ''}
              autoFocus
            />
          </label>
          <label>
            Bağlı iş
            <select
              name="projectId"
              required
              defaultValue={editing?.projectId || ''}
              disabled={!!editing}
            >
              <option value="">İş seçin</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.workNumber ? `${project.workNumber} · ` : ''}
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sorumlu
            <select name="assigneeId" defaultValue={editing?.assignee?.id || ''}>
              <option value="">{editing ? 'Atanmamış' : 'Bana ata'}</option>
              {options.owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Termin
            <input
              name="dueDate"
              type="date"
              defaultValue={editing?.dueDate ? localDate(editing.dueDate) : ''}
            />
          </label>
          <label>
            Öncelik
            <select name="priority" defaultValue={editing?.priority || 'MEDIUM'}>
              {Object.entries(priorities).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {editing ? (
            <label>
              Durum
              <select name="status" defaultValue={editing.status}>
                {Object.entries(statuses).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="form-actions task-form-wide">
            <button
              className="secondary-button"
              type="button"
              disabled={!!pending}
              onClick={() => setEditing(undefined)}
            >
              Vazgeç
            </button>
            <button className="primary-button" disabled={!!pending}>
              {pending === 'form' ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      ) : null}
      <nav className="task-view-tabs" aria-label="Görev görünümü">
        {Object.entries(views).map(([key, label]) => (
          <Link
            key={key}
            href={`/tasks?view=${key}`}
            aria-current={view === key ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="task-board-filters">
        <label>
          Görev veya iş ara
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Başlık, iş adı veya iş numarası"
          />
        </label>
        <label>
          İşe göre filtrele
          <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            <option value="">Tüm işler</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sorumluya göre filtrele
          <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
            <option value="">Tüm sorumlular</option>
            {options.owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.fullName}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <p role="status">Görevler yükleniyor…</p>
      ) : (
        <>
          <p className="muted" aria-live="polite">
            {visible.length} görev gösteriliyor
          </p>
          <div className="task-record-list">
            {visible.map((task) => (
              <article
                key={task.id}
                aria-labelledby={`task-${task.id}`}
                className={`panel-card task-record ${overdue(task) ? 'task-record-overdue' : ''}`}
              >
                <div className="task-record-main">
                  <span className={`task-state task-state-${task.status.toLowerCase()}`}>
                    {statuses[task.status]}
                  </span>
                  <h2 id={`task-${task.id}`}>{task.title}</h2>
                  <Link
                    className="task-project-link"
                    href={`/projects?project=${encodeURIComponent(task.projectId)}&tab=tasks`}
                  >
                    {task.project.workNumber ? `${task.project.workNumber} · ` : ''}
                    {task.project.name} →
                  </Link>
                </div>
                <dl className="task-record-meta">
                  <div>
                    <dt>Sorumlu</dt>
                    <dd>{task.assignee?.fullName || 'Atanmamış'}</dd>
                  </div>
                  <div>
                    <dt>Termin</dt>
                    <dd>
                      {dateLabel(task.dueDate)}
                      {overdue(task) ? ' · Gecikti' : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>Öncelik</dt>
                    <dd>{priorities[task.priority]}</dd>
                  </div>
                </dl>
                <div className="task-record-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={!!pending}
                    onClick={() => {
                      setEditing(task);
                      setError('');
                    }}
                  >
                    Düzenle
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={!!pending}
                    onClick={() => void changeStatus(task)}
                  >
                    {pending === task.id
                      ? 'Kaydediliyor…'
                      : task.status === 'DONE'
                        ? 'Yeniden Aç'
                        : 'Tamamla'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && !error ? (
            <div className="panel-card">
              <h2>{view === 'overdue' ? 'Geciken görev yok' : 'Bu görünümde görev yok'}</h2>
              <p className="muted">
                Filtreleri değiştirebilir veya bir işe bağlı yeni görev oluşturabilirsiniz.
              </p>
              {!projects.length ? (
                <Link className="primary-button" href="/projects">
                  İlk işi oluştur
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function localDate(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
