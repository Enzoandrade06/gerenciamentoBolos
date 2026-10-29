import { sb } from './supabase'
export type StoreInfo = { name: string; is_open: boolean; delivery_enabled: boolean; delivery_fee_cents: number; whatsapp: string | null; min_days_custom: number; soldout_behavior: 'hide' | 'show' }
export type CatalogCategory = { id: string; name: string; slug: string }
export type CatalogProduct = { id: string; category_id: string; name: string; description: string; price_cents: number; kind: 'stock' | 'order'; sort_order: number; image: string | null; sold_out: boolean }
export type Catalog = { store: StoreInfo; categories: CatalogCategory[]; products: CatalogProduct[] }
export async function fetchCatalog(): Promise<Catalog> {
  const r = await sb.rpc('get_catalog')
  if (r.error || !r.data) throw new Error('Não foi possível carregar o cardápio.')
  return r.data as Catalog
}
