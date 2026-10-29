import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { sb } from '../../lib/supabase'
import { Loading } from '../../components/ui'

const NAV = [
  { to: '/admin', label: '🏠 Início', end: true },
  { to: '/admin/categorias', label: '🗂️ Categorias' },
  { to: '/admin/produtos', label: '📦 Produtos' },
  { to: '/admin/abastecimento', label: '📋 Abastecimento' },
  { to: '/admin/configuracoes', label: '⚙️ Configurações' },
  { to: '/admin/quiosque', label: '🏪 Quiosque' },
]

export default function AdminLayout() {
  const [state, setState] = useState<'loading' | 'ok' | 'anon' | 'denied'>('loading')
  useEffect(() => {
    let alive = true
    async function check(s: Session | null) {
      if (!s) { if (alive) setState('anon'); return }
      const r = await sb.rpc('is_admin')            // quem decide é o banco
      if (!alive) return
      if (r.data === true) setState('ok')
      else { await sb.auth.signOut(); if (alive) setState('denied') }
    }
    sb.auth.getSession().then(r => check(r.data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => { setTimeout(() => check(s), 0) })  // evita travar o cliente do Supabase
    return () => { alive = false; data.subscription.unsubscribe() }
  }, [])

  if (state === 'loading') return <Loading />
  if (state !== 'ok') return <Navigate to="/admin/login" replace state={{ denied: state === 'denied' }} />

  const link = ({ isActive }: { isActive: boolean }) =>
    `block rounded-xl px-4 py-3 font-semibold whitespace-nowrap ${isActive ? 'bg-orange-500 text-white' : 'text-slate-700 hover:bg-orange-100'}`
  return (
    <div className="min-h-screen bg-orange-50 md:flex">
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-orange-100 p-4 gap-1">
        <div className="text-lg font-extrabold text-orange-600 mb-4">🍰 Caseirinhos<br />da Faby</div>
        {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={link}>{n.label}</NavLink>)}
        <button onClick={() => sb.auth.signOut().then(() => location.assign('/admin/login'))} className="mt-auto text-left px-4 py-3 text-slate-500 hover:text-red-600">Sair</button>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="md:hidden bg-white border-b border-orange-100 sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 pt-3">
            <span className="font-extrabold text-orange-600">🍰 Admin</span>
            <button onClick={() => sb.auth.signOut().then(() => location.assign('/admin/login'))} className="text-sm text-slate-500 px-2 py-1">Sair</button>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 py-3">
            {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={link}>{n.label}</NavLink>)}
          </nav>
        </header>
        <main className="p-4 md:p-8 max-w-4xl"><Outlet /></main>
      </div>
    </div>)
}
