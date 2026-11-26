import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { resolveLines, type CartLine, type DiscountInput, type ResolvedLine } from '@/lib/cart-math';
import type { DiscountRule } from '@/lib/discounts';
import { findVariant } from '@/data/products';
import { isBuyable } from '@/lib/format';
import { readJSON, writeJSON } from '@/lib/storage';

const KEY = 'selfit-cart-v1';
const API = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api`;

export type CodeCheck = { ok: true; rule: DiscountRule } | { ok: false; error: string };

/** Frågar servern om koden får användas. Med e-post kontrolleras även vilka kunder den gäller. */
export async function checkDiscountCode(code: string, email?: string): Promise<CodeCheck> {
  try {
    const res = await fetch(`${API}/discounts/check`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, email: email || undefined }),
    });
    const body = (await res.json()) as { ok: boolean; error?: string; discount?: DiscountRule };
    return body.ok && body.discount ? { ok: true, rule: body.discount } : { ok: false, error: body.error ?? 'Koden kunde inte användas.' };
  } catch {
    return { ok: false, error: 'Kunde inte kontrollera koden just nu. Försök igen om en stund.' };
  }
}
const MAX_QTY = 20;

interface CartState {
  lines: CartLine[];
  code: string | null;
}

export interface AddedNotice {
  id: number;
  variantId: string;
  qty: number;
}

interface CartCtx {
  lines: ResolvedLine[];
  count: number;
  code: string | null;
  /** Reglerna för koden och de automatiska rabatterna, till computeTotals. */
  discounts: DiscountInput;
  ready: boolean;
  storageAvailable: boolean | null;
  lastAdded: AddedNotice | null;
  add: (variantId: string, qty?: number) => boolean;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  applyCode: (code: string) => Promise<CodeCheck>;
  /** Sätter en redan kontrollerad regel (t.ex. efter kontroll med e-post i kassan). */
  setCodeRule: (rule: DiscountRule) => void;
  removeCode: () => void;
  dismissNotice: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>({ lines: [], code: null });
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(null);
  const [lastAdded, setLastAdded] = useState<AddedNotice | null>(null);
  const [codeRule, setCodeRuleState] = useState<DiscountRule | null>(null);
  const [automatic, setAutomatic] = useState<DiscountRule[]>([]);
  const noticeId = useRef(0);

  useEffect(() => {
    const saved = readJSON<CartState>(KEY, { lines: [], code: null });
    setState({
      lines: Array.isArray(saved.lines) ? saved.lines.filter((l) => findVariant(l.variantId) && l.qty > 0) : [],
      code: typeof saved.code === 'string' ? saved.code : null,
    });
    setReady(true);
    // Sparad kod kontrolleras igen: den kan ha gått ut sedan sist.
    if (typeof saved.code === 'string') {
      checkDiscountCode(saved.code).then((r) => {
        if (r.ok) setCodeRuleState(r.rule);
        else setState((s) => ({ ...s, code: null }));
      });
    }
    fetch(`${API}/discounts/automatic`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: DiscountRule[]) => setAutomatic(Array.isArray(list) ? list : []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (ready) setStorageAvailable(writeJSON(KEY, state));
  }, [state, ready]);

  const add = useCallback((variantId: string, qty = 1) => {
    const hit = findVariant(variantId);
    if (!hit || !isBuyable(hit.variant)) return false;
    setState((s) => {
      const existing = s.lines.find((l) => l.variantId === variantId);
      const lines = existing
        ? s.lines.map((l) => (l.variantId === variantId ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l))
        : [...s.lines, { variantId, qty: Math.min(MAX_QTY, qty) }];
      return { ...s, lines };
    });
    noticeId.current += 1;
    setLastAdded({ id: noticeId.current, variantId, qty });
    return true;
  }, []);

  const setQty = useCallback((variantId: string, qty: number) => {
    setState((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.variantId === variantId ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l)),
    }));
  }, []);

  const remove = useCallback((variantId: string) => {
    setState((s) => ({ ...s, lines: s.lines.filter((l) => l.variantId !== variantId) }));
  }, []);

  const clear = useCallback(() => {
    setState({ lines: [], code: null });
    setCodeRuleState(null);
  }, []);

  const applyCode = useCallback(async (raw: string) => {
    const code = raw.trim().toUpperCase();
    const r = await checkDiscountCode(code);
    if (r.ok) {
      setCodeRuleState(r.rule);
      setState((s) => ({ ...s, code }));
    }
    return r;
  }, []);

  const setCodeRule = useCallback((rule: DiscountRule) => setCodeRuleState(rule), []);

  const removeCode = useCallback(() => {
    setState((s) => ({ ...s, code: null }));
    setCodeRuleState(null);
  }, []);
  const dismissNotice = useCallback(() => setLastAdded(null), []);

  const value = useMemo<CartCtx>(() => {
    const lines = resolveLines(state.lines);
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      code: state.code,
      discounts: { code: state.code ? codeRule : null, automatic },
      ready,
      storageAvailable,
      lastAdded,
      add,
      setQty,
      remove,
      clear,
      applyCode,
      setCodeRule,
      removeCode,
      dismissNotice,
    };
  }, [state, codeRule, automatic, ready, storageAvailable, lastAdded, add, setQty, remove, clear, applyCode, setCodeRule, removeCode, dismissNotice]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart måste användas inom CartProvider');
  return ctx;
}

export const CART_MAX_QTY = MAX_QTY;
