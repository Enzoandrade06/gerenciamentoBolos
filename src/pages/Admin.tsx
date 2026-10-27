import { useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { sb, brl } from '../lib/supabase'
const today = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Sao_Paulo' })
const inp = 'border rounded-lg p-2 bg-white'
const b = 'rounded-lg px-4 py-2 font-semibold text-white bg-orange-500 active:scale-95'

export default function Admin() {
  const [s, setS] = useState<Session | null>(null); const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<'estoque' | 'res' | 'pend' | 'func' | 'sab'>('estoque')
  useEffect(() => { sb.auth.getSession().then(r => { setS(r.data.session); setReady(true) }); const { data } = sb.auth.onAuthStateChange((_e, x) => setS(x)); return () => data.subscription.unsubscribe() }, [])
  if (!ready) return null
  if (!s) return <Login />
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        {([['estoque', '📦 Estoque'], ['res', '📥 Reservas'], ['pend', '💰 Pendências'], ['sab', '🍰 Sabores'], ['func', '👥 Funcionários']] as const).map(([k, l]) =>
          <button key={k} onClick={() => setTab(k)} className={b + (tab === k ? '' : ' !bg-slate-400')}>{l}</button>)}
        <button onClick={() => sb.auth.signOut()} className="ml-auto text-slate-500">Sair</button>
      </div>
      {tab === 'estoque' && <Estoque />}{tab === 'res' && <Reservas />}{tab === 'pend' && <Pend />}{tab === 'sab' && <Sabores />}{tab === 'func' && <Func />}
    </div>)
}

function Login() {
  const [email, setE] = useState(''); const [pw, setP] = useState(''); const [err, setErr] = useState('')
  return (
    <div className="max-w-sm mx-auto p-6 space-y-3 mt-16">
      <h1 className="text-2xl font-bold">Admin — Bolos de Pote</h1>
      <input className={inp + ' w-full'} type="email" placeholder="E-mail" value={email} onChange={e => setE(e.target.value)} />
      <input className={inp + ' w-full'} type="password" placeholder="Senha" value={pw} onChange={e => setP(e.target.value)} />
      {err && <p className="text-red-600">{err}</p>}
      <button className={b + ' w-full'} onClick={async () => { const r = await sb.auth.signInWithPassword({ email, password: pw }); if (r.error) setErr('Login inválido') }}>Entrar</button>
    </div>)
}

