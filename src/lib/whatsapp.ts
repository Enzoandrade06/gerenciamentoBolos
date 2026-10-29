import { centsToBRL } from './money'
import { fmtISO } from './date'
export type PublicOrder = {
  order_number: number; status: string; payment_status: string; payment_method: 'pix' | 'cash'
  fulfillment: 'pickup' | 'delivery'; address: string | null; requested_for: string | null; notes: string | null
  customer_name: string; delivery_fee_cents: number; total_cents: number; created_at: string
  items: { name: string; quantity: number; unit_price_cents: number; kind: string }[]
  whatsapp: string | null
  pix: { key: string | null; receiver: string | null; bank: string | null; instructions: string | null; link: string | null } | null
}
export function waLink(phone: string, text: string) {
  let d = phone.replace(/\D/g, ''); if (d.length <= 11) d = '55' + d
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}
// Mensagem pronta com tudo que está no pedido
export function orderMessage(o: PublicOrder): string {
  const L: string[] = ['Olá! Fiz um pedido pelo site 🍰', `*Pedido #${o.order_number}*`, '', '*Itens*']
  for (const i of o.items) L.push(`• ${i.quantity}x ${i.name} — ${centsToBRL(i.unit_price_cents * i.quantity)}`)
  L.push('')
  if (o.fulfillment === 'delivery') { L.push('*Entrega*'); if (o.address) L.push(o.address); if (o.delivery_fee_cents > 0) L.push(`Taxa de entrega: ${centsToBRL(o.delivery_fee_cents)}`) } else L.push('*Retirada no local*')
  if (o.requested_for) L.push(`*Data da encomenda:* ${fmtISO(o.requested_for)}`)
  if (o.notes) L.push(`*Observações:* ${o.notes}`)
  L.push(`*Pagamento:* ${o.payment_method === 'pix' ? (o.payment_status === 'confirmed' ? 'Pix (confirmado)' : 'Pix (aguardando confirmação)') : 'Dinheiro na ' + (o.fulfillment === 'delivery' ? 'entrega' : 'retirada')}`)
  L.push(`*Total:* ${centsToBRL(o.total_cents)}`, '', `Nome: ${o.customer_name}`)
  return L.join('\n')
}
