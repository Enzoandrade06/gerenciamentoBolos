import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type Tabela = { titulo: string; cabecalho: string[]; linhas: (string | number)[][] }

function baixar(blob: Blob, nome: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nome
  a.click()
  URL.revokeObjectURL(a.href)
}

export function exportCSV(t: Tabela) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const txt = [t.cabecalho, ...t.linhas].map((l) => l.map(esc).join(';')).join('\n')
  baixar(new Blob(['\ufeff' + txt], { type: 'text/csv;charset=utf-8' }), `${t.titulo}.csv`)
}

export function exportXLSX(t: Tabela) {
  const ws = XLSX.utils.aoa_to_sheet([t.cabecalho, ...t.linhas])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Relatorio')
  XLSX.writeFile(wb, `${t.titulo}.xlsx`)
}

export function exportPDF(t: Tabela) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(t.titulo.replace(/_/g, ' '), 14, 16)
  autoTable(doc, { head: [t.cabecalho], body: t.linhas.map((l) => l.map(String)), startY: 22 })
  doc.save(`${t.titulo}.pdf`)
}
