export type Func = { id: string; nome: string; setor: string; telefone: string | null; ativo: boolean; created_at: string }
export type Sabor = { id: number; nome: string; ativo: boolean; ordem: number }
export type Estoque = {
  dia_id: string; data: string; status: 'aberto' | 'fechado'; sabor_id: number; sabor: string; ordem: number
  inicial: number; vendidos: number; saldo: number; sobra_informada: number | null
}
export type Relatorio = {
  vendido_qtd: number; faturamento: number; recebido: number; pendente: number
  produzido: number; perdido_qtd: number; preco: number
  por_sabor: { sabor: string; qtd: number }[]
  funcionarios: { nome: string; qtd: number; valor: number }[]
  dias: { data: string; inicial: number; vendidos: number; restante: number; perdidos: number; fechado: boolean }[]
}
