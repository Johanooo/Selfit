import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  children,
  actions,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="empty" data-testid="state-empty">
      <div className="empty-icon" aria-hidden="true">
        {icon}
      </div>
      <h2 className="h2">{title}</h2>
      {children && <div className="muted">{children}</div>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}
