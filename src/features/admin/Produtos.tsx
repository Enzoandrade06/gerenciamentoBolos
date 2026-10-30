import { useCallback, useEffect, useMemo, useState } from 'react'
import { sb } from '../../lib/supabase'
import { clean, cleanLong } from '../../lib/text'
import { brToday, centsToBRL, centsToInput, parseToCents } from '../../lib/money'
import { publicImg, removeProductImages, uploadProductImage } from '../../lib/image'
import { Loading, Modal, Notice } from '../../components/ui'

type Cat = { id: string; name: string; is_active: boolean }
type Img = { id: string; path: string }
type Prod = { id: string; category_id: string; name: string; description: string; price_cents: number; kind: 'stock' | 'order'; is_active: boolean; is_available: boolean; stock_qty: number | null; stock_date: string | null; sort_order: number; product_images: Img[] }
type Form = { id?: string; category_id: string; name: string; description: string; price: string; kind: 'stock' | 'order'; is_active: boolean; is_available: boolean; file: File | null; removeImage: boolean; existing: Img[] }
type Msg = { ok: boolean; text: string } | null
const btn = 'rounded-lg px-3 py-2 font-semibold active:scale-95 disabled:opacity-40'
const inp = 'w-full border-2 border-brand-200 rounded-xl p-3 bg-card'

function Preview({ name, description, priceCents, kind, imageUrl, status }: { name: string; description: string; priceCents: number | null; kind: string; imageUrl: string | null; status: string }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-card shadow border border-line max-w-xs mx-auto">
      <div className="relative aspect-square bg-brand-100 flex items-center justify-center text-6xl">
        {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : '🍰'}
        <span className="absolute top-2 left-2 text-xs font-bold bg-card/90 rounded-full px-2 py-1">{kind === 'order' ? 'Encomenda' : 'Pronta entrega'}</span>
        {status && <span className="absolute inset-x-0 bottom-0 bg-slate-800/80 text-white text-center text-sm py-1">{status}</span>}
      </div>
      <div className="p-3 space-y-1">
        <div className="font-extrabold leading-tight">{name || 'Nome do produto'}</div>
        <p className="text-sm text-muted line-clamp-2 whitespace-pre-line">{description || 'Descrição do produto'}</p>
        <div className="text-lg font-extrabold text-brand-600">{priceCents ? centsToBRL(priceCents) : 'R$ 0,00'}</div>
      </div>
    </div>)
}

