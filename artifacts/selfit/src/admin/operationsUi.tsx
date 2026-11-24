import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { NavigableRows } from './adminInteractions';
import './operations.css';

export type ViewActions = { go: (path: string) => void; notify: (message: string) => void };
export function OpsHeading({ title, description, action, section = 'Lager' }: { title: string; description: string; action?: ReactNode; section?: string }) {
  return <header className="admin-page-heading"><div><p className="admin-kicker">{section}</p><h1>{title}</h1><p>{description}</p></div>{action && <div className="admin-actions">{action}</div>}</header>;
}
export function OpsPanel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="admin-panel"><header className="admin-panel-head"><h2>{title}</h2>{action}</header><div className="admin-panel-body">{children}</div></section>;
}
export function OpsTable({ headers, children, id }: { headers: string[]; children: ReactNode; id: string }) {
  return <div className="admin-table-wrap"><table className="admin-table" data-testid={id}><thead><tr>{headers.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody><NavigableRows tableId={id} headers={headers}>{children}</NavigableRows></tbody></table></div>;
}
export function OpsBadge({ children }: { children: string }) {
  const tone = /spärrad|kasserad|avbruten/i.test(children) ? 'bad' : /pausad|kortdaterad|på väg|utkast|delvis|pågår/i.test(children) ? 'warn' : 'good';
  return <span className={`admin-status ${tone}`}>{children}</span>;
}
export function OpsField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="admin-field"><span>{label}</span>{children}</label>;
}
export function OpsTabs({ tabs, active, select }: { tabs: string[]; active: string; select: (tab: string) => void }) {
  return <div className="admin-tabs" role="tablist" aria-label="Välj delvy">{tabs.map((t, index) => <button type="button" className="admin-tab" role="tab" aria-selected={active === t} tabIndex={active === t ? 0 : -1} key={t} onClick={() => select(t)} onKeyDown={(event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    select(tabs[next]);
    (event.currentTarget.parentElement?.querySelectorAll('button')[next] as HTMLButtonElement | undefined)?.focus();
  }}>{t}</button>)}</div>;
}
export function OpsDialog({ title, open, onOpenChange, children }: { title: string; open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><div className="admin-root ops-dialog-scope"><Dialog.Overlay className="ops-overlay" /><Dialog.Content className="ops-modal" aria-describedby={undefined}><header className="admin-panel-head"><Dialog.Title>{title}</Dialog.Title><Dialog.Close className="admin-btn small" aria-label="Stäng dialog">Stäng</Dialog.Close></header><div className="admin-panel-body">{children}</div></Dialog.Content></div></Dialog.Portal></Dialog.Root>;
}
export function OpsEmpty({ children = 'Inga poster matchar filtren.' }: { children?: ReactNode }) { return <p className="admin-empty">{children}</p>; }
export function OpsError({ message }: { message: string }) { return message ? <p className="admin-inline-message" role="alert">{message}</p> : null; }
