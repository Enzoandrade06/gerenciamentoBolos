import { publicImg } from '../../lib/image'
import { centsToBRL } from '../../lib/money'
import { useCart } from './CartContext'

export function CartList({ unavailable = [] as string[] }) {
  const cart = useCart()
  return (
    <ul className="space-y-3">
      {cart.items.map(i => {
        const bad = unavailable.includes(i.id)
        return (
          <li key={i.id} className={`flex gap-3 items-center ${bad ? 'opacity-60' : ''}`}>
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-orange-100 flex items-center justify-center text-2xl shrink-0">
              {i.image ? <img src={publicImg(i.image, true)} alt="" className="w-full h-full object-cover" /> : '🍰'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold leading-tight truncate">{i.name}</div>
              <div className="text-xs text-slate-500">{centsToBRL(i.priceCents)} cada{i.note ? ` · ${i.note}` : ''}</div>
              {bad && <div className="text-xs font-bold text-red-600">Indisponível no momento</div>}
              <div className="flex items-center gap-2 mt-1">
                <button aria-label="Diminuir" onClick={() => cart.setQty(i.id, i.qty - 1)} className="w-9 h-9 rounded-full bg-orange-100 text-orange-800 text-xl font-bold">−</button>
                <span className="w-6 text-center font-bold">{i.qty}</span>
                <button aria-label="Aumentar" onClick={() => cart.setQty(i.id, i.qty + 1)} className="w-9 h-9 rounded-full bg-orange-100 text-orange-800 text-xl font-bold">+</button>
              </div>
            </div>
            <div className="text-right">
              <div className="font-extrabold">{centsToBRL(i.priceCents * i.qty)}</div>
              <button onClick={() => cart.remove(i.id)} className="text-xs text-red-600 underline mt-1">Remover</button>
            </div>
          </li>)
      })}
    </ul>)
}
export function NoteField() {
  const cart = useCart()
  return (
    <label className="block"><span className="font-semibold">Observações do pedido (opcional)</span>
      <textarea value={cart.note} maxLength={300} rows={2} onChange={e => cart.setNote(e.target.value)} placeholder="Ex.: sem granulado, entregar na portaria…"
        className="w-full border-2 border-orange-200 rounded-xl p-3 bg-white mt-1" /></label>)
}
