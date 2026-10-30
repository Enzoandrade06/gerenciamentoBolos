import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { sb } from '../../lib/supabase'
import { Loading, ThemeToggle } from '../../components/ui'

const NAV = [
  { to: '/admin', label: '🏠 Painel', end: true },
  { to: '/admin/pedidos', label: '🧾 Pedidos', badge: true },
  { to: '/admin/produtos', label: '📦 Produtos' },
  { to: '/admin/abastecimento', label: '📋 Abastecimento' },
  { to: '/admin/categorias', label: '🗂️ Categorias' },
  { to: '/admin/clientes', label: '👥 Clientes' },
  { to: '/admin/configuracoes', label: '⚙️ Configurações' },
  { to: '/admin/quiosque', label: '🏪 Quiosque' },
]

export default function AdminLayout() {
  const [state, setState] = useState<'loading' | 'ok' | 'anon' | 'denied'>('loading')
  const [novos, setNovos] = useState(0)
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

  useEffect(() => {   // aviso de pedidos novos no menu
    if (state !== 'ok') return
    const f = () => sb.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new').then(r => setNovos(r.count ?? 0))
    f(); const t = setInterval(f, 20000); return () => clearInterval(t)
  }, [state])

  if (state === 'loading') return <Loading />
  if (state !== 'ok') return <Navigate to="/admin/login" replace state={{ denied: state === 'denied' }} />

  const link = ({ isActive }: { isActive: boolean }) =>
    `block rounded-xl px-4 py-3 font-semibold whitespace-nowrap ${isActive ? 'bg-paper0 text-white' : 'text-ink hover:bg-brand-100'}`
  return (
    <div className="min-h-screen bg-paper md:flex">
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-card border-r border-line p-4 gap-1">
        <div className="text-lg font-extrabold text-brand-600 mb-4">🍰 Caseirinhos<br />da Faby</div>
        {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={link}><span className="flex items-center justify-between gap-2">{n.label}{n.badge && novos > 0 && <span className="bg-red-500 text-white text-xs font-extrabold rounded-full px-2 py-0.5">{novos}</span>}</span></NavLink>)}
        <div className="mt-auto flex items-center justify-between"><button onClick={() => sb.auth.signOut().then(() => location.assign('/admin/login'))} className="text-left px-4 py-3 text-muted hover:text-red-600">Sair</button><ThemeToggle /></div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="md:hidden bg-card border-b border-line sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 pt-3">
            <span className="font-extrabold text-brand-600">🍰 Admin</span>
            <div className="flex items-center gap-2"><ThemeToggle /><button onClick={() => sb.auth.signOut().then(() => location.assign('/admin/login'))} className="text-sm text-muted px-2 py-1">Sair</button></div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 py-3">
            {NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} className={link}><span className="flex items-center gap-2">{n.label}{n.badge && novos > 0 && <span className="bg-red-500 text-white text-xs font-extrabold rounded-full px-2 py-0.5">{novos}</span>}</span></NavLink>)}
          </nav>
        </header>
        <main className="p-4 md:p-8 max-w-4xl"><Outlet /></main>
      </div>
    </div>)
}