type Row = { flavor_id: number; flavor: string; initial_qty: number; sold: number; counted_qty: number | null }
function Estoque() {
  const [date, setDate] = useState(today()); const [day, setDay] = useState<{ id: string; status: string } | null>(null)
  const [rows, setRows] = useState<Row[]>([]); const [fl, setFl] = useState<{ id: number; name: string }[]>([])
  const [vals, setVals] = useState<Record<number, string>>({}); const [price, setPrice] = useState('10')
  const [counting, setCounting] = useState(false)
  const load = useCallback(async () => {
    const f = await sb.from('flavors').select('id,name').eq('active', true).order('id'); setFl(f.data ?? [])
    const p = await sb.from('settings').select('unit_price').single(); if (p.data) setPrice(String(p.data.unit_price))
    const d = await sb.from('stock_days').select('id,status').eq('stock_date', date).maybeSingle(); setDay(d.data)
    if (d.data) { const r = await sb.from('stock_panel').select('*').eq('stock_day_id', d.data.id).order('flavor_id'); setRows(r.data ?? []) } else setRows([])
  }, [date])
  useEffect(() => { load(); const t = setInterval(() => { if (!counting) load() }, 15000); return () => clearInterval(t) }, [load, counting])

  async function start() {
    const d = await sb.from('stock_days').insert({ stock_date: date }).select('id').single()
    if (d.error) return alert(d.error.message)
    await sb.from('stock_items').insert(fl.map(f => ({ stock_day_id: d.data.id, flavor_id: f.id, initial_qty: Math.max(0, parseInt(vals[f.id] || '0') || 0) })))
    setVals({}); load()
  }
  async function setStatus(status: 'open' | 'closed') {
    if (!day) return
    await sb.from('stock_days').update({ status, closed_at: status === 'closed' ? new Date().toISOString() : null }).eq('id', day.id); load()
  }
  function startCount() { const v: Record<number, string> = {}; rows.forEach(r => { if (r.counted_qty !== null) v[r.flavor_id] = String(r.counted_qty) }); setVals(v); setCounting(true) }
  async function saveCounts() {
    if (!day) return
    for (const r of rows) {
      const v = vals[r.flavor_id]
      await sb.from('stock_items').update({ counted_qty: v === undefined || v === '' ? null : Math.max(0, parseInt(v) || 0) }).eq('stock_day_id', day.id).eq('flavor_id', r.flavor_id)
    }
    setVals({}); setCounting(false); load()
  }
  const over = date < today()
  const isOpen = day?.status === 'open' && !over
  const counted = rows.length > 0 && rows.every(r => r.counted_qty !== null)
  const tot = rows.reduce((a, r) => ({ i: a.i + r.initial_qty, s: a.s + r.sold, c: a.c + (r.counted_qty ?? 0) }), { i: 0, s: 0, c: 0 })
  const lost = tot.i - tot.s - tot.c

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-center flex-wrap">
        <label>Data <input type="date" className={inp} value={date} onChange={e => { setDate(e.target.value); setCounting(false); setVals({}) }} /></label>
        <label className="ml-auto">Preço do pote R$ <input className={inp + ' w-20'} value={price} onChange={e => setPrice(e.target.value)} onBlur={() => sb.from('settings').update({ unit_price: Number(price.replace(',', '.')) }).eq('id', 1)} /></label>
      </div>
      {!day && <div className="bg-white rounded-xl p-4 space-y-2"><h2 className="font-bold text-lg">Abastecimento do Dia</h2>
        {fl.map(f => <label key={f.id} className="flex justify-between">{f.name}<input type="number" min={0} className={inp + ' w-24'} value={vals[f.id] ?? ''} onChange={e => setVals({ ...vals, [f.id]: e.target.value })} /></label>)}
        <button className={b + ' w-full'} onClick={start}>INICIAR VENDAS</button></div>}
      {day && <div className="bg-white rounded-xl p-4 space-y-3 overflow-x-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={'font-bold text-lg ' + (isOpen ? 'text-green-700' : 'text-slate-500')}>{over ? '📅 Dia encerrado' : isOpen ? '🟢 Vendas abertas' : '🔴 Vendas fechadas'}</span>
          <div className="ml-auto flex gap-2">
            {isOpen && <button className={b + ' !bg-slate-600'} onClick={() => setStatus('closed')}>⏸ Fechar vendas</button>}
            {!isOpen && !over && <button className={b + ' !bg-green-600'} onClick={() => setStatus('open')}>▶ Reabrir vendas</button>}
          </div>
        </div>
        <table className="w-full text-left"><thead><tr><th>Sabor</th><th>Inicial</th><th>Vendidos</th><th>Saldo</th><th>Sobrou (físico)</th></tr></thead>
          <tbody>{rows.map(r => { const bal = r.initial_qty - r.sold; const low = isOpen && r.initial_qty > 0 && bal <= r.initial_qty * 0.2
            return <tr key={r.flavor_id} className={low ? 'text-red-600 font-semibold' : ''}><td>{r.flavor}{low && ' ⚠️ estoque baixo'}</td><td>{r.initial_qty}</td><td>{r.sold}</td><td>{bal}</td>
              <td>{counting ? <input type="number" min={0} className={inp + ' w-20'} value={vals[r.flavor_id] ?? ''} onChange={e => setVals({ ...vals, [r.flavor_id]: e.target.value })} /> : (r.counted_qty ?? '—')}</td></tr> })}</tbody></table>
        <p>Total inicial: <b>{tot.i}</b> · Registrado: <b>{tot.s}</b> · Saldo esperado: <b>{tot.i - tot.s}</b></p>
        <div className="flex gap-2">
          {!counting && <button className={b} onClick={startCount}>📋 Informar sobras</button>}
          {counting && <><button className={b + ' !bg-green-600'} onClick={saveCounts}>Salvar sobras</button><button className="text-slate-500 px-3" onClick={() => { setCounting(false); setVals({}) }}>Cancelar</button></>}
        </div>
        {!counting && (counted
          ? (lost > 0
            ? <p className="text-red-600 font-bold">⚠️ Possível perda: {lost} bolos — {brl(lost * Number(price.replace(',', '.')))} ({tot.i ? Math.round(lost / tot.i * 100) : 0}% do inicial)</p>
            : <p className="text-green-700 font-bold">✅ Sem perdas detectadas{lost < 0 ? ` (sobraram ${-lost} a mais que o esperado, confira)` : ''}</p>)
          : <p className="text-slate-500">Sobras ainda não informadas: o alerta de perdas só aparece depois que você informar quantos bolos sobraram.</p>)}
      </div>}
    </div>)
}

