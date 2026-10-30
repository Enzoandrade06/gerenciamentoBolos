import { useCallback, useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { brToday } from '../../lib/money'
import { Loading, Notice } from '../../components/ui'

type P = { id: string; name: string; is_active: boolean; is_available: boolean; stock_qty: number | null; stock_date: string | null; categories: { name: string } | null }
type Msg = { ok: boolean; text: string } | null
const btn = 'rounded-lg px-4 py-2 font-semibold active:scale-95 disabled:opacity-40'

export default function Abastecimento() {
  const [list, setList] = useState<P[]>([]); const [loading, setLoading] = useState(true)
  const [vals, setVals] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<Msg>(null)
  const today = brToday()
  const say = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 5000) }
  const load = useCallback(async () => {
    const r = await sb.from('products').select('id,name,is_active,is_available,stock_qty,stock_date,categories(name)').eq('kind', 'stock').order('sort_order').order('name')
    if (r.error) setMsg({ ok: false, text: 'Não foi possível carregar os produtos.' })
    setList((r.data ?? []) as unknown as P[]); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const now = (p: P) => (p.stock_date === today ? p.stock_qty ?? 0 : 0)
  const dirty = list.filter(p => vals[p.id] !== undefined && vals[p.id] !== '')
  async function save(zero = false) {
    const rows = zero ? list : dirty
    if (!rows.length) return say(false, 'Digite a quantidade de pelo menos um produto.')
    if (zero && !confirm('Zerar o estoque de hoje de todos os produtos de pronta entrega?')) return
    setBusy(true); let fail = 0
    for (const p of rows) {
      const n = zero ? 0 : Math.min(9999, Math.max(0, Math.floor(Number(vals[p.id]))))
      if (!Number.isFinite(n)) { fail++; continue }
      const r = await sb.from('products').update({ stock_qty: n, stock_date: today }).eq('id', p.id)
      if (r.error) fail++
    }
    setBusy(false); setVals({}); load()
    say(!fail, fail ? `${fail} produto(s) não foram salvos.` : zero ? 'Estoque de hoje zerado.' : 'Estoque de hoje salvo!')
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-extrabold">Abastecimento do dia</h1>
        <p className="text-muted text-sm">Digite quantos de cada produto de <b>pronta entrega</b> estão disponíveis <b>agora</b>. Pedidos já feitos hoje já foram descontados. No dia seguinte o estoque volta a zero.</p></div>
      <Notice msg={msg} />
      {loading ? <Loading /> : (
        <div className="bg-card rounded-2xl shadow-sm divide-y">
          {list.map(p => (
            <div key={p.id} className="p-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-40">
                <div className="font-bold">{p.name}</div>
                <div className="text-xs text-muted">{p.categories?.name ?? '—'}{!p.is_active ? ' · rascunho' : ''}{!p.is_available ? ' · esgotado (manual)' : ''}</div>
                <div className={`text-sm font-semibold ${now(p) > 0 ? 'text-green-700' : 'text-muted'}`}>{p.stock_date === today ? `Restam ${p.stock_qty ?? 0} hoje` : 'Sem estoque lançado hoje'}</div>
              </div>
              <label className="flex items-center gap-2"><span className="text-sm text-muted">Disponível agora</span>
                <input type="number" min={0} max={9999} inputMode="numeric" value={vals[p.id] ?? ''} placeholder={String(now(p))} onChange={e => setVals({ ...vals, [p.id]: e.target.value })} className="w-24 border-2 border-brand-200 rounded-xl p-2 text-center text-lg" /></label>
            </div>))}
          {!list.length && <div className="p-8 text-center text-muted">Nenhum produto de pronta entrega. Cadastre em Produtos (tipo "Pronta entrega").</div>}
        </div>)}
      {list.length > 0 && <div className="flex gap-2 flex-wrap">
        <button disabled={busy} onClick={() => save(false)} className={btn + ' bg-paper0 text-white'}>{busy ? 'Salvando…' : 'Salvar estoque de hoje'}</button>
        <button disabled={busy} onClick={() => save(true)} className={btn + ' bg-line text-ink'}>Zerar tudo</button></div>}
    </div>)
}
