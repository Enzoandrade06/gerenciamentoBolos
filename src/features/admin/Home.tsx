import { Link } from 'react-router-dom'

export default function Home() {
  const card = 'bg-white rounded-2xl shadow-sm p-5 block'
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Bem-vinda(o) ao painel 👋</h1>
      <p className="text-slate-600">Comece cadastrando as categorias da loja. Os próximos blocos trazem produtos, pedidos e configurações.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/admin/categorias" className={card + ' hover:ring-2 ring-orange-300'}><div className="text-3xl">🗂️</div><b>Categorias</b><p className="text-sm text-slate-500">Criar, ordenar, ativar e desativar.</p></Link>
        <Link to="/admin/quiosque" className={card + ' hover:ring-2 ring-orange-300'}><div className="text-3xl">🏪</div><b>Quiosque</b><p className="text-sm text-slate-500">Estoque, reservas, pendências e funcionários (sistema atual).</p></Link>
        {['📦 Produtos', '🧾 Pedidos', '⚙️ Configurações'].map(t => <div key={t} className={card + ' opacity-60'}><div className="text-3xl">{t.split(' ')[0]}</div><b>{t.split(' ')[1]}</b><p className="text-sm text-slate-500">Em breve.</p></div>)}
      </div>
    </div>)
}
