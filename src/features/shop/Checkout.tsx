import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sb } from '../../lib/supabase'
import { fetchCatalog, type Catalog } from '../../lib/catalog'
import { addDaysISO } from '../../lib/date'
import { brToday, centsToBRL } from '../../lib/money'
import { clean } from '../../lib/text'
import { Loading } from '../../components/ui'
import { useCart } from './CartContext'
import { CartList, NoteField } from './CartList'
import { composeNotes } from './cartLogic'

const SAVED = 'checkout-v1'
const field = 'w-full border-2 border-orange-200 rounded-xl p-3 bg-white'
const mask = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 11); return d.length <= 2 ? d : d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d.length <= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` }

export default function Checkout() {
  const nav = useNavigate(); const cart = useCart()
  const [cat, setCat] = useState<Catalog | null>(null); const [loadErr, setLoadErr] = useState(false)
  const [f, setF] = useState({ name: '', phone: '', fulfillment: 'pickup' as 'pickup' | 'delivery', address: '', date: '', payment: 'pix' as 'pix' | 'cash' })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [info, setInfo] = useState('')
  const key = useRef(crypto.randomUUID())   // o mesmo envio repetido não duplica o pedido

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(SAVED) ?? '{}'); setF(x => ({ ...x, name: String(s.name ?? '').slice(0, 120), phone: String(s.phone ?? '').replace(/\D/g, '').slice(0, 11), address: String(s.address ?? '').slice(0, 250) })) } catch { /* ignora */ }
    fetchCatalog().then(c => {
      setCat(c)
      const byId = new Map(c.products.map(p => [p.id, p]))
      let changed = false
      const next = cart.items.map(i => { const p = byId.get(i.id); if (p && (p.price_cents !== i.priceCents || p.name !== i.name)) { changed = true; return { ...i, priceCents: p.price_cents, name: p.name, image: p.image, kind: p.kind } } return i })
      if (changed) { cart.replace(next); setInfo('Alguns preços ou nomes foram atualizados.') }
    }).catch(() => setLoadErr(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (cart.items.length === 0) return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center gap-3 p-6 text-center"><div className="text-5xl">🛒</div><p>Seu carrinho está vazio.</p><Link to="/" className="bg-orange-500 text-white font-bold rounded-xl px-5 py-3">Ver o cardápio</Link></div>)
  if (!cat) return loadErr
    ? <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center gap-3 p-6 text-center"><p>Não foi possível conferir a disponibilidade. Verifique a conexão.</p><button onClick={() => location.reload()} className="bg-orange-500 text-white font-bold rounded-xl px-5 py-3">Tentar de novo</button></div>
    : <Loading text="Conferindo os produtos…" />

  const byId = new Map(cat.products.map(p => [p.id, p]))
  const bad = cart.items.filter(i => { const p = byId.get(i.id); return !p || p.sold_out }).map(i => i.id)
  const hasCustom = cart.items.some(i => i.kind === 'order')
  const minDate = addDaysISO(brToday(), cat.store.min_days_custom)
  const fee = f.fulfillment === 'delivery' ? cat.store.delivery_fee_cents : 0
  const total = cart.subtotal + fee
  const set = (v: Partial<typeof f>) => setF(x => ({ ...x, ...v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const name = clean(f.name); const address = clean(f.address); const notes = composeNotes(cart.items, cart.note)
    const e1 = !cat!.store.is_open ? 'A loja está fechada no momento.'
      : bad.length ? 'Remova do carrinho os itens indisponíveis para continuar.'
      : name.length < 3 ? 'Informe o seu nome.'
      : f.phone.replace(/\D/g, '').length < 10 ? 'Informe o telefone com DDD.'
      : f.fulfillment === 'delivery' && address.length < 8 ? 'Informe o endereço completo para a entrega.'
      : hasCustom && (!f.date || f.date < minDate) ? `Escolha a data da encomenda (a partir de ${minDate.split('-').reverse().join('/')}).`
      : notes.length > 500 ? 'As observações passaram de 500 caracteres. Reduza um pouco.' : ''
    if (e1) return setErr(e1)
    setBusy(true); setErr('')
    const r = await sb.rpc('create_order', {
      p_items: cart.items.map(i => ({ product_id: i.id, quantity: i.qty })), p_name: name, p_phone: f.phone, p_fulfillment: f.fulfillment,
      p_address: f.fulfillment === 'delivery' ? address : null, p_requested_for: hasCustom ? f.date : null, p_notes: notes || null,
      p_payment_method: f.payment, p_idempotency_key: key.current,
    })
    setBusy(false)
    if (r.error || !r.data) {
      fetchCatalog().then(setCat).catch(() => {})
      return setErr(r.error?.message && r.error.message.length < 160 ? r.error.message : 'Não foi possível enviar o pedido. Tente novamente.')
    }
    try { localStorage.setItem(SAVED, JSON.stringify({ name, phone: f.phone, address })) } catch { /* ignora */ }
    const token = (r.data as { public_token: string }).public_token
    cart.clear(); key.current = crypto.randomUUID()
    nav(`/pedido/${token}`, { replace: true, state: { fresh: true } })
  }

  return (
    <div className="min-h-screen bg-orange-50 text-slate-800">
      <header className="bg-white border-b border-orange-100 px-4 py-3 flex items-center gap-3">
        <Link to="/" aria-label="Voltar" className="text-2xl px-2">←</Link><h1 className="text-lg font-extrabold">Finalizar pedido</h1>
      </header>
      <form onSubmit={submit} className="max-w-xl mx-auto p-4 space-y-5 pb-16">
        {info && <div role="status" className="rounded-xl bg-amber-100 text-amber-900 px-4 py-3 text-sm font-semibold">{info}</div>}
        {!cat.store.is_open && <div role="alert" className="rounded-xl bg-red-100 text-red-800 px-4 py-3 text-sm font-semibold">A loja está fechada no momento.</div>}
        <section className="bg-white rounded-2xl p-4 space-y-3 shadow-sm"><h2 className="font-extrabold">Seu pedido</h2>
          <CartList unavailable={bad} />
          <NoteField />
        </section>
        <section className="bg-white rounded-2xl p-4 space-y-3 shadow-sm"><h2 className="font-extrabold">Seus dados</h2>
          <input className={field} placeholder="Nome completo" autoComplete="name" maxLength={120} value={f.name} onChange={e => set({ name: e.target.value })} required />
          <input className={field} placeholder="Telefone com DDD" inputMode="tel" autoComplete="tel" value={mask(f.phone)} onChange={e => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} required />
        </section>
        <section className="bg-white rounded-2xl p-4 space-y-3 shadow-sm"><h2 className="font-extrabold">Retirada ou entrega</h2>
          <label className="flex items-center gap-2"><input type="radio" className="accent-orange-500 w-5 h-5" checked={f.fulfillment === 'pickup'} onChange={() => set({ fulfillment: 'pickup' })} /> Retirar no local</label>
          {cat.store.delivery_enabled && <label className="flex items-center gap-2"><input type="radio" className="accent-orange-500 w-5 h-5" checked={f.fulfillment === 'delivery'} onChange={() => set({ fulfillment: 'delivery' })} /> Entrega{cat.store.delivery_fee_cents > 0 ? ` (+ ${centsToBRL(cat.store.delivery_fee_cents)})` : ''}</label>}
          {f.fulfillment === 'delivery' && <textarea className={field} rows={2} maxLength={250} placeholder="Endereço completo (rua, número, bairro, referência)" value={f.address} onChange={e => set({ address: e.target.value })} />}
          {hasCustom && <label className="block"><span className="font-semibold">Data da encomenda</span>
            <input type="date" className={field} min={minDate} value={f.date} onChange={e => set({ date: e.target.value })} required />
            <span className="text-xs text-slate-500">Encomendas precisam de pelo menos {cat.store.min_days_custom} dia(s) de antecedência.</span></label>}
        </section>
        <section className="bg-white rounded-2xl p-4 space-y-2 shadow-sm"><h2 className="font-extrabold">Pagamento</h2>
          <label className="flex items-center gap-2"><input type="radio" className="accent-orange-500 w-5 h-5" checked={f.payment === 'pix'} onChange={() => set({ payment: 'pix' })} /> Pix (os dados aparecem depois de confirmar)</label>
          <label className="flex items-center gap-2"><input type="radio" className="accent-orange-500 w-5 h-5" checked={f.payment === 'cash'} onChange={() => set({ payment: 'cash' })} /> Dinheiro na {f.fulfillment === 'delivery' ? 'entrega' : 'retirada'}</label>
        </section>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>{centsToBRL(cart.subtotal)}</span></div>
          {fee > 0 && <div className="flex justify-between"><span>Taxa de entrega</span><span>{centsToBRL(fee)}</span></div>}
          <div className="flex justify-between text-xl font-extrabold"><span>Total</span><span>{centsToBRL(total)}</span></div>
        </div>
        {err && <p role="alert" className="text-red-700 bg-red-100 rounded-xl px-4 py-3 font-semibold">{err}</p>}
        <button disabled={busy || !cat.store.is_open} className="w-full bg-green-600 disabled:bg-slate-300 text-white font-extrabold text-lg rounded-2xl py-4 active:scale-95">{busy ? 'Enviando…' : 'Confirmar pedido'}</button>
      </form>
    </div>)
}
