import type { ReactNode } from 'react';

export function Alert({
  type,
  message,
  onClose,
}: {
  type: 'error' | 'success';
  message: string;
  onClose?: () => void;
}) {
  return (
    <div className={`alert alert--${type}`} role="alert">
      <span>{message}</span>
      {onClose && (
        <button type="button" className="alert__close" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="empty-state">{message}</div>;
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return <div className="loading-state">{message}</div>;
}

export function Card({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      {title && <div className="card__title">{title}</div>}
      <div className="card__body">{children}</div>
    </div>
  );
}
