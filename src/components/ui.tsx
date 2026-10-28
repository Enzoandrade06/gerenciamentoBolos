export function Loading({ text = 'Carregando…' }: { text?: string }) {
  return <div className="min-h-[40vh] flex items-center justify-center text-slate-500">{text}</div>
}
export function NotFound() {
  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-5xl">🍰</div><h1 className="text-xl font-bold">Página não encontrada</h1>
      <a href="/" className="text-orange-600 underline">Voltar ao início</a>
    </div>)
}
export function Notice({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return <div role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${msg.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{msg.text}</div>
}
