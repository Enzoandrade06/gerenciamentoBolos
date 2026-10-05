import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { brl, periodo } from '../../lib/format'
import type { Estoque, Relatorio } from '../../lib/types'

export const Card = ({ titulo, valor, sub, alerta }: { titulo: string; valor: string; sub?: string; alerta?: boolean }) => (
  <div className={`card ${alerta ? 'ring-2 ring-red-400' : ''}`}>
    <p className="text-xs font-semibold text-ameixa/70">{titulo}</p>
    <p className="mt-1 text-2xl font-black text-cacau">{valor}</p>
    {sub && <p className="text-xs text-ameixa/70">{sub}</p>}
  </div>
)

const rel = async (t: 'dia' | 'semana' | 'mes') => {
  const [i, f] = periodo(t)
  const { data, error } = await supabase.rpc('relatorio', { p_ini: i, p_fim: f })
  if (error) throw error
  return data as Relatorio
}

export default function Dashboard() {
  const [d, setD] = useState<Relatorio | null>(null)
  const [s, setS] = useState<Relatorio | null>(null)
  const [m, setM] = useState<Relatorio | null>(null)
  const [pend, setPend] = useState(0)
  const [aberto, setAberto] = useState<Estoque[]>([])
  const [alerta, setAlerta] = useState(20)
  const [erro, setErro] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const [a, b, c] = await Promise.all([rel('dia'), rel('semana'), rel('mes')])
        setD(a); setS(b); setM(c)
        const p = await supabase.from('v_pendencias').select('valor')
        setPend((p.data ?? []).reduce((t, x: any) => t + Number(x.valor), 0))
        const e = await supabase.from('v_estoque_dia').select('*').eq('status', 'aberto').order('ordem')
        setAberto((e.data ?? []) as Estoque[])
        const cfg = await supabase.from('config').select('alerta_percentual').eq('id', 1).single()
        if (cfg.data) setAlerta(cfg.data.alerta_percentual)
      } catch { setErro('Erro ao carregar o painel.') }
    })()
  }, [])

  if (erro) return <p className="text-red-600">{erro}</p>
  if (!d || !s || !m) return <p className="text-ameixa">Carregando…</p>

  const dia = d.dias[0]
  const baixos = aberto.filter((e) => e.inicial > 0 && e.saldo <= (e.inicial * alerta) / 100)
  const perdaPct = d.produzido ? ((d.perdido_qtd / d.produzido) * 100).toFixed(1) : '0.0'

  return (
    <>
      {baixos.map((e) => (
        <div key={e.sabor_id} className="rounded-2xl bg-amber-100 px-4 py-3 font-bold text-amber-900">
          ⚠️ Estoque baixo de {e.sabor}: restam {e.saldo} de {e.inicial}.
        </div>
      ))}

      <h2 className="font-black">Vendas</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card titulo="Hoje" valor={`${d.vendido_qtd} potes`} sub={brl(d.faturamento)} />
        <Card titulo="Semana" valor={`${s.vendido_qtd} potes`} sub={brl(s.faturamento)} />
        <Card titulo="Mês" valor={`${m.vendido_qtd} potes`} sub={brl(m.faturamento)} />
      </div>

      <h2 className="font-black">Financeiro do mês</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card titulo="Valor vendido" valor={brl(m.faturamento)} />
        <Card titulo="Valor recebido" valor={brl(m.recebido)} />
        <Card titulo="Pendente (total geral)" valor={brl(pend)} alerta={pend > 0} />
      </div>

      <h2 className="font-black">Estoque de hoje</h2>
      {dia ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card titulo="Estoque inicial" valor={String(dia.inicial)} />
          <Card titulo="Vendida" valor={String(dia.vendidos)} />
          <Card titulo="Restante (esperado)" valor={String(dia.restante)} />
          <Card titulo="Perdida" valor={dia.fechado ? String(dia.perdidos) : '—'} sub={dia.fechado ? '' : 'após fechar o dia'} alerta={dia.fechado && dia.perdidos > 0} />
          <Card titulo="Valor das perdas" valor={dia.fechado ? brl(dia.perdidos * d.preco) : '—'} />
          <Card titulo="% de perda" valor={dia.fechado ? `${perdaPct}%` : '—'} />
        </div>
      ) : <p className="card text-sm text-ameixa">Nenhum abastecimento registrado hoje. Vá em Estoque para iniciar as vendas.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Ranking titulo="Sabores mais vendidos (mês)" itens={m.por_sabor.map((x) => [x.sabor, `${x.qtd}`])} />
        <Ranking titulo="Top compradores (mês)" itens={m.funcionarios.slice(0, 5).map((x) => [x.nome, `${x.qtd}`])} />
      </div>
    </>
  )
}

function Ranking({ titulo, itens }: { titulo: string; itens: string[][] }) {
  return (
    <div className="card">
      <h3 className="mb-2 font-black">{titulo}</h3>
      {itens.length === 0 && <p className="text-sm text-ameixa/70">Sem dados ainda.</p>}
      <ol className="space-y-1">
        {itens.map(([n, q], i) => (
          <li key={n} className="flex justify-between text-sm"><span>{i + 1}º {n}</span><b>{q}</b></li>
        ))}
      </ol>
    </div>
  )
}
