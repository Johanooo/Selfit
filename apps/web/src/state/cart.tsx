import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DISCOUNT_CODES, resolveLines, type CartLine, type ResolvedLine } from '@/lib/cart-math';
import { findVariant } from '@/data/products';
import { isBuyable } from '@/lib/format';
import { readJSON, writeJSON } from '@/lib/storage';

const KEY = 'selfit-cart-v1';
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
  ready: boolean;
  storageAvailable: boolean | null;
  lastAdded: AddedNotice | null;
  add: (variantId: string, qty?: number) => boolean;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  applyCode: (code: string) => boolean;
  removeCode: () => void;
  dismissNotice: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>({ lines: [], code: null });
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(null);
  const [lastAdded, setLastAdded] = useState<AddedNotice | null>(null);
  const noticeId = useRef(0);

  useEffect(() => {
    const saved = readJSON<CartState>(KEY, { lines: [], code: null });
    setState({
      lines: Array.isArray(saved.lines) ? saved.lines.filter((l) => findVariant(l.variantId) && l.qty > 0) : [],
      code: saved.code && DISCOUNT_CODES[saved.code] ? saved.code : null,
    });
    setReady(true);
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

  const clear = useCallback(() => setState({ lines: [], code: null }), []);

  const applyCode = useCallback((raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!DISCOUNT_CODES[code]) return false;
    setState((s) => ({ ...s, code }));
    return true;
  }, []);

  const removeCode = useCallback(() => setState((s) => ({ ...s, code: null })), []);
  const dismissNotice = useCallback(() => setLastAdded(null), []);

  const value = useMemo<CartCtx>(() => {
    const lines = resolveLines(state.lines);
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      code: state.code,
      ready,
      storageAvailable,
      lastAdded,
      add,
      setQty,
      remove,
      clear,
      applyCode,
      removeCode,
      dismissNotice,
    };
  }, [state, ready, storageAvailable, lastAdded, add, setQty, remove, clear, applyCode, removeCode, dismissNotice]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart måste användas inom CartProvider');
  return ctx;
}

export const CART_MAX_QTY = MAX_QTY;
