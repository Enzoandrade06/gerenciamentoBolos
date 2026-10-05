import { createRoot } from 'react-dom/client'
import './index.css'
import Kiosk from './pages/Kiosk'
import Admin from './pages/Admin'
createRoot(document.getElementById('root')!).render(location.pathname.startsWith('/admin') ? <Admin/> : <Kiosk/>)
