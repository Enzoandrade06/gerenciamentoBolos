import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const ABAS = [
  ['/admin', 'Painel'], ['/admin/abastecimento', 'Estoque'], ['/admin/pendencias', 'Pendências'],
  ['/admin/funcionarios', 'Funcionários'], ['/admin/relatorios', 'Relatórios'], ['/admin/config', 'Ajustes']
]

export default function AdminLayout() {
  const nav = useNavigate()
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'negado'>('carregando')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return vivo && setEstado('negado')
      const { data } = await supabase.rpc('eh_admin')
      if (vivo) setEstado(data ? 'ok' : 'negado')
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') setEstado('negado') })
    return () => { vivo = false; sub.subscription.unsubscribe() }
  }, [])

  if (estado === 'carregando') return <p className="p-8 text-center text-ameixa">Carregando…</p>
  if (estado === 'negado') return <Navigate to="/admin/login" replace />

  return (
    <div className="min-h-full bg-papel text-cacau">
      <header className="sticky top-0 z-10 bg-cacau text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <b className="text-lg">🍰 Bolos de pote</b>
          <button className="text-sm text-white/70" onClick={async () => { await supabase.auth.signOut(); nav('/admin/login') }}>Sair</button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-2">
          {ABAS.map(([to, nome]) => (
            <NavLink key={to} to={to} end={to === '/admin'}
              className={({ isActive }) => `whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${isActive ? 'bg-morango text-white' : 'text-white/70'}`}>
              {nome}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl space-y-5 p-4"><Outlet /></main>
    </div>
  )
}
