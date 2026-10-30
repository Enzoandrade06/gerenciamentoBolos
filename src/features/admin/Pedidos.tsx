import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { sb } from '../../lib/supabase'
import { centsToBRL } from '../../lib/money'
import { fmtISO } from '../../lib/date'
import { Loading, Modal, Notice } from '../../components/ui'
import { FLOW, fmtDateTime, fmtPhone, nextStatus, statusLabel, statusMessage, waCustomer, type AdminOrder } from './orderMsg'

type Msg = { ok: boolean; text: string } | null
type Tab = 'ativos' | 'concluidos' | 'cancelados' | 'todos'
const btn = 'rounded-xl px-4 py-2 font-bold active:scale-95 disabled:opacity-40'
const COLS = 'id,order_number,customer_name,customer_phone,fulfillment,address,delivery_fee_cents,requested_for,notes,total_cents,status,payment_method,payment_status,paid_at,created_at,order_items(name_snapshot,quantity,unit_price_cents),order_status_history(status,created_at)'
const pill: Record<string, string> = { new: 'bg-brand-500 text-white', confirmed: 'bg-blue-100 text-blue-800', preparing: 'bg-amber-100 text-amber-900', ready: 'bg-green-100 text-green-800', out_for_delivery: 'bg-purple-100 text-purple-800', completed: 'bg-line text-ink', cancelled: 'bg-red-100 text-red-800' }

