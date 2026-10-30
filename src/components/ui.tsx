import { isDark, useTheme } from '../lib/theme'
import { useEffect, type ReactNode } from 'react'
export function Loading({ text = 'Carregando…' }: { text?: string }) {
  return <div className="min-h-[40vh] flex items-center justify-center text-muted">{text}</div>
}
export function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-5xl">🍰</div><h1 className="text-xl font-bold">Página não encontrada</h1>
      <a href="/" className="text-brand-600 underline">Voltar ao início</a>
    </div>)
}
export function Notice({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return <div role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{msg.text}</div>
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}
        className="bg-card w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl max-h-[94vh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-2xl px-2 text-muted">✕</button></div>
        {children}
      </div>
    </div>)
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { set } = useTheme(); const dark = isDark()
  return <button type="button" onClick={() => set(dark ? 'light' : 'dark')} aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'} title={dark ? 'Tema claro' : 'Tema escuro'}
    className={`w-10 h-10 rounded-full bg-card border border-line flex items-center justify-center text-lg ${className}`}>{dark ? '☀️' : '🌙'}</button>
}
