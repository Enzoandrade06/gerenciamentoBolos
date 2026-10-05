import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar() {
    setCarregando(true); setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (error) { setErro('E-mail ou senha incorretos.'); setCarregando(false); return }
    const { data } = await supabase.rpc('eh_admin')
    if (!data) { await supabase.auth.signOut(); setErro('Este usuário não tem acesso administrativo.'); setCarregando(false); return }
    nav('/admin')
  }

  return (
    <main className="flex min-h-full items-center justify-center bg-papel p-5">
      <div className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-black text-cacau">🍰 Área administrativa</h1>
        <input className="input" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <input className="input" type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password"
          onKeyDown={(e) => e.key === 'Enter' && entrar()} />
        {erro && <p className="text-sm font-semibold text-red-600">{erro}</p>}
        <button className="btn-primary w-full" disabled={carregando || !email || !senha} onClick={entrar}>Entrar</button>
      </div>
    </main>
  )
}
