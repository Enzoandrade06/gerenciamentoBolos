import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { sb } from '../../lib/supabase'
import { centsToBRL } from '../../lib/money'
import { fmtISO } from '../../lib/date'
import { orderMessage, waLink, type PublicOrder } from '../../lib/whatsapp'
import { Loading } from '../../components/ui'

const LABEL: Record<string, string> = { new: 'Pedido recebido', confirmed: 'Confirmado', preparing: 'Em preparação', ready: 'Pronto', out_for_delivery: 'Saiu para entrega', completed: 'Concluído', cancelled: 'Cancelado' }

export default function OrderPage() {
  const { token = '' } = useParams(); const loc = useLocation()
  const [o, setO] = useState<PublicOrder | null | undefined>(undefined); const [copied, setCopied] = useState(false)
  const load = useCallback(async () => { const r = await sb.rpc('get_order_public', { p_token: token }); setO(r.error ? null : (r.data as PublicOrder | null)) }, [token])
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t) }, [load])

  const fresh = (loc.state as { fresh?: boolean } | null)?.fresh === true
  const link = o?.whatsapp ? waLink(o.whatsapp, orderMessage(o)) : null
  useEffect(() => {   // logo após o pedido, abre o WhatsApp com a mensagem pronta (uma vez só)
    if (!fresh || !link) return
    const t = setTimeout(() => {
      const k = `wa-sent-${token}`
      try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1') } catch { /* ignora */ }
      window.location.href = link
    }, 2500)
    return () => clearTimeout(t)
  }, [fresh, link, token])

  if (o === undefined) return <Loading text="Carregando o pedido…" />
  if (o === null) return <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center gap-3 p-6 text-center"><div className="text-5xl">🔍</div><p>Pedido não encontrado.</p><Link to="/" className="text-orange-600 underline">Voltar ao cardápio</Link></div>

  const status = o.status === 'ready' ? (o.fulfillment === 'delivery' ? 'Pronto para entrega' : 'Pronto para retirada') : LABEL[o.status] ?? o.status
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text) } catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove() }
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }
  const card = 'bg-white rounded-2xl p-4 shadow-sm space-y-2'
  return (
    <div className="min-h-screen bg-orange-50 text-slate-800 pb-16">
      <header className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 py-6 text-center shadow">
        <div className="text-4xl">{o.status === 'cancelled' ? '❌' : '✅'}</div>
        <h1 className="text-2xl font-extrabold">Pedido #{o.order_number}</h1>
        <p className="font-semibold opacity-95">{status}</p>
      </header>
      <main className="max-w-xl mx-auto p-4 space-y-4">
        {fresh && link && <div role="status" className="rounded-xl bg-green-100 text-green-900 px-4 py-3 text-sm font-semibold">Pedido registrado! Abrindo o WhatsApp para você enviar a confirmação…</div>}
        {link && <a href={link} className="block text-center bg-green-600 text-white font-extrabold text-lg rounded-2xl py-4 active:scale-95">💬 Enviar pedido pelo WhatsApp</a>}
        {!link && <p className="text-sm text-slate-600 bg-white rounded-xl p-3">Guarde o número do pedido (#{o.order_number}) e avise a loja.</p>}
        {o.payment_method === 'pix' && o.payment_status === 'confirmed' && <div className="rounded-xl bg-green-100 text-green-900 px-4 py-3 font-bold">✅ Pagamento confirmado</div>}
        {o.pix && (
          <section className={card}><h2 className="font-extrabold">Pagamento via Pix</h2>
            <div className="text-2xl font-extrabold text-orange-600">{centsToBRL(o.total_cents)}</div>
            {o.pix.key ? <>
              <div className="bg-orange-50 rounded-xl p-3 break-all font-mono text-sm">{o.pix.key}</div>
              <button onClick={() => copy(o.pix!.key!)} className="w-full bg-orange-500 text-white font-bold rounded-xl py-3 active:scale-95">{copied ? 'Chave copiada ✅' : 'Copiar chave Pix'}</button>
              <div className="text-sm text-slate-600">{[o.pix.receiver && `Recebedor: ${o.pix.receiver}`, o.pix.bank && `Instituição: ${o.pix.bank}`].filter(Boolean).join(' · ')}</div>
              {o.pix.instructions && <p className="text-sm whitespace-pre-line">{o.pix.instructions}</p>}
              {o.pix.link && /^https:\/\//.test(o.pix.link) && <a href={o.pix.link} target="_blank" rel="noopener noreferrer" className="block text-center border-2 border-orange-400 text-orange-700 font-bold rounded-xl py-3">Abrir pagamento</a>}
            </> : <p className="text-sm text-slate-600">A loja ainda não cadastrou a chave Pix. Combine o pagamento pelo WhatsApp.</p>}
            <p className="text-xs text-slate-500">O pagamento ainda precisa ser confirmado pela loja. Enviar o comprovante pelo WhatsApp ajuda.</p>
          </section>)}
        {o.payment_method === 'cash' && <div className={card}><b>Pagamento em dinheiro</b> na {o.fulfillment === 'delivery' ? 'entrega' : 'retirada'}: {centsToBRL(o.total_cents)}.</div>}
        <section className={card}><h2 className="font-extrabold">Itens</h2>
          {o.items.map((i, n) => <div key={n} className="flex justify-between gap-2"><span>{i.quantity}× {i.name}</span><span>{centsToBRL(i.unit_price_cents * i.quantity)}</span></div>)}
          {o.delivery_fee_cents > 0 && <div className="flex justify-between"><span>Taxa de entrega</span><span>{centsToBRL(o.delivery_fee_cents)}</span></div>}
          <div className="flex justify-between text-lg font-extrabold border-t pt-2"><span>Total</span><span>{centsToBRL(o.total_cents)}</span></div>
        </section>
        <section className={card + ' text-sm'}>
          <div><b>{o.fulfillment === 'delivery' ? 'Entrega' : 'Retirada no local'}</b>{o.address ? `: ${o.address}` : ''}</div>
          {o.requested_for && <div><b>Data da encomenda:</b> {fmtISO(o.requested_for)}</div>}
          {o.notes && <div><b>Observações:</b> {o.notes}</div>}
        </section>
        <Link to="/" className="block text-center text-orange-700 underline">Voltar ao cardápio</Link>
      </main>
    </div>)
}
