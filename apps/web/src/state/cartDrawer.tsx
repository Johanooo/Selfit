import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/** Om varukorgen som glider in från höger är öppen. */
interface DrawerCtx {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const Ctx = createContext<DrawerCtx>({ isOpen: false, open: () => {}, close: () => {} });

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const value = useMemo(() => ({ isOpen, open: () => setOpen(true), close: () => setOpen(false) }), [isOpen]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCartDrawer = () => useContext(Ctx);
