import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { sb } from '../../lib/supabase'

export default function Login() {
  const nav = useNavigate(); const loc = useLocation()
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [busy, setBusy] = useState(false)
  const [err, setErr] = useState((loc.state as { denied?: boolean } | null)?.denied ? 'Esta conta não tem acesso ao painel.' : '')
  useEffect(() => { sb.auth.getSession().then(r => { if (r.data.session) nav('/admin', { replace: true }) }) }, [nav])

  async function enter(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true); setErr('')
    const r = await sb.auth.signInWithPassword({ email: email.trim(), password: pw })
    setBusy(false)
    if (r.error) return setErr('E-mail ou senha inválidos.')   // mensagem genérica de propósito
    nav('/admin', { replace: true })
  }
  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <form onSubmit={enter} className="bg-white rounded-3xl shadow p-6 w-full max-w-sm space-y-4">
        <div className="text-center"><div className="text-5xl">🍰</div><h1 className="text-xl font-extrabold mt-1">Painel administrativo</h1></div>
        <input className="w-full border-2 border-orange-200 rounded-xl p-3 text-lg" type="email" autoComplete="username" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="w-full border-2 border-orange-200 rounded-xl p-3 text-lg" type="password" autoComplete="current-password" placeholder="Senha" value={pw} onChange={e => setPw(e.target.value)} required />
        {err && <p role="alert" className="text-red-600 font-semibold">{err}</p>}
        <button disabled={busy} className="w-full bg-orange-500 text-white font-bold text-lg rounded-xl py-3 disabled:opacity-60">{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>)
}
