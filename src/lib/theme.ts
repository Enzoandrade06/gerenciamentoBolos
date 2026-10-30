import { useEffect, useState } from 'react'
export type Theme = 'light' | 'dark' | 'auto'
const KEY = 'theme'
export const getTheme = (): Theme => { try { const t = localStorage.getItem(KEY); return t === 'dark' || t === 'light' ? t : 'auto' } catch { return 'auto' } }
export function applyTheme(t: Theme) {
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}
export const isDark = () => document.documentElement.classList.contains('dark')
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getTheme)
  const set = (n: Theme) => { try { localStorage.setItem(KEY, n) } catch { /* sem armazenamento */ } setTheme(n); applyTheme(n) }
  useEffect(() => {
    const m = matchMedia('(prefers-color-scheme: dark)'); const f = () => { if (getTheme() === 'auto') applyTheme('auto') }
    m.addEventListener('change', f); return () => m.removeEventListener('change', f)
  }, [])
  return { theme, set }
}