type Bal = { id: string; full_name: string; sector: string; qty: number; amount: number; phone: string | null }
function waLink(x: Bal, pix: string) {
  let t = (x.phone ?? '').replace(/\D/g, ''); if (t.length < 10) return null
  if (t.length <= 11) t = '55' + t
  const msg = `Olá, ${x.full_name.split(' ')[0]}! 🍰\n\nVocê retirou ${x.qty} ${x.qty === 1 ? 'bolo' : 'bolos'} de pote, total de ${brl(x.amount)}.\n\nPagamento via Pix: ${pix || '(informe a chave)'}\n\nMuito obrigado pela preferência!`
  return `https://wa.me/${t}?text=${encodeURIComponent(msg)}`
}
function Pend() {
  const [l, setL] = useState<Bal[]>([]); const [pix, setPix] = useState('')
  const load = useCallback(() => { sb.from('open_balances').select('*').order('amount', { ascending: false }).then(r => setL(r.data ?? [])) }, [])
  useEffect(() => { load(); sb.from('settings').select('pix_key').single().then(r => setPix(r.data?.pix_key ?? '')) }, [load])
  return (
    <div className="space-y-2">
      <label className="block">Chave Pix (vai na mensagem) <input className={inp + ' w-full'} value={pix} onChange={e => setPix(e.target.value)} onBlur={() => sb.from('settings').update({ pix_key: pix.trim() || null }).eq('id', 1)} /></label>
      <p className="font-bold">Total pendente: {brl(l.reduce((a, x) => a + Number(x.amount), 0))}</p>
      {l.map(x => { const wa = waLink(x, pix); return <div key={x.id} className="bg-white rounded-xl p-3 flex items-center gap-2 flex-wrap">
        <div className="flex-1"><b>{x.full_name}</b> <span className="text-slate-500">{x.sector}</span><div>{x.qty} potes em aberto — {brl(x.amount)}</div></div>
        {wa ? <a href={wa} target="_blank" rel="noreferrer" className={b + ' !bg-green-600'}>📲 Cobrar</a> : <span className="text-sm text-slate-400">sem telefone</span>}
        <button className={b} onClick={async () => { if (confirm(`Marcar ${brl(x.amount)} de ${x.full_name} como pago?`)) { await sb.rpc('pay_employee', { p_employee: x.id }); load() } }}>✅ Pago</button>
      </div> })}
      {!l.length && <p>Nenhuma pendência 🎉</p>}
    </div>)
}

type Emp = { id: string; full_name: string; sector: string; phone: string | null; active: boolean }
function Func() {
  const [l, setL] = useState<Emp[]>([]); const [q, setQ] = useState(''); const [n, setN] = useState({ full_name: '', sector: '', phone: '' })
  const load = useCallback(() => { sb.from('employees').select('*').order('full_name').then(r => setL(r.data ?? [])) }, [])
  useEffect(load, [load])
  const add = async () => { const r = await sb.from('employees').insert({ full_name: n.full_name.trim(), sector: n.sector.trim(), phone: n.phone.trim() || null }); if (r.error) return alert('Verifique os campos'); setN({ full_name: '', sector: '', phone: '' }); load() }
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl p-3 grid grid-cols-2 gap-2">
        <input className={inp} placeholder="Nome completo" value={n.full_name} onChange={e => setN({ ...n, full_name: e.target.value })} />
        <input className={inp} placeholder="Setor" value={n.sector} onChange={e => setN({ ...n, sector: e.target.value })} />
        <input className={inp} placeholder="Telefone" value={n.phone} onChange={e => setN({ ...n, phone: e.target.value })} />
        <button className={b} onClick={add}>+ Cadastrar</button>
      </div>
      <input className={inp + ' w-full'} placeholder="Pesquisar…" value={q} onChange={e => setQ(e.target.value)} />
      {l.filter(e => e.full_name.toLowerCase().includes(q.toLowerCase())).map(e =>
        <div key={e.id} className={'bg-white rounded-xl p-3 flex items-center gap-2 ' + (e.active ? '' : 'opacity-50')}>
          <div className="flex-1"><b>{e.full_name}</b> <span className="text-slate-500">{e.sector} · {e.phone}</span></div>
          <button className="text-blue-600" onClick={async () => { const nm = prompt('Nome', e.full_name); const st = prompt('Setor', e.sector); const ph = prompt('Telefone', e.phone ?? ''); if (nm && st) { await sb.from('employees').update({ full_name: nm.trim(), sector: st.trim(), phone: ph?.trim() || null }).eq('id', e.id); load() } }}>Editar</button>
          <button className="text-red-600" onClick={async () => { await sb.from('employees').update({ active: !e.active }).eq('id', e.id); load() }}>{e.active ? 'Inativar' : 'Reativar'}</button>
        </div>)}
    </div>)
}

