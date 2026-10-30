import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CartProvider } from '../features/shop/CartContext'
import Shop from '../features/shop/Shop'
import { Loading, NotFound } from '../components/ui'
const Kiosk = lazy(() => import('../features/legacy/Kiosk'))
const Checkout = lazy(() => import('../features/shop/Checkout'))
const OrderPage = lazy(() => import('../features/shop/OrderPage'))
const Pedidos = lazy(() => import('../features/admin/Pedidos'))
const Clientes = lazy(() => import('../features/admin/Clientes'))
const Configuracoes = lazy(() => import('../features/admin/Configuracoes'))
const Pedido = lazy(() => import('../features/legacy/Pedido'))
const AdminLayout = lazy(() => import('../features/admin/AdminLayout'))
const Login = lazy(() => import('../features/admin/Login'))
const Home = lazy(() => import('../features/admin/Home'))
const Categorias = lazy(() => import('../features/admin/Categorias'))
const Produtos = lazy(() => import('../features/admin/Produtos'))
const Abastecimento = lazy(() => import('../features/admin/Abastecimento'))
const Quiosque = lazy(() => import('../features/admin/Quiosque'))

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Shop />} />
          <Route path="/finalizar" element={<Checkout />} />
          <Route path="/pedido/:token" element={<OrderPage />} />
          <Route path="/quiosque" element={<Kiosk />} />
          <Route path="/pedido" element={<Pedido />} />
          <Route path="/reservas" element={<Pedido />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Home />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="abastecimento" element={<Abastecimento />} />
            <Route path="pedidos" element={<Pedidos />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="quiosque" element={<Quiosque />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </CartProvider>
    </BrowserRouter>)
}
