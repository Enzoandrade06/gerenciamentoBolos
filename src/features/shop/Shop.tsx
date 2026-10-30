import { useCallback, useEffect, useState } from 'react'
import { fetchCatalog, type Catalog, type CatalogProduct } from '../../lib/catalog'
import { publicImg } from '../../lib/image'
import { centsToBRL } from '../../lib/money'
import { waLink } from '../../lib/whatsapp'
import { Loading, ThemeToggle } from '../../components/ui'
import { useCart } from './CartContext'
import ProductSheet from './ProductSheet'
import CartSheet from './CartSheet'
import MyOrders from './MyOrders'

function Card({ p, qty, open, onOpen, onAdd }: { p: CatalogProduct; qty: number; open: boolean; onOpen: () => void; onAdd: () => void }) {
  const off = p.sold_out || !open
  return (
    <article className="bg-card rounded-3xl shadow-sm overflow-hidden border border-line flex flex-col">
      <button onClick={onOpen} className="text-left" aria-label={`Ver ${p.name}`}>
        <div className={`relative aspect-square bg-sand-100 flex items-center justify-center text-6xl ${p.sold_out ? 'grayscale' : ''}`}>
          {p.image ? <img src={publicImg(p.image, true)} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : '🍰'}
          <span className="absolute top-2 left-2 text-[11px] font-bold bg-card/90 rounded-full px-2 py-1">{p.kind === 'order' ? '🎂 Encomenda' : '✨ Pronta entrega'}</span>
          {p.sold_out && <span className="absolute inset-x-0 bottom-0 bg-slate-800/85 text-white text-center text-sm font-bold py-1">Esgotado</span>}
          {qty > 0 && <span className="absolute top-2 right-2 bg-brand-500 text-white text-xs font-extrabold rounded-full min-w-6 h-6 px-1 flex items-center justify-center">{qty}</span>}
        </div>
        <div className="p-4 pb-1">
          <h3 className="font-extrabold leading-tight">{p.name}</h3>
          {p.description && <p className="text-sm text-muted line-clamp-2 mt-1 whitespace-pre-line">{p.description}</p>}
        </div>
      </button>
      <div className="px-4 pb-4 mt-auto flex items-center justify-between gap-2">
        <span className="text-base font-extrabold text-brand-700 bg-brand-100 rounded-full px-3 py-1">{centsToBRL(p.price_cents)}</span>
        <button disabled={off} onClick={onAdd} aria-label={`Adicionar ${p.name}`} className="w-11 h-11 rounded-full bg-brand-500 disabled:bg-slate-400 text-white text-2xl font-bold active:scale-95 shadow">+</button>
      </div>
    </article>)
}

