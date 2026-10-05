import { useEffect, useState } from 'react'
import { sb, brl, plural } from '../lib/supabase'
type Emp = { id: string; full_name: string; sector: string }
type Fl = { id: number; name: string }
type Sum = { open_qty: number; open_amount: number; price: number }
const btn = 'rounded-2xl font-bold active:scale-95 transition shadow'

export default function Kiosk() {
  const [step, setStep] = useState<'name' | 'flavor' | 'qty' | 'done'>('name')
  const [q, setQ] = useState(''); const [list, setList] = useState<Emp[]>([])
  const [emp, setEmp] = useState<Emp>(); const [flavors, setFlavors] = useState<Fl[]>([])
  const [fl, setFl] = useState<Fl>(); const [qty, setQty] = useState(1)
  const [sum, setSum] = useState<Sum>(); const [res, setRes] = useState<Sum>()
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)

  const reset = () => { setStep('name'); setQ(''); setList([]); setEmp(undefined); setFl(undefined); setQty(1); setSum(undefined); setErr(''); setBusy(false) }

  useEffect(() => { sb.from('flavors').select('id,name').order('id').then(r => setFlavors(r.data ?? [])) }, [])
  useEffect(() => {
    if (q.trim().length < 2) { setList([]); return }
    const t = setTimeout(async () => { const r = await sb.rpc('search_employees', { q: q.trim() }); setList(r.data ?? []) }, 200)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => { if (emp) sb.rpc('get_summary', { p_employee: emp.id }).then(r => setSum(r.data)) }, [emp])
  useEffect(() => { // volta sozinho se ninguém terminar
    if (step === 'name') return
    const t = setTimeout(reset, step === 'done' ? 5000 : 45000)
    return () => clearTimeout(t)
  }, [step, qty, emp])

  async function confirm() {
    if (!emp || !fl || busy) return
    setBusy(true); setErr('')
    const r = await sb.rpc('register_withdrawal', { p_employee: emp.id, p_flavor: fl.id, p_qty: qty })
    if (r.error) { setErr(r.error.message); setBusy(false); return }
    setRes(r.data); setStep('done')
  }

  const wrap = 'min-h-screen p-5 flex flex-col gap-4 max-w-xl mx-auto text-slate-800'
  if (step === 'done' && emp && res) return (
    <div className={wrap + ' justify-center text-center'}>
      <div className="text-7xl">✅</div>
      <h1 className="text-3xl font-extrabold text-green-700">Retirada registrada!</h1>
      <p className="text-2xl">{emp.full_name}</p>
      <p className="text-xl">Retirou agora: <b>{plural(qty)}</b> de {fl?.name}</p>
      <p className="text-xl">Total em aberto: <b>{plural(res.open_qty)}</b> — <b>{brl(res.open_amount)}</b></p>
      <p className="text-2xl mt-4">Obrigado! 🍰</p>
      <button onClick={reset} className={btn + ' bg-orange-500 text-white text-xl py-4'}>OK</button>
    </div>)

  return (
    <div className={wrap}>
      <h1 className="text-3xl font-extrabold text-orange-600 text-center">🍰 BOLOS DE POTE</h1>
      {step === 'name' && <>
        <p className="text-2xl font-semibold">Quem está retirando?</p>
        <input autoFocus value={q} onChange={e => setQ(e.target.value.slice(0, 60))} placeholder="Digite seu nome…" className="text-2xl p-4 rounded-2xl border-2 border-orange-300 bg-white" />
        {list.map(e => (
          <button key={e.id} onClick={() => { setEmp(e); setStep('flavor') }} className={btn + ' bg-white p-4 text-left text-2xl'}>
            {e.full_name}<div className="text-base font-normal text-slate-500">{e.sector}</div>
          </button>))}
      </>}
      {step === 'flavor' && <>
        <p className="text-2xl font-semibold">{emp?.full_name}, qual sabor?</p>
        <div className="grid grid-cols-2 gap-3">
          {flavors.map(f => <button key={f.id} onClick={() => { setFl(f); setStep('qty') }} className={btn + ' bg-orange-500 text-white text-2xl py-8'}>{f.name}</button>)}
        </div>
        <button onClick={reset} className="text-slate-500 text-lg py-2">← Não sou eu</button>
      </>}
      {step === 'qty' && <>
        <p className="text-2xl font-semibold">Quantos potes de {fl?.name}?</p>
        <div className="flex items-center justify-center gap-6">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className={btn + ' bg-white text-5xl w-24 h-24'}>−</button>
          <span className="text-7xl font-extrabold w-24 text-center">{qty}</span>
          <button onClick={() => setQty(Math.min(20, qty + 1))} className={btn + ' bg-white text-5xl w-24 h-24'}>+</button>
        </div>
        {sum && <div className="bg-white rounded-2xl p-4 text-xl space-y-1">
          <div>Nome: <b>{emp?.full_name}</b></div>
          <div>Retirando agora: <b>{plural(qty)}</b></div>
          <div>Já em aberto: <b>{plural(sum.open_qty)}</b></div>
          <div>Total: <b>{plural(sum.open_qty + qty)}</b></div>
          <div className="text-2xl text-orange-600">Valor pendente: <b>{brl(Number(sum.open_amount) + qty * Number(sum.price))}</b></div>
        </div>}
        {err && <p className="text-red-600 text-lg font-semibold">⚠️ {err}</p>}
        <button disabled={busy} onClick={confirm} className={btn + ' bg-green-600 text-white text-2xl py-6'}>{busy ? 'Salvando…' : 'CONFIRMAR RETIRADA'}</button>
        <button onClick={() => setStep('flavor')} className="text-slate-500 text-lg py-2">← Voltar</button>
      </>}
    </div>)
}
