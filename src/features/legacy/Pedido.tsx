import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
type Fl = { id: number; name: string; available: number }
type Stock = { open: boolean; contact?: string; flavors?: Fl[] }
const mask = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 11); return d.length <= 2 ? d : d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d.length <= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` }
const field = 'w-full text-lg p-3 rounded-xl border-2 border-orange-200 bg-white focus:border-orange-400 outline-none'

export default function Pedido() {
  const [stock, setStock] = useState<Stock | null>(null); const [q, setQ] = useState<Record<number, number>>({})
  const [modal, setModal] = useState(false); const [form, setForm] = useState({ name: '', sector: '', phone: '' })
  const [sectors, setSectors] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [done, setDone] = useState<{ url: string | null } | null>(null)

  const load = async () => { const r = await sb.rpc('public_stock'); if (r.data) setStock(r.data) }
  useEffect(() => { load(); const t = setInterval(() => { if (!modal) load() }, 20000); return () => clearInterval(t) }, [modal])
  useEffect(() => {
    sb.rpc('list_sectors').then(r => setSectors(r.data ?? []))
    try { const s = localStorage.getItem('pedido-dados'); if (s) setForm(JSON.parse(s)) } catch { /* ignora */ }
  }, [])

  const flavors = stock?.flavors ?? []
  const items = flavors.map(f => ({ ...f, qty: Math.min(q[f.id] ?? 0, f.available) })).filter(i => i.qty > 0)
  const total = items.reduce((a, i) => a + i.qty, 0)
  const set = (f: Fl, n: number) => setQ(p => ({ ...p, [f.id]: Math.max(0, Math.min(f.available, n)) }))

  async function confirm() {
    if (busy) return
    setBusy(true); setErr('')
    const r = await sb.rpc('create_reservation', { p_name: form.name, p_sector: form.sector, p_phone: form.phone, p_items: items.map(i => ({ flavor_id: i.id, quantity: i.qty })) })
    setBusy(false)
    if (r.error) { setErr(r.error.message); load(); return }
    try { localStorage.setItem('pedido-dados', JSON.stringify(form)) } catch { /* ignora */ }
    const c = String(r.data.contact ?? '').replace(/\D/g, '')
    const msg = `Olá! Reservei ${total} ${total === 1 ? 'bolo' : 'bolos'} dos sabores:\n\n${items.map(i => `${i.qty} ${i.name}`).join('\n')}\n\nFico no aguardo da entrega!\n— ${form.name.trim()} (${form.sector.trim()})`
    const url = c.length >= 10 ? `https://wa.me/${c.length <= 11 ? '55' + c : c}?text=${encodeURIComponent(msg)}` : null
    setModal(false); setQ({}); setDone({ url }); load()
    if (url) setTimeout(() => { window.location.href = url }, 1500)
  }

  const shell = 'min-h-screen bg-orange-50 text-slate-800'
  if (done) return (
    <div className={shell + ' flex items-center justify-center p-6'}>
      <div className="bg-white rounded-3xl shadow p-8 max-w-md w-full text-center space-y-4">
        <div className="text-6xl">✅</div>
        <h1 className="text-2xl font-extrabold text-green-700">Reserva registrada!</h1>
        {done.url
          ? <><p>Abrindo o WhatsApp para você enviar a mensagem…</p><a href={done.url} className="block bg-green-600 text-white font-bold text-lg rounded-2xl py-4">Abrir WhatsApp</a></>
          : <p>Avise a Faby que você fez o pedido. Obrigado! 🍰</p>}
        <button onClick={() => setDone(null)} className="text-slate-500 underline">Fazer outro pedido</button>
      </div>
    </div>)

  return (
    <div className={shell + ' pb-32'}>
      <header className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 py-6 text-center shadow">
        <h1 className="text-2xl font-extrabold">🍰 Caseirinhos da Faby</h1>
        <p className="opacity-90">Reserve seus bolos de pote</p>
      </header>
      <main className="max-w-2xl mx-auto p-4">
        {!stock && <p className="text-center text-slate-500 mt-10">Carregando…</p>}
        {stock && !stock.open && (
          <div className="bg-white rounded-3xl shadow p-8 text-center mt-6 space-y-2">
            <div className="text-5xl">😴</div><h2 className="text-xl font-bold">Pedidos fechados no momento</h2>
            <p className="text-slate-500">A Faby avisa no status quando abrir.</p>
            <button onClick={load} className="mt-2 text-orange-600 font-semibold underline">Atualizar</button>
          </div>)}
        {stock?.open && <>
          <p className="text-slate-600 mb-3">Escolha a quantidade de cada sabor:</p>
          <div className="grid grid-cols-2 gap-3">
            {flavors.map(f => { const n = q[f.id] ?? 0; const out = f.available <= 0; return (
              <div key={f.id} className={`rounded-2xl border-2 p-3 text-center shadow-sm transition ${out ? 'bg-slate-100 border-slate-200 opacity-60' : n > 0 ? 'bg-orange-500 border-orange-600 text-white' : 'bg-white border-orange-200'}`}>
                <div className="text-lg font-extrabold">{f.name}</div>
                <div className={`text-sm mb-2 ${n > 0 ? 'text-orange-100' : 'text-slate-500'}`}>{out ? 'Esgotado' : `${f.available} ${f.available === 1 ? 'disponível' : 'disponíveis'}`}</div>
                <div className="flex items-center justify-center gap-3">
                  <button disabled={out || n === 0} onClick={() => set(f, n - 1)} className="w-11 h-11 rounded-full bg-orange-100 text-orange-800 text-2xl font-bold disabled:opacity-40 active:scale-95">−</button>
                  <span className="text-2xl font-extrabold w-8">{n}</span>
                  <button disabled={out || n >= f.available} onClick={() => set(f, n + 1)} className="w-11 h-11 rounded-full bg-orange-100 text-orange-800 text-2xl font-bold disabled:opacity-40 active:scale-95">+</button>
                </div>
              </div>) })}
          </div>
        </>}
      </main>
      {stock?.open && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg p-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <button disabled={!total} onClick={() => { setErr(''); setModal(true) }} className="max-w-2xl mx-auto block w-full bg-green-600 disabled:bg-slate-300 text-white font-extrabold text-xl rounded-2xl py-4 active:scale-95">
            {total ? `Finalizar pedido (${total} ${total === 1 ? 'bolo' : 'bolos'})` : 'Escolha seus bolos'}
          </button>
        </div>)}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setModal(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-3 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold">Confirmar solicitação</h2>
            <div className="bg-orange-50 rounded-xl p-3 text-sm">{items.map(i => <div key={i.id}>{i.qty}× {i.name}</div>)}</div>
            <input className={field} placeholder="Nome completo" maxLength={120} autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className={field} placeholder="Setor" list="setores" maxLength={60} value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} />
            <datalist id="setores">{sectors.map(x => <option key={x} value={x} />)}</datalist>
            <input className={field} placeholder="Telefone com DDD" inputMode="tel" value={mask(form.phone)} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} />
            {err && <p className="text-red-600 font-semibold">⚠️ {err}</p>}
            <button disabled={busy} onClick={confirm} className="w-full bg-green-600 text-white font-extrabold text-lg rounded-2xl py-4 active:scale-95">{busy ? 'Enviando…' : 'Confirmar solicitação'}</button>
            <button onClick={() => setModal(false)} className="w-full text-slate-500 py-2">Voltar</button>
          </div>
        </div>)}
    </div>)
}
