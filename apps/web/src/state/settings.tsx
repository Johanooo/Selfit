import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultSettings, type SiteSettings } from '@/data/siteDefaults';
import { replaceShipping } from '@/data/shipping';
import { buildSupportPages, type PageContent, type SupportPage } from '@/data/support';

interface SettingsCtx {
  settings: SiteSettings;
  pages: SupportPage[];
}

const Ctx = createContext<SettingsCtx>({ settings: defaultSettings, pages: buildSupportPages(defaultSettings) });

/**
 * Hämtar företagsuppgifter och villkor från servern (ändras i Admin).
 * Tills svaret kommit – eller om servern inte svarar – används standardvärdena.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [savedPages, setSavedPages] = useState<PageContent[]>([]);

  useEffect(() => {
    let cancelled = false;
    const base = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;
    fetch(`${base}/settings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SiteSettings | null) => {
        if (!cancelled && data?.company && data?.policies) {
          if (data.shipping) replaceShipping(data.shipping);
          setSettings({ ...defaultSettings, ...data });
        }
      })
      .catch(() => undefined);
    fetch(`${base}/pages`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PageContent[] | null) => {
        if (!cancelled && Array.isArray(data)) setSavedPages(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ settings, pages: buildSupportPages(settings, savedPages) }), [settings, savedPages]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx).settings;
export const useSupportPages = () => useContext(Ctx).pages;
export const useSupportPage = (slug?: string) => useContext(Ctx).pages.find((p) => p.slug === slug);
