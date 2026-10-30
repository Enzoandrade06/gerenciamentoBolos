import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sb } from '../../lib/supabase'
import { centsToBRL } from '../../lib/money'
import { Loading, Notice } from '../../components/ui'
import { fmtDateTime, fmtPhone, waCustomer } from './orderMsg'

type C = { id: string; name: string; phone: string; created_at: string; orders_count: number; total_cents: number; last_order_at: string | null }

export default function Clientes() {
  const nav = useNavigate()
  const [list, setList] = useState<C[]>([]); const [loading, setLoading] = useState(true); const [q, setQ] = useState(''); const [err, setErr] = useState(false)
  useEffect(() => {
    sb.from('customer_stats').select('*').order('last_order_at', { ascending: false, nullsFirst: false }).limit(500)
      .then(r => { if (r.error) setErr(true); setList((r.data ?? []) as C[]); setLoading(false) })
  }, [])
  const term = q.trim().toLowerCase(); const digits = term.replace(/\D/g, '')
  const shown = list.filter(c => !term || c.name.toLowerCase().includes(term) || (digits.length >= 3 && c.phone.includes(digits)))
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-extrabold">Clientes</h1><p className="text-muted text-sm">O cliente é cadastrado automaticamente no primeiro pedido (nome e telefone).</p></div>
      <Notice msg={err ? { ok: false, text: 'Não foi possível carregar os clientes.' } : null} />
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔎 Buscar por nome ou telefone" className="w-full border-2 border-brand-200 rounded-xl p-3 bg-card" />
      {loading ? <Loading /> : (
        <ul className="space-y-2">
          {shown.map(c => (
            <li key={c.id} className="bg-card rounded-2xl shadow-sm p-4 border border-line flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-44">
                <div className="font-extrabold">{c.name}</div>
                <div className="text-sm text-muted">{fmtPhone(c.phone)}</div>
                <div className="text-xs text-muted">{c.orders_count} pedido(s) · {centsToBRL(c.total_cents)}{c.last_order_at ? ` · último em ${fmtDateTime(c.last_order_at)}` : ''}</div>
              </div>
              <a href={waCustomer(c.phone, `Olá, ${c.name.split(' ')[0]}! 🍰`)} target="_blank" rel="noopener noreferrer" className="rounded-xl px-4 py-2 font-bold bg-green-600 text-white">📲 WhatsApp</a>
              <button onClick={() => nav(`/admin/pedidos?q=${encodeURIComponent(c.phone)}`)} className="rounded-xl px-4 py-2 font-bold border-2 border-brand-300 text-brand-700">Ver pedidos</button>
            </li>))}
          {!shown.length && <li className="text-muted text-center py-10">Nenhum cliente ainda.</li>}
        </ul>)}
    </div>)
}
