import { Link } from 'react-router-dom'

export default function Home() {
  const card = 'bg-white rounded-2xl shadow-sm p-5 block'
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Bem-vinda(o) ao painel 👋</h1>
      <p className="text-slate-600">Passo a passo: crie as categorias, cadastre os produtos e, nos dias de venda, lance o estoque em Abastecimento. Pedidos e configurações chegam nos próximos blocos.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/admin/categorias" className={card + ' hover:ring-2 ring-orange-300'}><div className="text-3xl">🗂️</div><b>Categorias</b><p className="text-sm text-slate-500">Criar, ordenar, ativar e desativar.</p></Link>
        <Link to="/admin/produtos" className={card + ' hover:ring-2 ring-orange-300'}><div className="text-3xl">📦</div><b>Produtos</b><p className="text-sm text-slate-500">Cadastrar, fotos, preços e prévia.</p></Link>
        <Link to="/admin/abastecimento" className={card + ' hover:ring-2 ring-orange-300'}><div className="text-3xl">📋</div><b>Abastecimento</b><p className="text-sm text-slate-500">Estoque do dia dos produtos de pronta entrega.</p></Link>
        <Link to="/admin/configuracoes" className={card + ' hover:ring-2 ring-orange-300'}><div className="text-3xl">⚙️</div><b>Configurações</b><p className="text-sm text-slate-500">Loja aberta/fechada, WhatsApp, entrega e Pix.</p></Link>
        <Link to="/admin/quiosque" className={card + ' hover:ring-2 ring-orange-300'}><div className="text-3xl">🏪</div><b>Quiosque</b><p className="text-sm text-slate-500">Estoque, reservas, pendências e funcionários (sistema atual).</p></Link>
        {['🧾 Pedidos'].map(t => <div key={t} className={card + ' opacity-60'}><div className="text-3xl">{t.split(' ')[0]}</div><b>{t.split(' ')[1]}</b><p className="text-sm text-slate-500">Em breve.</p></div>)}
      </div>
    </div>)
}
