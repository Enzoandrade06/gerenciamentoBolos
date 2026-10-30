import { centsToBRL } from '../../lib/money'
import { fmtISO } from '../../lib/date'

export type AdminOrder = {
  id: string; order_number: number; customer_name: string; customer_phone: string; fulfillment: 'pickup' | 'delivery'
  address: string | null; delivery_fee_cents: number; requested_for: string | null; notes: string | null; total_cents: number
  status: string; payment_method: 'pix' | 'cash'; payment_status: string; paid_at: string | null; created_at: string
  order_items: { name_snapshot: string; quantity: number; unit_price_cents: number }[]
  order_status_history: { status: string; created_at: string }[]
}
export const FLOW: Record<'pickup' | 'delivery', string[]> = {
  pickup: ['new', 'confirmed', 'preparing', 'ready', 'completed'],
  delivery: ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed'],
}
export const statusLabel = (s: string, f: 'pickup' | 'delivery') =>
  ({ new: 'Novo', confirmed: 'Confirmado', preparing: 'Em preparação', ready: f === 'delivery' ? 'Pronto' : 'Pronto para retirada', out_for_delivery: 'Saiu para entrega', completed: 'Concluído', cancelled: 'Cancelado' } as Record<string, string>)[s] ?? s
export const nextStatus = (o: AdminOrder) => { const f = FLOW[o.fulfillment]; const i = f.indexOf(o.status); return i >= 0 && i < f.length - 1 ? f[i + 1] : null }

// Mensagem pronta para avisar o cliente a cada etapa
export function statusMessage(o: AdminOrder, status: string): string {
  const nome = o.customer_name.split(' ')[0]; const n = `#${o.order_number}`
  const itens = o.order_items.map(i => `• ${i.quantity}x ${i.name_snapshot}`).join('\n')
  const resumo = `${itens}\n*Total:* ${centsToBRL(o.total_cents)}`
  const quando = o.requested_for ? `\n*Data da encomenda:* ${fmtISO(o.requested_for)}` : ''
  switch (status) {
    case 'new': return `Olá, ${nome}! Recebemos o seu pedido ${n} 🍰\nJá vamos conferir e te confirmo em seguida.`
    case 'confirmed': return `Olá, ${nome}! Seu pedido ${n} está *confirmado* ✅\n\n${resumo}${quando}${o.fulfillment === 'delivery' && o.address ? `\n*Entrega:* ${o.address}` : ''}\n\nObrigada pela preferência! 💗`
    case 'preparing': return `Olá, ${nome}! Seu pedido ${n} já está *em preparação* 👩‍🍳`
    case 'ready': return o.fulfillment === 'delivery' ? `Olá, ${nome}! Seu pedido ${n} está *pronto* e logo sai para entrega 🎉` : `Olá, ${nome}! Seu pedido ${n} está *pronto para retirada* 🎉`
    case 'out_for_delivery': return `Olá, ${nome}! Seu pedido ${n} *saiu para entrega* 🛵${o.address ? `\n${o.address}` : ''}`
    case 'completed': return `Olá, ${nome}! Pedido ${n} concluído. Muito obrigada pela preferência, volte sempre! 💗`
    case 'cancelled': return `Olá, ${nome}! Infelizmente o pedido ${n} foi *cancelado*. Se tiver qualquer dúvida, é só chamar por aqui.`
    default: return `Olá, ${nome}! Sobre o seu pedido ${n}:`
  }
}
export function waCustomer(phone: string, text: string) {
  let d = phone.replace(/\D/g, ''); if (d.length <= 11) d = '55' + d
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}
export const fmtPhone = (p: string) => { const d = p.replace(/\D/g, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : p }
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