export default function Shop() {
  const cart = useCart()
  const [data, setData] = useState<Catalog | null>(null); const [error, setError] = useState(false)
  const [cat, setCat] = useState('all'); const [q, setQ] = useState('')
  const [sel, setSel] = useState<CatalogProduct | null>(null); const [cartOpen, setCartOpen] = useState(false); const [ordersOpen, setOrdersOpen] = useState(false)
  const load = useCallback(() => fetchCatalog().then(d => { setData(d); setError(false) }).catch(() => setError(true)), [])
  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    const v = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', v)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', v) }
  }, [load])

  if (!data) return error
    ? <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-3 p-6 text-center"><div className="text-5xl">📶</div><p>Não foi possível carregar o cardápio. Verifique a conexão.</p><button onClick={load} className="bg-brand-500 text-white font-bold rounded-xl px-5 py-3">Tentar de novo</button></div>
    : <Loading text="Carregando o cardápio…" />

  const st = data.store; const open = st.is_open
  const term = q.trim().toLowerCase()
  const products = data.products.filter(p => !term || p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term))
  const cats = data.categories.filter(c => data.products.some(p => p.category_id === c.id))
  const active = cat === 'all' || cats.some(c => c.id === cat) ? cat : 'all'
  const inCart = (id: string) => cart.items.find(i => i.id === id)?.qty ?? 0
  const add = (p: CatalogProduct) => cart.add({ id: p.id, name: p.name, priceCents: p.price_cents, kind: p.kind, image: p.image }, 1, '')
  const grid = (list: CatalogProduct[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {list.map(p => <Card key={p.id} p={p} qty={inCart(p.id)} open={open} onOpen={() => setSel(p)} onAdd={() => add(p)} />)}
    </div>)
  const hasOrderKind = data.products.some(p => p.kind === 'order')

  return (
    <div className="min-h-screen bg-paper text-ink pb-28">
      <div className="max-w-5xl mx-auto flex items-center justify-end gap-2 px-4 pt-3">
        <button onClick={() => setOrdersOpen(true)} className="rounded-full bg-card border border-line px-4 h-10 text-sm font-semibold">🧾 Meus pedidos</button>
        <ThemeToggle />
      </div>
      <header className="text-center px-5 pt-4 pb-8 bg-gradient-to-b from-brand-100 via-sand-100 to-paper">
        <div className="w-28 h-28 rounded-full mx-auto bg-card border-4 border-card shadow-lg overflow-hidden flex items-center justify-center text-5xl">
          {st.logo ? <img src={publicImg(st.logo)} alt={`Logo ${st.name}`} className="w-full h-full object-cover" /> : '🍰'}
        </div>
        <h1 className="text-3xl font-extrabold mt-4 tracking-tight">{st.name}</h1>
        {st.tagline && <p className="text-muted mt-1">{st.tagline}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm font-semibold">
          <span className={`rounded-full px-3 py-1 ${open ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'}`}>{open ? '● Aberto para pedidos' : '● Fechado no momento'}</span>
          <span className="rounded-full px-3 py-1 bg-card border border-line">🏪 Retirada</span>
          {st.delivery_enabled && <span className="rounded-full px-3 py-1 bg-card border border-line">🛵 Entrega{st.delivery_fee_cents > 0 ? ` · ${centsToBRL(st.delivery_fee_cents)}` : ''}</span>}
          {hasOrderKind && <span className="rounded-full px-3 py-1 bg-card border border-line">🎂 Encomendas com {st.min_days_custom} dia(s)</span>}
        </div>
      </header>
      {!open && <div role="status" className="bg-slate-800 text-white text-center text-sm py-2 px-4">A loja está fechada agora. Você pode olhar o cardápio, mas não é possível pedir.</div>}
      <div className="max-w-5xl mx-auto px-4 -mt-3">
        <label className="block"><span className="sr-only">Buscar no cardápio</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔎 Buscar no cardápio" className="w-full rounded-full border border-line bg-card px-5 py-3 shadow-sm outline-none focus:border-brand-400" /></label>
      </div>
      {cats.length > 0 && (
        <nav className="sticky top-0 z-10 bg-paper/95 backdrop-blur mt-3 border-b border-line">
          <div className="max-w-5xl mx-auto flex gap-2 overflow-x-auto px-4 py-3">
            {[{ id: 'all', name: 'Tudo' }, ...cats].map(c => (
              <button key={c.id} onClick={() => setCat(c.id)} className={`whitespace-nowrap rounded-full px-5 py-2 font-semibold border ${active === c.id ? 'bg-brand-500 text-white border-brand-500' : 'bg-card border-line'}`}>{c.name}</button>))}
          </div>
        </nav>)}
      <main className="max-w-5xl mx-auto p-4 space-y-8">
        {data.products.length === 0 && <div className="text-center text-muted py-16"><div className="text-5xl mb-2">🍰</div>Nenhum produto disponível agora. Volte mais tarde!</div>}
        {data.products.length > 0 && products.length === 0 && <p className="text-center text-muted py-10">Nada encontrado para "{q}".</p>}
        {active === 'all'
          ? cats.map(c => { const l = products.filter(p => p.category_id === c.id); return l.length ? <section key={c.id}><h2 className="text-xl font-extrabold mb-3 flex items-center gap-3">{c.name}<span className="flex-1 h-px bg-line" /></h2>{grid(l)}</section> : null })
          : grid(products.filter(p => p.category_id === active))}
      </main>
      <footer className="text-center text-sm text-muted pb-6 space-y-1">
        {st.whatsapp && <a href={waLink(st.whatsapp, `Olá! Vim pelo cardápio do ${st.name} 🍰`)} className="inline-block rounded-full bg-card border border-line px-4 py-2 font-semibold text-ink">💬 Falar com a loja</a>}
        <div>{st.name}</div>
      </footer>
      {cart.count > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-card border-t shadow-lg p-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <button onClick={() => setCartOpen(true)} className="max-w-5xl mx-auto w-full flex items-center justify-between bg-brand-500 text-white font-extrabold rounded-2xl px-5 py-4 active:scale-95 shadow">
            <span>🛒 Ver carrinho ({cart.count})</span><span>{centsToBRL(cart.subtotal)}</span></button>
        </div>)}
      {sel && <ProductSheet key={sel.id} p={sel} open={open} onClose={() => setSel(null)} />}
      {cartOpen && <CartSheet onClose={() => setCartOpen(false)} />}
      {ordersOpen && <MyOrders onClose={() => setOrdersOpen(false)} />}
    </div>)
}
