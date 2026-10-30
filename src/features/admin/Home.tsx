import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sb } from '../../lib/supabase'
import { brToday, centsToBRL } from '../../lib/money'
import { Loading } from '../../components/ui'

type Row = { total_cents: number; status: string; payment_status: string; created_at: string }
type Stats = { novos: number; andamento: number; concluidos: number; ativos: number; indisp: number; hoje: number; fatHoje: number; fatMes: number; recebidoMes: number; aReceber: number }
const head = (t: string) => sb.from(t).select('id', { count: 'exact', head: true })

export default function Home() {
  const [s, setS] = useState<Stats | null>(null); const [err, setErr] = useState(false)
  useEffect(() => {
    const today = brToday(); const monthStart = `${today.slice(0, 8)}01T00:00:00-03:00`
    Promise.all([
      head('orders').eq('status', 'new'),
      head('orders').in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery']),
      head('orders').eq('status', 'completed'),
      head('products').eq('is_active', true),
      head('products').eq('is_active', true).eq('is_available', false),
      sb.from('orders').select('total_cents,status,payment_status,created_at').gte('created_at', monthStart).limit(2000),
    ]).then(([n, a, c, p, i, m]) => {
      if (n.error || a.error || c.error || p.error || i.error || m.error) { setErr(true); return }
      const rows = ((m.data ?? []) as Row[]).filter(r => r.status !== 'cancelled')
      const isToday = (r: Row) => new Date(r.created_at).toLocaleDateString('sv', { timeZone: 'America/Sao_Paulo' }) === today
      const sum = (l: Row[]) => l.reduce((x, r) => x + r.total_cents, 0)
      setS({ novos: n.count ?? 0, andamento: a.count ?? 0, concluidos: c.count ?? 0, ativos: p.count ?? 0, indisp: i.count ?? 0,
        hoje: rows.filter(isToday).length, fatHoje: sum(rows.filter(isToday)), fatMes: sum(rows), recebidoMes: sum(rows.filter(r => r.payment_status === 'confirmed')), aReceber: sum(rows.filter(r => r.payment_status === 'pending')) })
    })
  }, [])
  const card = 'bg-card rounded-2xl shadow-sm p-4 border border-line'
  const Stat = ({ label, value, hot, to }: { label: string; value: string | number; hot?: boolean; to?: string }) => {
    const inner = <><div className="text-sm text-muted">{label}</div><div className={`text-2xl font-extrabold ${hot ? 'text-brand-600' : ''}`}>{value}</div></>
    return to ? <Link to={to} className={card + ' block hover:ring-2 ring-brand-300'}>{inner}</Link> : <div className={card}>{inner}</div>
  }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Painel</h1>
      {err && <p className="rounded-xl bg-red-100 text-red-800 px-4 py-3 font-semibold">Não foi possível carregar os números.</p>}
      {!s && !err ? <Loading /> : s && <>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Pedidos novos" value={s.novos} hot={s.novos > 0} to="/admin/pedidos" />
          <Stat label="Em andamento" value={s.andamento} to="/admin/pedidos" />
          <Stat label="Concluídos" value={s.concluidos} />
          <Stat label="Pedidos hoje" value={s.hoje} />
          <Stat label="Produtos ativos" value={s.ativos} to="/admin/produtos" />
          <Stat label="Indisponíveis" value={s.indisp} to="/admin/produtos" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Vendido hoje" value={centsToBRL(s.fatHoje)} />
          <Stat label="Vendido no mês" value={centsToBRL(s.fatMes)} />
          <Stat label="Recebido no mês" value={centsToBRL(s.recebidoMes)} />
          <Stat label="A receber (mês)" value={centsToBRL(s.aReceber)} hot={s.aReceber > 0} />
        </div>
      </>}
      <div className="grid gap-3 sm:grid-cols-3">
        {[['/admin/pedidos', '🧾', 'Pedidos'], ['/admin/produtos', '📦', 'Produtos'], ['/admin/abastecimento', '📋', 'Abastecimento'], ['/admin/categorias', '🗂️', 'Categorias'], ['/admin/clientes', '👥', 'Clientes'], ['/admin/configuracoes', '⚙️', 'Configurações']].map(([to, i, t]) => (
          <Link key={to} to={to} className={card + ' hover:ring-2 ring-brand-300 flex items-center gap-3'}><span className="text-2xl">{i}</span><b>{t}</b></Link>))}
      </div>
      <p className="text-sm text-muted">O sistema antigo dos funcionários continua em <Link to="/admin/quiosque" className="underline">Quiosque</Link>.</p>
    </div>)
}
