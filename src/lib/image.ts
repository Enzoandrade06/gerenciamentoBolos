import { sb } from './supabase'
const BUCKET = 'product-images'
const MAX_INPUT = 10 * 1024 * 1024   // foto de celular, antes de reduzir
const MAX_OUTPUT = 2 * 1024 * 1024   // mesmo limite do bucket

export const thumbPath = (p: string) => p.replace(/(\.\w+)$/, '-t$1')
export const publicImg = (path: string, thumb = false) => sb.storage.from(BUCKET).getPublicUrl(thumb ? thumbPath(path) : path).data.publicUrl

// Confere o conteúdo real do arquivo (não só a extensão) e recodifica: isso também remove metadados e qualquer conteúdo escondido
async function sniff(file: File) {
  const h = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const jpg = h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff
  const png = h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47
  const webp = h[0] === 0x52 && h[1] === 0x49 && h[2] === 0x46 && h[3] === 0x46 && h[8] === 0x57 && h[9] === 0x45 && h[10] === 0x42 && h[11] === 0x50
  return jpg || png || webp
}
async function encode(bmp: ImageBitmap, max: number, quality: number, alpha = false): Promise<{ blob: Blob; ext: string }> {
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * r)), h = Math.max(1, Math.round(bmp.height * r))
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d'); if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.')
  if (!alpha) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h) }   // logo mantém o fundo transparente
  ctx.drawImage(bmp, 0, 0, w, h)
  const toBlob = (type: string) => new Promise<Blob | null>(res => c.toBlob(res, type, quality))
  const webp = await toBlob('image/webp')
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' }
  if (alpha) { const png = await toBlob('image/png'); if (png && png.type === 'image/png') return { blob: png, ext: 'png' } }
  const jpg = await toBlob('image/jpeg')   // navegadores antigos
  if (jpg && jpg.type === 'image/jpeg') return { blob: jpg, ext: 'jpg' }
  throw new Error('Seu navegador não conseguiu converter a imagem.')
}

export async function uploadProductImage(productId: string, file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use uma imagem JPG, PNG ou WebP.')
  if (file.size > MAX_INPUT) throw new Error('A imagem é grande demais (máximo 10 MB).')
  if (!(await sniff(file))) throw new Error('Esse arquivo não parece ser uma imagem JPG, PNG ou WebP.')
  let bmp: ImageBitmap
  try { bmp = await createImageBitmap(file) } catch { throw new Error('Não foi possível abrir essa imagem.') }
  const main = await encode(bmp, 1000, 0.82); const thumb = await encode(bmp, 360, 0.8); bmp.close()
  if (main.blob.size > MAX_OUTPUT) throw new Error('A imagem ficou grande demais. Tente uma foto menor.')
  const base = `products/${productId}/${crypto.randomUUID()}`
  const path = `${base}.${main.ext}`
  const opt = (b: Blob) => ({ contentType: b.type, cacheControl: '31536000', upsert: false })
  const a = await sb.storage.from(BUCKET).upload(path, main.blob, opt(main.blob))
  if (a.error) throw new Error('Falha ao enviar a imagem.')
  const t = await sb.storage.from(BUCKET).upload(thumbPath(path), thumb.blob, opt(thumb.blob))
  if (t.error) { await sb.storage.from(BUCKET).remove([path]); throw new Error('Falha ao enviar a imagem.') }
  const row = await sb.from('product_images').insert({ product_id: productId, path })
  if (row.error) { await sb.storage.from(BUCKET).remove([path, thumbPath(path)]); throw new Error('Falha ao registrar a imagem.') }
  return path
}
export async function removeProductImages(imgs: { id: string; path: string }[]) {
  if (!imgs.length) return
  await sb.from('product_images').delete().in('id', imgs.map(i => i.id))
  await sb.storage.from(BUCKET).remove(imgs.flatMap(i => [i.path, thumbPath(i.path)]))
}

// Logo da loja: mesma validação das fotos, até 512 px, com transparência
export async function uploadBrandLogo(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use uma imagem JPG, PNG ou WebP.')
  if (file.size > MAX_INPUT) throw new Error('A imagem é grande demais (máximo 10 MB).')
  if (!(await sniff(file))) throw new Error('Esse arquivo não parece ser uma imagem JPG, PNG ou WebP.')
  let bmp: ImageBitmap
  try { bmp = await createImageBitmap(file) } catch { throw new Error('Não foi possível abrir essa imagem.') }
  const out = await encode(bmp, 512, 0.9, true); bmp.close()
  if (out.blob.size > MAX_OUTPUT) throw new Error('A imagem ficou grande demais. Tente uma menor.')
  const path = `branding/${crypto.randomUUID()}.${out.ext}`
  const up = await sb.storage.from(BUCKET).upload(path, out.blob, { contentType: out.blob.type, cacheControl: '31536000', upsert: false })
  if (up.error) throw new Error('Falha ao enviar a logo.')
  return path
}
export async function removeBrandLogo(path: string | null | undefined) { if (path) await sb.storage.from(BUCKET).remove([path]) }