export default function Produtos() {
  const [cats, setCats] = useState<Cat[]>([]); const [list, setList] = useState<Prod[]>([]); const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all'); const [q, setQ] = useState('')
  const [form, setForm] = useState<Form | null>(null); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<Msg>(null)
  const say = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 5000) }

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([
      sb.from('categories').select('id,name,is_active').order('sort_order'),
      sb.from('products').select('id,category_id,name,description,price_cents,kind,is_active,is_available,stock_qty,stock_date,sort_order,product_images(id,path)').order('sort_order').order('name'),
    ])
    if (c.error || p.error) setMsg({ ok: false, text: 'Não foi possível carregar os produtos.' })
    setCats((c.data ?? []) as Cat[]); setList((p.data ?? []) as unknown as Prod[]); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const previewUrl = useMemo(() => (form?.file ? URL.createObjectURL(form.file) : null), [form?.file])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const catName = (id: string) => cats.find(c => c.id === id)?.name ?? '—'
  const shown = list.filter(p => (filter === 'all' || p.category_id === filter) && p.name.toLowerCase().includes(q.trim().toLowerCase()))

  function openNew() {
    const first = cats.find(c => c.id === filter) ?? cats.find(c => c.is_active) ?? cats[0]
    if (!first) return say(false, 'Crie uma categoria primeiro (menu Categorias).')
    setForm({ category_id: first.id, name: '', description: '', price: '', kind: 'stock', is_active: false, is_available: true, file: null, removeImage: false, existing: [] })
  }
  function openEdit(p: Prod) {
    setForm({ id: p.id, category_id: p.category_id, name: p.name, description: p.description, price: centsToInput(p.price_cents), kind: p.kind, is_active: p.is_active, is_available: p.is_available, file: null, removeImage: false, existing: p.product_images })
  }

  async function save() {
    if (!form || busy) return
    const name = clean(form.name); const description = cleanLong(form.description); const cents = parseToCents(form.price)
    if (name.length < 2 || name.length > 80) return say(false, 'O nome precisa ter de 2 a 80 caracteres.')
    if (description.length > 1000) return say(false, 'A descrição passou de 1000 caracteres.')
    if (!cents) return say(false, 'Digite um preço válido, por exemplo 12,00.')
    if (!form.category_id) return say(false, 'Escolha uma categoria.')
    setBusy(true)
    const payload = { category_id: form.category_id, name, description, price_cents: cents, kind: form.kind, is_active: form.is_active, is_available: form.is_available }
    let id = form.id
    if (id) {
      const r = await sb.from('products').update(payload).eq('id', id)
      if (r.error) { setBusy(false); return say(false, 'Não foi possível salvar. Confira os campos.') }
    } else {
      const order = list.reduce((m, p) => Math.max(m, p.sort_order), 0) + 1
      const r = await sb.from('products').insert({ ...payload, sort_order: order }).select('id').single()
      if (r.error || !r.data) { setBusy(false); return say(false, 'Não foi possível criar o produto. Confira os campos.') }
      id = r.data.id as string
    }
    try {
      if (form.file) {
        await uploadProductImage(id!, form.file)
        await removeProductImages(form.existing)   // só apaga a foto antiga depois que a nova subiu
      } else if (form.removeImage) await removeProductImages(form.existing)
    } catch (e) {
      setBusy(false); setForm({ ...form, id, file: null })   // produto já existe; evita duplicar ao tentar de novo
      load(); return say(false, `Produto salvo, mas a foto falhou: ${(e as Error).message}`)
    }
    setBusy(false); setForm(null)
    say(true, form.id ? 'Produto atualizado!' : form.is_active ? 'Produto criado e publicado!' : 'Produto salvo como rascunho. Ative quando quiser publicar.'); load()
  }
  async function patch(p: Prod, v: Partial<Prod>, ok: string) {
    const r = await sb.from('products').update(v).eq('id', p.id)
    if (r.error) return say(false, 'Não foi possível alterar.')
    say(true, ok); load()
  }
  async function move(p: Prod, dir: -1 | 1) {
    const sib = list.filter(x => x.category_id === p.category_id); const i = sib.findIndex(x => x.id === p.id); const o = sib[i + dir]; if (!o) return
    const r1 = await sb.from('products').update({ sort_order: o.sort_order }).eq('id', p.id)
    const r2 = await sb.from('products').update({ sort_order: p.sort_order }).eq('id', o.id)
    if (r1.error || r2.error) say(false, 'Não foi possível reordenar.')
    load()
  }
  async function remove(p: Prod) {
    if (!confirm(`Excluir "${p.name}"? Os pedidos antigos continuam guardados com o nome e o preço da época.`)) return
    const r = await sb.from('products').delete().eq('id', p.id)
    if (r.error) return say(false, 'Não foi possível excluir.')
    await removeProductImages(p.product_images)
    say(true, 'Produto excluído.'); load()
  }

  const today = brToday()
  const status = (p: { is_active: boolean; is_available: boolean; kind: string; stock_qty: number | null; stock_date: string | null }) =>
    !p.is_active ? 'Rascunho (oculto)' : !p.is_available ? 'Esgotado' : p.kind === 'stock' && !(p.stock_date === today && (p.stock_qty ?? 0) > 0) ? 'Sem estoque hoje' : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1"><h1 className="text-2xl font-extrabold">Produtos</h1>
          <p className="text-muted text-sm">Só aparecem na loja os produtos publicados, disponíveis e (pronta entrega) com estoque do dia.</p></div>
        <button onClick={openNew} className={btn + ' bg-paper0 text-white px-5'}>+ Novo produto</button>
      </div>
      <Notice msg={msg} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ id: 'all', name: 'Todas' }, ...cats].map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} className={`whitespace-nowrap rounded-full px-4 py-2 font-semibold border ${filter === c.id ? 'bg-paper0 text-white border-brand-500' : 'bg-card border-brand-200'}`}>{c.name}</button>))}
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔎 Buscar produto" className={inp} />
      {loading ? <Loading /> : (
        <ul className="space-y-2">
          {shown.map(p => (
            <li key={p.id} className="bg-card rounded-2xl shadow-sm p-3 flex gap-3 items-center flex-wrap">
              <div className="flex flex-col">
                <button aria-label="Subir" onClick={() => move(p, -1)} className="px-2 leading-none">▲</button>
                <button aria-label="Descer" onClick={() => move(p, 1)} className="px-2 leading-none">▼</button>
              </div>
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-brand-100 flex items-center justify-center text-3xl shrink-0">
                {p.product_images[0] ? <img src={publicImg(p.product_images[0].path, true)} alt="" loading="lazy" className="w-full h-full object-cover" /> : '🍰'}
              </div>
              <div className="flex-1 min-w-40">
                <div className="font-bold">{p.name}</div>
                <div className="text-sm text-muted">{catName(p.category_id)} · {p.kind === 'order' ? 'Encomenda' : p.stock_date === today ? `Hoje: ${p.stock_qty ?? 0}` : 'Pronta entrega'}</div>
                <div className="font-extrabold text-brand-600">{centsToBRL(p.price_cents)}</div>
                {status(p) && <div className="text-xs font-semibold text-muted">⚠️ {status(p)}</div>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => patch(p, { is_active: !p.is_active }, p.is_active ? 'Produto despublicado.' : 'Produto publicado!')} className={btn + (p.is_active ? ' bg-green-600 text-white' : ' bg-line')}>{p.is_active ? 'Publicado' : 'Rascunho'}</button>
                <button onClick={() => patch(p, { is_available: !p.is_available }, p.is_available ? 'Marcado como esgotado.' : 'Produto disponível.')} className={btn + (p.is_available ? ' bg-line' : ' bg-red-100 text-red-700')}>{p.is_available ? 'Disponível' : 'Esgotado'}</button>
                <button onClick={() => openEdit(p)} className={btn + ' text-blue-600'}>Editar</button>
                <button onClick={() => remove(p)} className={btn + ' text-red-600'}>Excluir</button>
              </div>
            </li>))}
          {!shown.length && <li className="text-muted text-center py-8">{list.length ? 'Nenhum produto nesse filtro.' : 'Nenhum produto ainda. Clique em "+ Novo produto".'}</li>}
        </ul>)}

      {form && (
        <Modal title={form.id ? 'Editar produto' : 'Novo produto'} onClose={() => !busy && setForm(null)}>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <label className="block"><span className="font-semibold">Foto</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setForm({ ...form, file: e.target.files?.[0] ?? null, removeImage: false })} className="block w-full mt-1 text-sm" /></label>
              {(form.existing.length > 0 || form.file) && <button type="button" onClick={() => setForm({ ...form, file: null, removeImage: form.existing.length > 0 })} className="text-sm text-red-600 underline">Remover foto</button>}
              <label className="block"><span className="font-semibold">Nome</span><input value={form.name} maxLength={80} onChange={e => setForm({ ...form, name: e.target.value })} className={inp} /></label>
              <label className="block"><span className="font-semibold">Categoria</span>
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className={inp}>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_active ? '' : ' (oculta)'}</option>)}</select></label>
              <fieldset className="space-y-1"><legend className="font-semibold">Tipo</legend>
                <label className="flex items-start gap-2"><input type="radio" checked={form.kind === 'stock'} onChange={() => setForm({ ...form, kind: 'stock' })} className="mt-1 accent-brand-500" /><span><b>Pronta entrega</b> — usa o estoque do dia (menu Abastecimento)</span></label>
                <label className="flex items-start gap-2"><input type="radio" checked={form.kind === 'order'} onChange={() => setForm({ ...form, kind: 'order' })} className="mt-1 accent-brand-500" /><span><b>Encomenda</b> — sem estoque; o cliente escolhe a data</span></label></fieldset>
              <label className="block"><span className="font-semibold">Descrição</span><textarea value={form.description} maxLength={1000} rows={4} onChange={e => setForm({ ...form, description: e.target.value })} className={inp} /></label>
              <label className="block"><span className="font-semibold">Preço (R$)</span><input value={form.price} inputMode="decimal" placeholder="12,00" onChange={e => setForm({ ...form, price: e.target.value })} className={inp} /></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-5 h-5 accent-brand-500" /><span><b>Publicar na loja</b> (desligado = rascunho, os clientes não veem)</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })} className="w-5 h-5 accent-brand-500" /><span>Disponível para pedido (desligue para marcar como esgotado)</span></label>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-center">Prévia — como o cliente vê</div>
              <Preview name={clean(form.name)} description={cleanLong(form.description)} priceCents={parseToCents(form.price)} kind={form.kind}
                imageUrl={previewUrl ?? (form.removeImage || !form.existing[0] ? null : publicImg(form.existing[0].path))}
                status={!form.is_active ? 'Rascunho (oculto)' : !form.is_available ? 'Esgotado' : ''} />
              {form.kind === 'stock' && <p className="text-xs text-muted text-center">Para aparecer na loja, lance o estoque do dia em Abastecimento.</p>}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button disabled={busy} onClick={() => setForm(null)} className={btn + ' text-muted'}>Cancelar</button>
            <button disabled={busy} onClick={save} className={btn + ' bg-paper0 text-white px-6'}>{busy ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </Modal>)}
    </div>)
}
