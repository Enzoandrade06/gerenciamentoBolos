import { useCallback, useEffect, useState } from 'react'
import { fetchCatalog, type Catalog, type CatalogProduct } from '../../lib/catalog'
import { publicImg } from '../../lib/image'
import { centsToBRL } from '../../lib/money'
import { Loading } from '../../components/ui'
import { useCart } from './CartContext'
import ProductSheet from './ProductSheet'
import CartSheet from './CartSheet'

function Card({ p, qty, open, onOpen, onAdd }: { p: CatalogProduct; qty: number; open: boolean; onOpen: () => void; onAdd: () => void }) {
  const off = p.sold_out || !open
  return (
    <article className="bg-white rounded-2xl shadow-sm overflow-hidden border border-orange-100 flex flex-col">
      <button onClick={onOpen} className="text-left" aria-label={`Ver ${p.name}`}>
        <div className={`relative aspect-square bg-orange-100 flex items-center justify-center text-6xl ${p.sold_out ? 'grayscale' : ''}`}>
          {p.image ? <img src={publicImg(p.image, true)} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : '🍰'}
          <span className="absolute top-2 left-2 text-[11px] font-bold bg-white/90 rounded-full px-2 py-1">{p.kind === 'order' ? 'Encomenda' : 'Pronta entrega'}</span>
          {p.sold_out && <span className="absolute inset-x-0 bottom-0 bg-slate-800/85 text-white text-center text-sm font-bold py-1">Esgotado</span>}
          {qty > 0 && <span className="absolute top-2 right-2 bg-green-600 text-white text-xs font-extrabold rounded-full min-w-6 h-6 px-1 flex items-center justify-center">{qty}</span>}
        </div>
        <div className="p-3 pb-1">
          <h3 className="font-extrabold leading-tight">{p.name}</h3>
          {p.description && <p className="text-sm text-slate-500 line-clamp-2 mt-1 whitespace-pre-line">{p.description}</p>}
        </div>
      </button>
      <div className="px-3 pb-3 mt-auto flex items-center justify-between gap-2">
        <span className="text-lg font-extrabold text-orange-600">{centsToBRL(p.price_cents)}</span>
        <button disabled={off} onClick={onAdd} aria-label={`Adicionar ${p.name}`} className="w-11 h-11 rounded-full bg-orange-500 disabled:bg-slate-300 text-white text-2xl font-bold active:scale-95">+</button>
      </div>
    </article>)
}

export default function Shop() {
  const cart = useCart()
  const [data, setData] = useState<Catalog | null>(null); const [error, setError] = useState(false)
  const [cat, setCat] = useState('all'); const [sel, setSel] = useState<CatalogProduct | null>(null); const [cartOpen, setCartOpen] = useState(false)
  const load = useCallback(() => fetchCatalog().then(d => { setData(d); setError(false) }).catch(() => setError(true)), [])
  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    const v = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', v)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', v) }
  }, [load])

  if (!data) return error
    ? <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center gap-3 p-6 text-center"><div className="text-5xl">📶</div><p>Não foi possível carregar o cardápio. Verifique a conexão.</p><button onClick={load} className="bg-orange-500 text-white font-bold rounded-xl px-5 py-3">Tentar de novo</button></div>
    : <Loading text="Carregando o cardápio…" />

  const open = data.store.is_open
  const cats = data.categories.filter(c => data.products.some(p => p.category_id === c.id))
  const active = cat === 'all' || cats.some(c => c.id === cat) ? cat : 'all'
  const inCart = (id: string) => cart.items.find(i => i.id === id)?.qty ?? 0
  const add = (p: CatalogProduct) => cart.add({ id: p.id, name: p.name, priceCents: p.price_cents, kind: p.kind, image: p.image }, 1, '')
  const grid = (list: CatalogProduct[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {list.map(p => <Card key={p.id} p={p} qty={inCart(p.id)} open={open} onOpen={() => setSel(p)} onAdd={() => add(p)} />)}
    </div>)

  return (
    <div className="min-h-screen bg-orange-50 text-slate-800 pb-28">
      <header className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 py-6 text-center shadow">
        <h1 className="text-2xl font-extrabold">🍰 {data.store.name}</h1>
        <p className="opacity-90 text-sm mt-1">{open ? 'Escolha seus doces e faça seu pedido' : 'Estamos fechados no momento'}</p>
      </header>
      {!open && <div role="status" className="bg-slate-800 text-white text-center text-sm py-2 px-4">A loja está fechada agora. Você pode olhar o cardápio, mas não é possível pedir.</div>}
      {cats.length > 0 && (
        <nav className="sticky top-0 z-10 bg-orange-50/95 backdrop-blur border-b border-orange-100">
          <div className="max-w-5xl mx-auto flex gap-2 overflow-x-auto px-4 py-3">
            {[{ id: 'all', name: 'Tudo' }, ...cats].map(c => (
              <button key={c.id} onClick={() => setCat(c.id)} className={`whitespace-nowrap rounded-full px-4 py-2 font-semibold border ${active === c.id ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-orange-200'}`}>{c.name}</button>))}
          </div>
        </nav>)}
      <main className="max-w-5xl mx-auto p-4 space-y-6">
        {data.products.length === 0 && <div className="text-center text-slate-500 py-16"><div className="text-5xl mb-2">🍰</div>Nenhum produto disponível agora. Volte mais tarde!</div>}
        {active === 'all'
          ? cats.map(c => <section key={c.id}><h2 className="text-lg font-extrabold mb-2">{c.name}</h2>{grid(data.products.filter(p => p.category_id === c.id))}</section>)
          : grid(data.products.filter(p => p.category_id === active))}
      </main>
      {cart.count > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg p-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <button onClick={() => setCartOpen(true)} className="max-w-5xl mx-auto w-full flex items-center justify-between bg-green-600 text-white font-extrabold rounded-2xl px-5 py-4 active:scale-95">
            <span>🛒 Ver carrinho ({cart.count})</span><span>{centsToBRL(cart.subtotal)}</span></button>
        </div>)}
      {sel && <ProductSheet key={sel.id} p={sel} open={open} onClose={() => setSel(null)} />}
      {cartOpen && <CartSheet onClose={() => setCartOpen(false)} />}
    </div>)
}
