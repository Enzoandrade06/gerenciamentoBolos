import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'
// o painel tem manifesto próprio (instala como "Admin", abrindo em /admin)
if (location.pathname.startsWith('/admin')) document.querySelector('link[rel="manifest"]')?.setAttribute('href', '/admin.webmanifest')
createRoot(document.getElementById('root')!).render(<App />)
