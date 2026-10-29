// Limpa texto digitado: remove caracteres de controle e espaços repetidos
export const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
export const slugify = (s: string) =>
  clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 55)
// Textos longos (descrição): mantém quebras de linha, remove controle e limita linhas em branco
export const cleanLong = (s: string) => s.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
