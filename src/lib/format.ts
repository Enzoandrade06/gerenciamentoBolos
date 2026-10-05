export const brl = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
export const fmtData = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')
export const fmtHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
export const potes = (n: number) => `${n} ${n === 1 ? 'pote' : 'potes'}`

export const addDias = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}

export type Periodo = 'dia' | 'semana' | 'mes'
export function periodo(tipo: Periodo, ref = hoje()): [string, string] {
  if (tipo === 'dia') return [ref, ref]
  const d = new Date(ref + 'T12:00:00')
  if (tipo === 'semana') {
    const ini = addDias(ref, -((d.getDay() + 6) % 7))
    return [ini, addDias(ini, 6)]
  }
  const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('sv-SE')
  return [ref.slice(0, 8) + '01', fim]
}

export const limpar = (s: string) => s.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim()
