import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Kiosk from '../features/legacy/Kiosk'
import { Loading, NotFound } from '../components/ui'
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
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* "/" continua sendo o quiosque até a loja ficar pronta (bloco 4) */}
          <Route path="/" element={<Kiosk />} />
          <Route path="/quiosque" element={<Kiosk />} />
          <Route path="/pedido" element={<Pedido />} />
          <Route path="/reservas" element={<Pedido />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Home />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="abastecimento" element={<Abastecimento />} />
            <Route path="quiosque" element={<Quiosque />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>)
}
