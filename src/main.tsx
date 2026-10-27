import { createRoot } from 'react-dom/client'
import './index.css'
import Kiosk from './pages/Kiosk'
import Admin from './pages/Admin'
import Pedido from './pages/Pedido'
const path = location.pathname
if (path.startsWith('/admin')) document.querySelector('link[rel="manifest"]')?.setAttribute('href', '/admin.webmanifest')
createRoot(document.getElementById('root')!).render(path.startsWith('/admin') ? <Admin /> : path.startsWith('/pedido') ? <Pedido /> : <Kiosk />)
