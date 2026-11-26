import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readJSON, writeJSON } from '@/lib/storage';

const KEY = 'selfit-cookies-v1';

export interface CookiePrefs {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface Stored extends CookiePrefs {
  decided: boolean;
}

interface CookieCtx {
  prefs: CookiePrefs;
  decided: boolean;
  ready: boolean;
  dialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  save: (p: CookiePrefs) => void;
}

const DEFAULT: Stored = { functional: false, analytics: false, marketing: false, decided: false };
const Ctx = createContext<CookieCtx | null>(null);

export function CookieProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(DEFAULT);
  const [ready, setReady] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setState({ ...DEFAULT, ...readJSON<Partial<Stored>>(KEY, {}) });
    setReady(true);
  }, []);

  const save = useCallback((p: CookiePrefs) => {
    const next = { ...p, decided: true };
    setState(next);
    writeJSON(KEY, next);
    setDialogOpen(false);
  }, []);

  const value = useMemo<CookieCtx>(
    () => ({
      prefs: { functional: state.functional, analytics: state.analytics, marketing: state.marketing },
      decided: state.decided,
      ready,
      dialogOpen,
      openDialog: () => setDialogOpen(true),
      closeDialog: () => setDialogOpen(false),
      save,
    }),
    [state, ready, dialogOpen, save],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Som useCookies, men ger null utanför butiken (t.ex. i Admin). */
export function useCookiesOptional() {
  return useContext(Ctx);
}

export function useCookies() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCookies måste användas inom CookieProvider');
  return ctx;
}
