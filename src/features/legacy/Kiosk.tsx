import { useEffect, useState } from 'react'
import { sb, brl, plural } from '../../lib/supabase'
type Emp = { id: string; full_name: string; sector: string }
type Fl = { id: number; name: string }
type Sum = { open_qty: number; open_amount: number; price: number }
const btn = 'rounded-2xl font-bold active:scale-95 transition shadow'
const field = 'text-2xl p-4 rounded-2xl border-2 border-brand-300 bg-card'
const mask = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 11); return d.length <= 2 ? d : d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d.length <= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` }

export default function Kiosk() {
  const [step, setStep] = useState<'name' | 'signup' | 'flavor' | 'qty' | 'done'>('name')
  const [q, setQ] = useState(''); const [list, setList] = useState<Emp[]>([])
  const [emp, setEmp] = useState<Emp>(); const [flavors, setFlavors] = useState<Fl[]>([])
  const [fl, setFl] = useState<Fl>(); const [qty, setQty] = useState(1)
  const [sum, setSum] = useState<Sum>(); const [res, setRes] = useState<Sum>()
  const [form, setForm] = useState({ name: '', sector: '', phone: '' }); const [sectors, setSectors] = useState<string[]>([])
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)

  const reset = () => { setStep('name'); setQ(''); setList([]); setEmp(undefined); setFl(undefined); setQty(1); setSum(undefined); setErr(''); setBusy(false); setForm({ name: '', sector: '', phone: '' }) }

  useEffect(() => { sb.rpc('list_sectors').then(r => setSectors(r.data ?? [])) }, [])
  useEffect(() => { sb.from('flavors').select('id,name').order('id').then(r => setFlavors(r.data ?? [])) }, [])
  useEffect(() => {
    if (q.trim().length < 2) { setList([]); return }
    const t = setTimeout(async () => { const r = await sb.rpc('search_employees', { q: q.trim() }); setList(r.data ?? []) }, 200)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => { if (emp) sb.rpc('get_summary', { p_employee: emp.id }).then(r => setSum(r.data)) }, [emp])
  useEffect(() => { // volta sozinho se ninguém terminar
    if (step === 'name') return
    const t = setTimeout(reset, step === 'done' ? 5000 : step === 'signup' ? 120000 : 45000)
    return () => clearTimeout(t)
  }, [step, qty, emp, form])

  async function signup() {
    if (busy) return
    setBusy(true); setErr('')
    const r = await sb.rpc('register_employee', { p_name: form.name, p_sector: form.sector, p_phone: form.phone })
    setBusy(false)
    if (r.error) { setErr(r.error.message); return }
    setEmp({ id: r.data.id, full_name: r.data.full_name, sector: r.data.sector }); setStep('flavor')
  }

  async function confirm() {
    if (!emp || !fl || busy) return
    setBusy(true); setErr('')
    const r = await sb.rpc('register_withdrawal', { p_employee: emp.id, p_flavor: fl.id, p_qty: qty })
    if (r.error) { setErr(r.error.message); setBusy(false); return }
    setRes(r.data); setStep('done')
  }

  const wrap = 'select-none min-h-screen p-5 flex flex-col gap-4 max-w-xl mx-auto text-ink'
  if (step === 'done' && emp && res) return (
    <div className={wrap + ' justify-center text-center'}>
      <div className="text-7xl">✅</div>
      <h1 className="text-3xl font-extrabold text-green-700">Retirada registrada!</h1>
      <p className="text-2xl">{emp.full_name}</p>
      <p className="text-xl">Retirou agora: <b>{plural(qty)}</b> de {fl?.name}</p>
      <p className="text-xl">Total em aberto: <b>{plural(res.open_qty)}</b> — <b>{brl(res.open_amount)}</b></p>
      <p className="text-2xl mt-4">Obrigado! 🍰</p>
      <button onClick={reset} className={btn + ' bg-paper0 text-white text-xl py-4'}>OK</button>
    </div>)

  return (
    <div className={wrap}>
      <h1 className="text-3xl font-extrabold text-brand-600 text-center">🍰 BOLOS DE POTE</h1>
      {step === 'name' && <>
        <p className="text-2xl font-semibold">Quem está retirando?</p>
        <input autoFocus value={q} onChange={e => setQ(e.target.value.slice(0, 60))} placeholder="Digite seu nome…" className="text-2xl p-4 rounded-2xl border-2 border-brand-300 bg-card" />
        {list.map(e => (
          <button key={e.id} onClick={() => { setEmp(e); setStep('flavor') }} className={btn + ' bg-card p-4 text-left text-2xl'}>
            {e.full_name}<div className="text-base font-normal text-muted">{e.sector}</div>
          </button>))}
        {q.trim().length >= 2 && list.length === 0 && <p className="text-lg text-muted">Nenhum nome encontrado.</p>}
        <button onClick={() => { setErr(''); setStep('signup') }} className={btn + ' bg-card border-2 border-brand-400 text-brand-600 text-xl py-4'}>➕ Cadastrar-se</button>
      </>}
      {step === 'signup' && <>
        <p className="text-2xl font-semibold">Cadastro rápido</p>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" maxLength={120} autoComplete="off" className={field} />
        <input list="setores" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} placeholder="Setor" maxLength={60} autoComplete="off" className={field} />
        <datalist id="setores">{sectors.map(x => <option key={x} value={x} />)}</datalist>
        <input inputMode="tel" value={mask(form.phone)} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="WhatsApp com DDD" className={field} />
        {err && <p className="text-red-600 text-lg font-semibold">⚠️ {err}</p>}
        <button disabled={busy} onClick={signup} className={btn + ' bg-green-600 text-white text-2xl py-6'}>{busy ? 'Cadastrando…' : 'CADASTRAR E CONTINUAR'}</button>
        <button onClick={() => { setErr(''); setStep('name') }} className="text-muted text-lg py-2">← Voltar</button>
      </>}
      {step === 'flavor' && <>
        <p className="text-2xl font-semibold">{emp?.full_name}, qual sabor?</p>
        <div className="grid grid-cols-2 gap-3">
          {flavors.map(f => <button key={f.id} onClick={() => { setFl(f); setStep('qty') }} className={btn + ' bg-paper0 text-white text-2xl py-8'}>{f.name}</button>)}
        </div>
        <button onClick={reset} className="text-muted text-lg py-2">← Não sou eu</button>
      </>}
      {step === 'qty' && <>
        <p className="text-2xl font-semibold">Quantos potes de {fl?.name}?</p>
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className={btn + ' bg-card text-5xl w-24 h-24'}>−</button>
          <span className="text-7xl font-extrabold w-24 text-center">{qty}</span>
          <button onClick={() => setQty(Math.min(20, qty + 1))} className={btn + ' bg-card text-5xl w-24 h-24'}>+</button>
        </div>
        {sum && <div className="bg-card rounded-2xl p-4 text-xl space-y-1">
          <div>Nome: <b>{emp?.full_name}</b></div>
          <div>Retirando agora: <b>{plural(qty)}</b></div>
          <div>Já em aberto: <b>{plural(sum.open_qty)}</b></div>
          <div>Total: <b>{plural(sum.open_qty + qty)}</b></div>
          <div className="text-2xl text-brand-600">Valor pendente: <b>{brl(Number(sum.open_amount) + qty * Number(sum.price))}</b></div>
        </div>}
        {err && <p className="text-red-600 text-lg font-semibold">⚠️ {err}</p>}
        <button disabled={busy} onClick={confirm} className={btn + ' bg-green-600 text-white text-2xl py-6'}>{busy ? 'Salvando…' : 'CONFIRMAR RETIRADA'}</button>
        <button onClick={() => setStep('flavor')} className="text-muted text-lg py-2">← Voltar</button>
      </>}
    </div>)
}
