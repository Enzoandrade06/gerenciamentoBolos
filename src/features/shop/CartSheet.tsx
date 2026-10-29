import { useNavigate } from 'react-router-dom'
import { Modal } from '../../components/ui'
import { centsToBRL } from '../../lib/money'
import { CartList, NoteField } from './CartList'
import { useCart } from './CartContext'

export default function CartSheet({ onClose }: { onClose: () => void }) {
  const cart = useCart(); const nav = useNavigate()
  return (
    <Modal title="Seu pedido" onClose={onClose}>
      {cart.items.length === 0 ? <p className="text-slate-500 text-center py-8">Seu carrinho está vazio.</p> : <>
        <CartList />
        <NoteField />
        <div className="flex justify-between text-lg font-extrabold border-t pt-3"><span>Subtotal</span><span>{centsToBRL(cart.subtotal)}</span></div>
        <button onClick={() => { onClose(); nav('/finalizar') }} className="w-full bg-green-600 text-white font-extrabold text-lg rounded-2xl py-4 active:scale-95">Continuar para finalizar</button>
      </>}
    </Modal>)
}
