import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { addItem, sanitizeItems, subtotal, MAX_QTY, type CartItem } from './cartLogic'

const KEY = 'cart-v1'
type Ctx = {
  items: CartItem[]; note: string; setNote: (s: string) => void
  add: (p: Omit<CartItem, 'qty' | 'note'>, qty: number, note: string) => void
  setQty: (id: string, q: number) => void; remove: (id: string) => void; clear: () => void; replace: (items: CartItem[]) => void
  count: number; subtotal: number
}
const C = createContext<Ctx | null>(null)
export const useCart = () => { const c = useContext(C); if (!c) throw new Error('CartProvider ausente'); return c }

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => { try { return sanitizeItems(JSON.parse(localStorage.getItem(KEY) ?? '{}').items) } catch { return [] } })
  const [note, setNote] = useState(() => { try { const n = JSON.parse(localStorage.getItem(KEY) ?? '{}').note; return typeof n === 'string' ? n.slice(0, 300) : '' } catch { return '' } })
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ items, note })) } catch { /* sem armazenamento: segue sem salvar */ } }, [items, note])
  const value = useMemo<Ctx>(() => ({
    items, note, setNote,
    add: (p, qty, n) => setItems(cur => addItem(cur, p, qty, n)),
    setQty: (id, q) => setItems(cur => q < 1 ? cur.filter(i => i.id !== id) : cur.map(i => i.id === id ? { ...i, qty: Math.min(MAX_QTY, q) } : i)),
    remove: id => setItems(cur => cur.filter(i => i.id !== id)),
    clear: () => { setItems([]); setNote('') },
    replace: setItems,
    count: items.reduce((a, i) => a + i.qty, 0), subtotal: subtotal(items),
  }), [items, note])
  return <C.Provider value={value}>{children}</C.Provider>
}