export default function Pedidos() {
  const [params] = useSearchParams()
  const [list, setList] = useState<AdminOrder[]>([]); const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('ativos'); const [q, setQ] = useState(params.get('q') ?? '')
  const [selId, setSelId] = useState<string | null>(null); const [msg, setMsg] = useState<Msg>(null); const [busy, setBusy] = useState(false)
  const say = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 5000) }

  const load = useCallback(async () => {
    const r = await sb.from('orders').select(COLS).order('created_at', { ascending: false }).limit(300)
    if (r.error) setMsg({ ok: false, text: 'Não foi possível carregar os pedidos.' })
    setList((r.data ?? []) as unknown as AdminOrder[]); setLoading(false)
  }, [])
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])

  const term = q.trim().toLowerCase().replace(/^#/, ''); const digits = term.replace(/\D/g, '')
  const shown = list.filter(o =>
    (tab === 'todos' || (tab === 'ativos' ? !['completed', 'cancelled'].includes(o.status) : tab === 'concluidos' ? o.status === 'completed' : o.status === 'cancelled')) &&
    (!term || String(o.order_number) === term || o.customer_name.toLowerCase().includes(term) || (digits.length >= 4 && o.customer_phone.includes(digits))))
  const sel = list.find(o => o.id === selId) ?? null
  const count = (t: Tab) => list.filter(o => t === 'ativos' ? !['completed', 'cancelled'].includes(o.status) : t === 'concluidos' ? o.status === 'completed' : o.status === 'cancelled').length

  async function setStatus(o: AdminOrder, status: string) {
    if (busy) return
    setBusy(true)
    const r = await sb.rpc('set_order_status', { p_order: o.id, p_status: status })
    setBusy(false)
    if (r.error) return say(false, r.error.message.length < 120 ? r.error.message : 'Não foi possível mudar o status.')
    say(true, `Pedido #${o.order_number}: ${statusLabel(status, o.fulfillment)}. Use "Avisar cliente" para mandar a mensagem.`); load()
  }
  async function pay(o: AdminOrder) {
    if (!confirm(`Confirmar que o pagamento de ${centsToBRL(o.total_cents)} do pedido #${o.order_number} foi recebido?`)) return
    setBusy(true); const r = await sb.rpc('confirm_payment', { p_order: o.id }); setBusy(false)
    if (r.error) return say(false, 'Não foi possível confirmar o pagamento.')
    say(true, 'Pagamento confirmado!'); load()
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-extrabold">Pedidos</h1><p className="text-muted text-sm">Atualiza sozinho a cada 15 segundos.</p></div>
      <Notice msg={msg} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([['ativos', 'Em andamento'], ['concluidos', 'Concluídos'], ['cancelados', 'Cancelados'], ['todos', 'Todos']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-full px-4 py-2 font-semibold border ${tab === k ? 'bg-brand-500 text-white border-brand-500' : 'bg-card border-line'}`}>{l}{k !== 'todos' ? ` (${count(k)})` : ''}</button>))}
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔎 Buscar por número, nome ou telefone" className="w-full border-2 border-brand-200 rounded-xl p-3 bg-card" />
      {loading ? <Loading /> : (
        <ul className="space-y-2">
          {shown.map(o => (
            <li key={o.id}>
              <button onClick={() => setSelId(o.id)} className="w-full text-left bg-card rounded-2xl shadow-sm p-4 flex items-center gap-3 flex-wrap border border-line">
                <div className="flex-1 min-w-40">
                  <div className="font-extrabold">#{o.order_number} · {o.customer_name}</div>
                  <div className="text-sm text-muted">{o.fulfillment === 'delivery' ? '🛵 Entrega' : '🏪 Retirada'} · {fmtDateTime(o.created_at)}{o.requested_for ? ` · 🎂 ${fmtISO(o.requested_for)}` : ''}</div>
                  <div className="text-xs text-muted">{o.order_items.map(i => `${i.quantity}x ${i.name_snapshot}`).join(', ')}</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="font-extrabold text-brand-700">{centsToBRL(o.total_cents)}</div>
                  <span className={`inline-block text-xs font-bold rounded-full px-3 py-1 ${pill[o.status] ?? 'bg-line'}`}>{statusLabel(o.status, o.fulfillment)}</span>
                  <div className={`text-xs font-semibold ${o.payment_status === 'confirmed' ? 'text-green-600' : 'text-amber-600'}`}>{o.payment_status === 'confirmed' ? '✅ Pago' : o.payment_method === 'pix' ? '⏳ Pix pendente' : '💵 Dinheiro'}</div>
                </div>
              </button>
            </li>))}
          {!shown.length && <li className="text-muted text-center py-10">Nenhum pedido aqui.</li>}
        </ul>)}

      {sel && (
        <Modal title={`Pedido #${sel.order_number}`} onClose={() => setSelId(null)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-bold rounded-full px-3 py-1 ${pill[sel.status] ?? 'bg-line'}`}>{statusLabel(sel.status, sel.fulfillment)}</span>
            <span className="text-sm text-muted">{fmtDateTime(sel.created_at)}</span>
          </div>
          <section className="bg-paper rounded-2xl p-3 space-y-1 text-sm">
            <div className="font-bold text-base">{sel.customer_name}</div>
            <div>📞 {fmtPhone(sel.customer_phone)}</div>
            <div>{sel.fulfillment === 'delivery' ? `🛵 Entrega: ${sel.address ?? ''}` : '🏪 Retirada no local'}</div>
            {sel.requested_for && <div>🎂 Encomenda para {fmtISO(sel.requested_for)}</div>}
            {sel.notes && <div>📝 {sel.notes}</div>}
          </section>
          <section className="space-y-1">
            {sel.order_items.map((i, n) => <div key={n} className="flex justify-between gap-2"><span>{i.quantity}× {i.name_snapshot}</span><span>{centsToBRL(i.unit_price_cents * i.quantity)}</span></div>)}
            {sel.delivery_fee_cents > 0 && <div className="flex justify-between text-muted"><span>Taxa de entrega</span><span>{centsToBRL(sel.delivery_fee_cents)}</span></div>}
            <div className="flex justify-between text-lg font-extrabold border-t pt-2"><span>Total</span><span>{centsToBRL(sel.total_cents)}</span></div>
          </section>
          <section className="bg-paper rounded-2xl p-3 space-y-2">
            <div className="font-bold">Pagamento: {sel.payment_method === 'pix' ? 'Pix' : 'Dinheiro'} — {sel.payment_status === 'confirmed' ? `✅ confirmado${sel.paid_at ? ` em ${fmtDateTime(sel.paid_at)}` : ''}` : '⏳ pendente'}</div>
            {sel.payment_status === 'pending' && sel.status !== 'cancelled' && <button disabled={busy} onClick={() => pay(sel)} className={btn + ' bg-green-600 text-white'}>Confirmar pagamento recebido</button>}
          </section>
          {sel.status !== 'cancelled' && (
            <section className="space-y-2">
              <div className="font-bold">Status do pedido</div>
              <div className="flex gap-2 flex-wrap">
                {nextStatus(sel) && <button disabled={busy} onClick={() => setStatus(sel, nextStatus(sel)!)} className={btn + ' bg-brand-500 text-white'}>Avançar para: {statusLabel(nextStatus(sel)!, sel.fulfillment)}</button>}
                <select value="" disabled={busy} onChange={e => { if (e.target.value) setStatus(sel, e.target.value) }} className="border-2 border-brand-200 rounded-xl px-3 bg-card" aria-label="Escolher outro status">
                  <option value="">Outro status…</option>
                  {FLOW[sel.fulfillment].filter(s => s !== sel.status).map(s => <option key={s} value={s}>{statusLabel(s, sel.fulfillment)}</option>)}
                </select>
                <button disabled={busy} onClick={() => { if (confirm(`Cancelar o pedido #${sel.order_number}? O estoque do dia volta e o pedido não poderá ser reaberto.`)) setStatus(sel, 'cancelled') }} className={btn + ' text-red-600'}>Cancelar pedido</button>
              </div>
            </section>)}
          <a href={waCustomer(sel.customer_phone, statusMessage(sel, sel.status))} target="_blank" rel="noopener noreferrer" className={btn + ' block text-center bg-green-600 text-white'}>📲 Avisar cliente ({statusLabel(sel.status, sel.fulfillment)})</a>
          <section className="text-xs text-muted space-y-1"><div className="font-bold">Histórico</div>
            {[...sel.order_status_history].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((h, n) => <div key={n}>{fmtDateTime(h.created_at)} — {statusLabel(h.status, sel.fulfillment)}</div>)}</section>
        </Modal>)}
    </div>)
}
