import { Suspense } from 'react';
import { TasksBoard } from '../../../components/tasks-board';

export default function TasksPage() {
  return (
    <Suspense fallback={<p>Görevler yükleniyor…</p>}>
      <TasksBoard />
    </Suspense>
  );
}
