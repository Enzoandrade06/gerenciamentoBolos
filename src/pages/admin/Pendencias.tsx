import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { brl, fmtHora, potes } from '../../lib/format'

type P = { funcionario_id: string; nome: string; setor: string; potes: number; valor: number; desde: string }

export default function Pendencias() {
  const [itens, setItens] = useState<P[]>([])
  const [busca, setBusca] = useState('')
  const [msg, setMsg] = useState('')

  const carregar = async () => {
    const { data } = await supabase.from('v_pendencias').select('*').order('valor', { ascending: false })
    setItens((data ?? []) as P[])
  }
  useEffect(() => { carregar() }, [])

  async function pagar(p: P) {
    if (!confirm(`Confirmar pagamento de ${brl(p.valor)} de ${p.nome}?`)) return
    const { error } = await supabase.rpc('registrar_pagamento', { p_func: p.funcionario_id })
    setMsg(error ? 'Erro ao registrar pagamento.' : `Pagamento de ${p.nome} registrado.`)
    carregar()
  }

  const lista = itens.filter((i) => i.nome.toLowerCase().includes(busca.toLowerCase()))
  const total = lista.reduce((t, i) => t + Number(i.valor), 0)

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-xl font-black">Pendências financeiras</h1>
        <p className="text-right text-sm text-ameixa">Total: <b className="text-lg text-cacau">{brl(total)}</b></p>
      </div>
      <input className="input" placeholder="Buscar funcionário" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {msg && <p className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">{msg}</p>}
      {lista.length === 0 && <p className="card text-sm text-ameixa">Nenhuma pendência. 🎉</p>}
      <ul className="space-y-3">
        {lista.map((p) => (
          <li key={p.funcionario_id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black">{p.nome} <span className="font-normal text-ameixa/70">· {p.setor}</span></p>
              <p className="text-sm text-ameixa">{potes(p.potes)} em aberto desde {fmtHora(p.desde)}</p>
            </div>
            <div className="flex items-center gap-3">
              <b className="text-xl">{brl(p.valor)}</b>
              <button className="btn-ok" onClick={() => pagar(p)}>✅ Marcar como pago</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
