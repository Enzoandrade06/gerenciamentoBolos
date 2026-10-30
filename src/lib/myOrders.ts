// Pedidos feitos neste aparelho (sem login): só guarda o código secreto e o número
const KEY = 'my-orders-v1'
export type MyOrder = { token: string; number: number; at: string }
export function getMyOrders(): MyOrder[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter(o => o && typeof o.token === 'string' && /^[0-9a-f]{32}$/.test(o.token) && Number.isInteger(o.number)).slice(0, 10) : []
  } catch { return [] }
}
export function saveMyOrder(o: MyOrder) {
  try { localStorage.setItem(KEY, JSON.stringify([o, ...getMyOrders().filter(x => x.token !== o.token)].slice(0, 10))) } catch { /* ignora */ }
}
