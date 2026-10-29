import { clean } from '../../lib/text'
export type CartItem = { id: string; name: string; priceCents: number; qty: number; kind: 'stock' | 'order'; image: string | null; note: string }
export const MAX_QTY = 50
export const MAX_ITEMS = 30
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// O carrinho fica no aparelho do cliente: tudo que vem de lá é desconfiado e revalidado
export function sanitizeItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return []
  const out: CartItem[] = []
  for (const r of raw.slice(0, MAX_ITEMS)) {
    if (!r || typeof r !== 'object') continue
    const x = r as Record<string, unknown>
    if (typeof x.id !== 'string' || !UUID.test(x.id)) continue
    if (typeof x.name !== 'string' || !x.name || x.name.length > 80) continue
    const price = Number(x.priceCents), qty = Number(x.qty)
    if (!Number.isInteger(price) || price <= 0 || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) continue
    out.push({ id: x.id, name: x.name, priceCents: price, qty, kind: x.kind === 'order' ? 'order' : 'stock', image: typeof x.image === 'string' ? x.image.slice(0, 200) : null, note: typeof x.note === 'string' ? x.note.slice(0, 200) : '' })
  }
  return out
}
export function addItem(items: CartItem[], p: Omit<CartItem, 'qty' | 'note'>, qty: number, note: string): CartItem[] {
  const q = Math.min(MAX_QTY, Math.max(1, Math.floor(qty)))
  const n = note.trim().slice(0, 200)
  const i = items.findIndex(x => x.id === p.id)
  if (i < 0) return items.length >= MAX_ITEMS ? items : [...items, { ...p, qty: q, note: n }]
  const next = [...items]
  next[i] = { ...items[i], ...p, qty: Math.min(MAX_QTY, items[i].qty + q), note: n || items[i].note }
  return next
}
export const subtotal = (items: CartItem[]) => items.reduce((a, i) => a + i.priceCents * i.qty, 0)
// Observações viram uma linha só (o banco não aceita quebras de linha nesse campo)
export const composeNotes = (items: CartItem[], general: string) =>
  [...items.filter(i => clean(i.note)).map(i => `${i.name}: ${clean(i.note)}`), clean(general)].filter(Boolean).join(' • ')
