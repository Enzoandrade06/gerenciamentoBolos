import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'
// Cada área instala como um app diferente: loja (/), painel (/admin) e quiosque (/quiosque)
const m = location.pathname.startsWith('/admin') ? '/admin.webmanifest' : location.pathname.startsWith('/quiosque') ? '/quiosque.webmanifest' : null
if (m) document.querySelector('link[rel="manifest"]')?.setAttribute('href', m)
createRoot(document.getElementById('root')!).render(<App />)
