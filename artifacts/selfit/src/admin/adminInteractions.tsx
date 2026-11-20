import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useState, type ReactElement, type ReactNode } from 'react';

type AdminNavigate = (path: string) => void;
export const AdminNavigationContext = createContext<AdminNavigate>(() => undefined);
export type RowDetail = { title: string; from: string; fields: { label: string; value: string }[] };

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode; value?: string; defaultValue?: string };
    return textOf(props.children) || String(props.value ?? props.defaultValue ?? '');
  }
  return '';
}

export function readRowDetail(id: string): RowDetail | null {
  try { return JSON.parse(sessionStorage.getItem(`selfit-admin-detail:${id}`) ?? 'null'); } catch { return null; }
}

export function storeRowDetail(id: string, detail: RowDetail) {
  sessionStorage.setItem(`selfit-admin-detail:${id}`, JSON.stringify(detail));
}

export function recordRowProps(id: string, title: string, fields: RowDetail['fields'], go: AdminNavigate) {
  const open = () => {
    storeRowDetail(id, { title, from: window.location.pathname + window.location.search, fields });
    go(`/admin/detalj/${encodeURIComponent(id)}`);
  };
  return {
    tabIndex: 0,
    role: 'link' as const,
    'aria-label': `Öppna ${title}`,
    onClick: (event: React.MouseEvent<HTMLElement>) => { if (!isInteractiveTarget(event.target)) open(); },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); open(); } },
  };
}

function detailHref(child: ReactElement<RowProps>, tableId: string, headers: string[], preferredId?: string) {
  const props = child.props as RowProps & { children?: ReactNode };
  const cells = Children.toArray(props.children).filter(isValidElement) as ReactElement<{ children?: ReactNode; colSpan?: number }>[];
  if (cells.length < 2 || cells.some((cell) => cell.props.colSpan)) return '';
  const title = textOf(cells[0].props.children).trim() || 'Detaljer';
  if (['table-orders', 'table-pick-list'].includes(tableId)) return `/admin/order/${encodeURIComponent(title)}`;
  const rowId = String(props['data-testid'] ?? child.key ?? title);
  const id = preferredId ?? encodeURIComponent(`${tableId}:${rowId}`);
  const key = decodeURIComponent(id);
  if (!readRowDetail(key)) {
    storeRowDetail(key, {
      title,
      from: window.location.pathname + window.location.search,
      fields: cells.map((cell, index) => ({ label: headers[index] || 'Information', value: textOf(cell.props.children).trim() })).filter((field) => field.value && field.label !== 'Information'),
    });
  }
  return `/admin/detalj/${id}`;
}
type RowProps = Record<string, unknown> & {
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLTableRowElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTableRowElement>) => void;
};

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('a, button, input, select, textarea, [role="checkbox"], [role="switch"], [data-row-interactive]'));
}

export function NavigableRows({ children, go, tableId = 'lista', headers = [] }: { children: ReactNode; go?: AdminNavigate; tableId?: string; headers?: string[] }) {
  const navigate = useContext(AdminNavigationContext);
  return <>{Children.map(children, (child) => {
    if (!isValidElement(child) || child.type !== 'tr') return child;
    const props = child.props as RowProps;
    const href = typeof props['data-row-href'] === 'string' ? props['data-row-href'] : detailHref(child as ReactElement<RowProps>, tableId, headers);
    if (!href) return child;
    if (href.startsWith('/admin/detalj/')) detailHref(child as ReactElement<RowProps>, tableId, headers, href.slice('/admin/detalj/'.length));
    const originalClick = props.onClick;
    const originalKeyDown = props.onKeyDown;
    const label = typeof props['data-row-label'] === 'string' ? props['data-row-label'] : 'Öppna radens detalj';
    return cloneElement(child as ReactElement<RowProps>, {
      tabIndex: 0,
      'data-row-href': href,
      'aria-label': label,
      className: `${props.className ?? ''} admin-row-clickable`.trim(),
      onClick: (event) => {
        originalClick?.(event);
        if (!event.defaultPrevented && !isInteractiveTarget(event.target)) (go ?? navigate)(href);
      },
      onKeyDown: (event) => {
        originalKeyDown?.(event);
        if (!event.defaultPrevented && event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          (go ?? navigate)(href);
        }
      },
    });
  })}</>;
}

export function RowDetailView({ id, notify }: { id: string; notify: (message: string) => void }) {
  const [detail, setDetail] = useState(() => readRowDetail(id));
  if (!detail) return <section className="admin-panel"><div className="admin-panel-body"><h1>Detaljer saknas</h1><p>Öppna posten från listan för att visa den lokala exempeldatan.</p></div></section>;
  return <section className="admin-panel" data-testid="view-row-detail"><header className="admin-panel-head"><div><h1>{detail.title}</h1><p>Lokal detaljvy · inga ändringar skickas till butiken.</p></div></header><form className="admin-panel-body admin-form-grid" onSubmit={(event) => { event.preventDefault(); storeRowDetail(id, detail); notify('Sparat lokalt.'); }}>
    {detail.fields.map((field, index) => <label className="admin-field" key={`${field.label}-${index}`}><span>{field.label}</span><input className="admin-control" value={field.value} data-testid={`input-detail-field-${index}`} onChange={(event) => setDetail({ ...detail, fields: detail.fields.map((item, i) => i === index ? { ...item, value: event.target.value } : item) })} /></label>)}
    <div className="admin-actions span-2"><button className="admin-btn primary" type="submit" data-testid="button-save-row-detail">Spara</button></div>
  </form></section>;
}

export function InteractiveTable({ children, className }: { children: ReactNode; className?: string }) {
  const sections = Children.toArray(children);
  const head = sections.find((node) => isValidElement(node) && node.type === 'thead') as ReactElement<{ children?: ReactNode }> | undefined;
  const headRow = head ? Children.toArray(head.props.children).find(isValidElement) as ReactElement<{ children?: ReactNode }> | undefined : undefined;
  const headers = headRow ? Children.toArray(headRow.props.children).map(textOf) : [];
  return <table className={className}>{sections.map((node) => {
    if (!isValidElement(node) || node.type !== 'tbody') return node;
    return <tbody key="interactive-body"><NavigableRows tableId={headers.join('-')} headers={headers}>{(node.props as { children?: ReactNode }).children}</NavigableRows></tbody>;
  })}</table>;
}

export function useAdminListState<T>(listKey: string, stateKey: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const storageKey = `selfit-admin-list:${listKey}:${stateKey}`;
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const stored = window.sessionStorage.getItem(storageKey);
      return stored === null ? initial : JSON.parse(stored) as T;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // List filters remain usable if browser storage is unavailable.
    }
  }, [storageKey, value]);
  return [value, setValue];
}

export function announcePrototypeAction(label: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('selfit-admin-action', { detail: { label } }));
  }
}
