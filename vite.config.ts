import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({plugins:[react(),tailwind(),VitePWA({registerType:'autoUpdate',manifest:{name:'Bolos de Pote',short_name:'Bolos',display:'fullscreen',orientation:'portrait',background_color:'#fff7ed',theme_color:'#f97316',start_url:'/',icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png'},{src:'icon-512.png',sizes:'512x512',type:'image/png'}]}})]})
