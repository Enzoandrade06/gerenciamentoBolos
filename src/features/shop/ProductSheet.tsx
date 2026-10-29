import { useState } from 'react'
import { Modal } from '../../components/ui'
import type { CatalogProduct } from '../../lib/catalog'
import { publicImg } from '../../lib/image'
import { centsToBRL } from '../../lib/money'
import { clean } from '../../lib/text'
import { useCart } from './CartContext'

export default function ProductSheet({ p, open, onClose }: { p: CatalogProduct; open: boolean; onClose: () => void }) {
  const cart = useCart(); const [qty, setQty] = useState(1); const [note, setNote] = useState('')
  const blocked = p.sold_out || !open
  return (
    <Modal title={p.name} onClose={onClose}>
      <div className="aspect-square max-h-80 w-full rounded-2xl overflow-hidden bg-orange-100 flex items-center justify-center text-7xl">
        {p.image ? <img src={publicImg(p.image)} alt={p.name} className="w-full h-full object-cover" /> : '🍰'}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold bg-orange-100 text-orange-800 rounded-full px-3 py-1">{p.kind === 'order' ? 'Encomenda' : 'Pronta entrega'}</span>
        {p.sold_out && <span className="text-xs font-bold bg-slate-200 rounded-full px-3 py-1">Esgotado</span>}
      </div>
      {p.description && <p className="text-slate-600 whitespace-pre-line">{p.description}</p>}
      {p.kind === 'order' && <p className="text-sm text-slate-500">Encomenda: você escolhe a data ao finalizar o pedido.</p>}
      <div className="text-2xl font-extrabold text-orange-600">{centsToBRL(p.price_cents)}</div>
      <label className="block"><span className="font-semibold">Observações (opcional)</span>
        <input value={note} maxLength={200} onChange={e => setNote(e.target.value)} placeholder="Ex.: sem granulado" className="w-full border-2 border-orange-200 rounded-xl p-3 mt-1" /></label>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <button aria-label="Diminuir" onClick={() => setQty(Math.max(1, qty - 1))} className="w-11 h-11 rounded-full bg-orange-100 text-orange-800 text-2xl font-bold">−</button>
          <span className="w-8 text-center text-xl font-extrabold">{qty}</span>
          <button aria-label="Aumentar" onClick={() => setQty(Math.min(50, qty + 1))} className="w-11 h-11 rounded-full bg-orange-100 text-orange-800 text-2xl font-bold">+</button>
        </div>
        <button disabled={blocked} onClick={() => { cart.add({ id: p.id, name: p.name, priceCents: p.price_cents, kind: p.kind, image: p.image }, qty, clean(note)); onClose() }}
          className="flex-1 bg-green-600 disabled:bg-slate-300 text-white font-extrabold rounded-2xl py-3 active:scale-95">
          {blocked ? (p.sold_out ? 'Esgotado' : 'Loja fechada') : `Adicionar · ${centsToBRL(p.price_cents * qty)}`}
        </button>
      </div>
    </Modal>)
}
