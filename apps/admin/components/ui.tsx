'use client';
import { ReactNode, useEffect, useRef } from 'react';
export function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <p className="error" role="alert">
      {message}
    </p>
  ) : null;
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="modal" onCancel={close}>
      <header className="row">
        <h2>{title}</h2>
        <button type="button" className="secondary" aria-label="Pencereyi kapat" onClick={close}>
          Kapat
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Badge({ children, good = false }: { children: ReactNode; good?: boolean }) {
  return <span className={`badge ${good ? 'good' : ''}`}>{children}</span>;
}