type Flv = { id: number; name: string; active: boolean }
function Sabores() {
  const [l, setL] = useState<Flv[]>([]); const [n, setN] = useState('')
  const load = useCallback(() => { sb.from('flavors').select('*').order('id').then(r => setL(r.data ?? [])) }, [])
  useEffect(load, [load])
  const add = async () => {
    const name = n.trim(); if (name.length < 2) return
    const r = await sb.from('flavors').insert({ name }); if (r.error) return alert('Esse sabor já existe ou o nome é inválido')
    setN(''); load()
  }
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl p-3 flex gap-2">
        <input className={inp + ' flex-1'} maxLength={30} placeholder="Novo sabor (ex: Maracujá)" value={n} onChange={e => setN(e.target.value)} />
        <button className={b} onClick={add}>+ Adicionar</button>
      </div>
      {l.map(f => (
        <div key={f.id} className={'bg-white rounded-xl p-3 flex items-center gap-3 ' + (f.active ? '' : 'opacity-50')}>
          <b className="flex-1">{f.name}</b>
          <button className="text-blue-600" onClick={async () => { const nm = prompt('Novo nome', f.name)?.trim(); if (nm && nm.length >= 2) { const r = await sb.from('flavors').update({ name: nm }).eq('id', f.id); if (r.error) alert('Nome já existe'); load() } }}>Renomear</button>
          <button className="text-red-600" onClick={async () => { await sb.from('flavors').update({ active: !f.active }).eq('id', f.id); load() }}>{f.active ? 'Desativar' : 'Reativar'}</button>
        </div>))}
      <p className="text-sm text-slate-500">Sabores desativados somem do quiosque e do próximo abastecimento, mas o histórico é mantido. Cadastre sabores novos antes de clicar em INICIAR VENDAS.</p>
    </div>)
}

type Res = { id: string; name: string; sector: string; phone: string; created_at: string; reservation_items: { quantity: number; flavors: any }[] }
function Reservas() {
  const [l, setL] = useState<Res[]>([]); const [contact, setContact] = useState('')
  const load = useCallback(async () => {
    const r = await sb.from('reservations').select('id,name,sector,phone,created_at,reservation_items(quantity,flavors(name))').eq('status', 'reserved').order('created_at')
    setL((r.data as any) ?? [])
  }, [])
  useEffect(() => { load(); sb.from('settings').select('contact_phone').single().then(r => setContact(r.data?.contact_phone ?? '')); const t = setInterval(load, 15000); return () => clearInterval(t) }, [load])
  const link = `${location.origin}/pedido`
  const lines = (r: Res) => r.reservation_items.map(i => `${i.quantity} ${i.flavors?.name ?? ''}`)
  const wa = (r: Res) => {
    let t = r.phone.replace(/\D/g, ''); if (t.length <= 11) t = '55' + t
    const msg = `Olá, ${r.name.split(' ')[0]}! Recebi sua reserva:\n${lines(r).join('\n')}\n\nJá separei pra você! 🍰`
    window.open(`https://wa.me/${15997053661}?text=${encodeURIComponent(msg)}`, '_blank')
  }
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl p-3 space-y-2">
        <div className="font-semibold">Link para postar no status</div>
        <div className="flex gap-2"><input readOnly className={inp + ' flex-1'} value={link} /><button className={b} onClick={() => navigator.clipboard?.writeText(link).then(() => alert('Link copiado!'))}>Copiar</button></div>
        <label className="block">WhatsApp que recebe os pedidos (com DDD)
          <input className={inp + ' w-full'} value={contact} placeholder="15999999999" onChange={e => setContact(e.target.value)} onBlur={() => sb.from('settings').update({ contact_phone: contact.replace(/\D/g, '') || null }).eq('id', 1)} /></label>
      </div>
      {l.map(r => (
        <div key={r.id} className="bg-white rounded-xl p-3 space-y-2">
          <div><b>{r.name}</b> <span className="text-slate-500">{r.sector} · {r.phone}</span></div>
          <div>{lines(r).map((x, i) => <div key={i}>• {x}</div>)}</div>
          <div className="flex gap-2 flex-wrap items-center">
            <button className={b + ' !bg-green-600'} onClick={() => wa(r)}>📲 Responder</button>
            <button className={b} onClick={async () => { const e = await sb.rpc('deliver_reservation', { p_id: r.id }); if (e.error) alert(e.error.message); load() }}>✅ Entregue</button>
            <button className="text-red-600 px-3" onClick={async () => { if (confirm(`Cancelar a reserva de ${r.name}? O estoque volta.`)) { await sb.from('reservations').update({ status: 'cancelled' }).eq('id', r.id); load() } }}>Cancelar</button>
          </div>
        </div>))}
      {!l.length && <p>Nenhuma reserva aguardando entrega.</p>}
    </div>)
}
