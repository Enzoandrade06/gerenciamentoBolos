import { Navigate, Route, Routes } from 'react-router-dom'
import Kiosk from './pages/Kiosk'
import Login from './pages/admin/Login'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Pendencias from './pages/admin/Pendencias'
import Funcionarios from './pages/admin/Funcionarios'
import Abastecimento from './pages/admin/Abastecimento'
import Relatorios from './pages/admin/Relatorios'
import Config from './pages/admin/Config'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Kiosk />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="pendencias" element={<Pendencias />} />
        <Route path="funcionarios" element={<Funcionarios />} />
        <Route path="abastecimento" element={<Abastecimento />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="config" element={<Config />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
