// Dinheiro sempre em centavos inteiros (nada de ponto flutuante salvo no banco)
export const centsToBRL = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const centsToInput = (c: number) => (c / 100).toFixed(2).replace('.', ',')
export function parseToCents(input: string): number | null {
  const s = input.replace(/[^\d,.]/g, '').trim()
  if (!s) return null
  let n: string
  if (s.includes(',')) n = s.replace(/\./g, '').replace(',', '.')      // 1.234,56 -> 1234.56
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) n = s.replace(/\./g, '')       // 1.234 -> 1234
  else n = s                                                              // 12.5 -> 12.5
  const v = Number(n)
  if (!isFinite(v) || v <= 0 || v > 100000) return null
  return Math.round(v * 100)
}
export const brToday = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Sao_Paulo' })  // AAAA-MM-DD
