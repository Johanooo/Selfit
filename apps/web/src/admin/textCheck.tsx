import { useEffect, useState } from 'react';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/cart-math';
import { defaultSettings, type SiteSettings } from '@/data/siteDefaults';
import { fillFields } from '@/data/support';

/**
 * Hjälper Admin att hålla texterna i samma takt som Inställningar → Villkor och avgifter.
 * En text som skriver "30 dagars öppet köp" för hand följer inte med om villkoren ändras.
 * Med fältet {öppet köp} gör den det.
 */

const api = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${path}`;

/** Butikens sparade inställningar, för att visa hur en text ser ut med fälten ifyllda. */
export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  useEffect(() => {
    fetch(api('/settings'))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.policies && setSettings({ ...defaultSettings, ...d }))
      .catch(() => undefined);
  }, []);
  return settings;
}

/** Varningar när en text skriver ut ett värde för hand i stället för att använda fältet. */
export function textWarnings(text: string, settings: SiteSettings): string[] {
  const p = settings.policies;
  const out: string[] = [];
  const has = (token: string) => text.includes(`{${token}}`);
  if (/öppet köp/i.test(text) && /\d/.test(text) && !has('öppet köp')) out.push(`Skriv {öppet köp} i stället för antal dagar (just nu ${p.openPurchaseDays}).`);
  if (/(skicka|skickas|leverans)/i.test(text) && /(\d|samma dag)/i.test(text.replace(/före\s*\d{1,2}([:.]\d{2})?/i, '')) && !has('leveranstid'))
    out.push(`Skriv {leveranstid} i stället för leveranstiden (just nu ${p.dispatchDays}).`);
  if (/före\s*\d{1,2}([:.]\d{2})?/i.test(text) && !has('beställ före')) out.push(`Skriv {beställ före} i stället för klockslaget (just nu ${p.orderCutoff}).`);
  if (/fri frakt|handlar för/i.test(text) && /\d+\s*kr/i.test(text) && !has('fri frakt')) out.push(`Skriv {fri frakt} i stället för beloppet (just nu ${FREE_SHIPPING_THRESHOLD} kr).`);
  return out;
}

/** Visar hur texten blir i butiken och varnar om den inte följer villkoren. */
export function TextCheck({ text, settings }: { text: string; settings: SiteSettings }) {
  if (!text.trim()) return null;
  const filled = fillFields(text, settings).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  const warnings = textWarnings(text, settings);
  const changed = filled !== text;
  if (!changed && !warnings.length) return null;
  return (
    <div className="text-check">
      {changed && <p className="text-check-preview">Visas som: {filled}</p>}
      {warnings.map((w) => (
        <p key={w} className="text-check-warn" role="note">
          ⚠ {w}
        </p>
      ))}
    </div>
  );
}

/** Lista över fälten för villkoren och deras nuvarande värden. */
export function PolicyFieldsHelp({ settings }: { settings: SiteSettings }) {
  const p = settings.policies;
  const rows: [string, string][] = [
    ['{fri frakt}', `${FREE_SHIPPING_THRESHOLD} kr`],
    ['{beställ före}', p.orderCutoff],
    ['{leveranstid}', p.dispatchDays],
    ['{öppet köp}', String(p.openPurchaseDays)],
  ];
  return (
    <p className="admin-field-hint text-check-fields">
      Fält som följer Inställningar → Villkor och avgifter:{' '}
      {rows.map(([t, v], i) => (
        <span key={t}>
          {i > 0 && ' · '}
          <code>{t}</code> = {v}
        </span>
      ))}
    </p>
  );
}
