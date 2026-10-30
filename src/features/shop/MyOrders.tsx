import { Link } from 'react-router-dom'
import { Modal } from '../../components/ui'
import { getMyOrders } from '../../lib/myOrders'

export default function MyOrders({ onClose }: { onClose: () => void }) {
  const list = getMyOrders()
  return (
    <Modal title="Meus pedidos" onClose={onClose}>
      {list.length === 0 ? <p className="text-muted text-center py-6">Os pedidos feitos neste aparelho aparecem aqui.</p> : (
        <ul className="space-y-2">
          {list.map(o => (
            <li key={o.token}><Link to={`/pedido/${o.token}`} onClick={onClose} className="flex items-center justify-between bg-paper rounded-2xl px-4 py-3 border border-line">
              <b>Pedido #{o.number}</b><span className="text-sm text-muted">{new Date(o.at).toLocaleDateString('pt-BR')} ›</span></Link></li>))}
        </ul>)}
      <p className="text-xs text-muted">Por segurança, a lista fica só neste aparelho e navegador.</p>
    </Modal>)
}
