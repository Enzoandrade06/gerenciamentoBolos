import { useCallback, useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { clean, slugify } from '../../lib/text'
import { Loading, Notice } from '../../components/ui'

type Cat = { id: string; name: string; slug: string; sort_order: number; is_active: boolean; products: { count: number }[] }
type Msg = { ok: boolean; text: string } | null
const btn = 'rounded-lg px-3 py-2 font-semibold active:scale-95 disabled:opacity-40'

export default function Categorias() {
  const [list, setList] = useState<Cat[]>([]); const [loading, setLoading] = useState(true)
  const [name, setName] = useState(''); const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null); const [msg, setMsg] = useState<Msg>(null)
  const say = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4500) }

  const load = useCallback(async () => {
    const r = await sb.from('categories').select('id,name,slug,sort_order,is_active,products(count)').order('sort_order').order('name')
    if (r.error) { setMsg({ ok: false, text: 'Não foi possível carregar as categorias.' }); setLoading(false); return }
    let rows = (r.data ?? []) as unknown as Cat[]
    if (new Set(rows.map(x => x.sort_order)).size !== rows.length) {   // ordens repetidas: renumera
      for (let i = 0; i < rows.length; i++) await sb.from('categories').update({ sort_order: i + 1 }).eq('id', rows[i].id)
      rows = rows.map((x, i) => ({ ...x, sort_order: i + 1 }))
    }
    setList(rows); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const valid = (n: string, ignore?: string) => {
    if (n.length < 2 || n.length > 60) return 'Digite um nome de 2 a 60 caracteres.'
    if (list.some(c => c.id !== ignore && c.name.toLowerCase() === n.toLowerCase())) return 'Já existe uma categoria com esse nome.'
    return ''
  }
  async function add() {
    const n = clean(name); const e = valid(n); if (e) return say(false, e)
    setBusy(true)
    const base = slugify(n) || 'categoria'
    const order = list.reduce((m, c) => Math.max(m, c.sort_order), 0) + 1
    let r = await sb.from('categories').insert({ name: n, slug: base, sort_order: order })
    if (r.error?.code === '23505') r = await sb.from('categories').insert({ name: n, slug: `${base.slice(0, 50)}-${Math.random().toString(36).slice(2, 5)}`, sort_order: order })
    setBusy(false)
    if (r.error) return say(false, 'Não foi possível criar a categoria.')
    setName(''); say(true, 'Categoria criada!'); load()
  }
  async function saveName() {
    if (!edit) return
    const n = clean(edit.name); const e = valid(n, edit.id); if (e) return say(false, e)
    const r = await sb.from('categories').update({ name: n }).eq('id', edit.id)
    if (r.error) return say(false, 'Não foi possível salvar.')
    setEdit(null); say(true, 'Nome atualizado.'); load()
  }
  async function toggle(c: Cat) {
    const r = await sb.from('categories').update({ is_active: !c.is_active }).eq('id', c.id)
    if (r.error) return say(false, 'Não foi possível alterar o status.')
    say(true, c.is_active ? 'Categoria desativada: ela e seus produtos somem da loja.' : 'Categoria ativada.'); load()
  }
  async function move(i: number, dir: -1 | 1) {
    const a = list[i], b = list[i + dir]; if (!b) return
    const r1 = await sb.from('categories').update({ sort_order: b.sort_order }).eq('id', a.id)
    const r2 = await sb.from('categories').update({ sort_order: a.sort_order }).eq('id', b.id)
    if (r1.error || r2.error) say(false, 'Não foi possível reordenar.')
    load()
  }
  async function remove(c: Cat) {
    const n = c.products?.[0]?.count ?? 0
    if (n > 0) return say(false, `"${c.name}" tem ${n} produto(s). Mude-os de categoria ou apenas desative a categoria.`)
    if (!confirm(`Excluir a categoria "${c.name}"? Essa ação não pode ser desfeita.`)) return
    const r = await sb.from('categories').delete().eq('id', c.id)
    if (r.error) return say(false, 'Não foi possível excluir (a categoria pode estar em uso).')
    say(true, 'Categoria excluída.'); load()
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-extrabold">Categorias</h1>
        <p className="text-muted text-sm">A ordem aqui é a ordem na loja. "Tudo" aparece sozinho, não precisa criar.</p></div>
      <Notice msg={msg} />
      <form onSubmit={e => { e.preventDefault(); add() }} className="bg-card rounded-2xl shadow-sm p-4 flex gap-2 flex-wrap">
        <input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="Nova categoria (ex.: Brownie)" className="flex-1 min-w-48 border-2 border-brand-200 rounded-xl p-3" />
        <button disabled={busy} className={btn + ' bg-paper0 text-white px-5'}>{busy ? 'Criando…' : '+ Criar'}</button>
      </form>
      {loading ? <Loading /> : (
        <ul className="space-y-2">
          {list.map((c, i) => (
            <li key={c.id} className={`bg-card rounded-2xl shadow-sm p-3 flex items-center gap-2 flex-wrap ${c.is_active ? '' : 'opacity-60'}`}>
              <div className="flex flex-col">
                <button aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)} className="px-2 leading-none disabled:opacity-30">▲</button>
                <button aria-label="Descer" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="px-2 leading-none disabled:opacity-30">▼</button>
              </div>
              <div className="flex-1 min-w-40">
                {edit?.id === c.id ? (
                  <div className="flex gap-2 flex-wrap">
                    <input autoFocus value={edit.name} onChange={e => setEdit({ id: c.id, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEdit(null) }} maxLength={60} className="flex-1 min-w-32 border-2 border-brand-300 rounded-lg p-2" />
                    <button onClick={saveName} className={btn + ' bg-green-600 text-white'}>Salvar</button>
                    <button onClick={() => setEdit(null)} className={btn + ' text-muted'}>Cancelar</button>
                  </div>
                ) : (
                  <><div className="font-bold">{c.name}</div>
                    <div className="text-xs text-muted">{c.products?.[0]?.count ?? 0} produto(s) · {c.is_active ? 'visível na loja' : 'oculta'}</div></>)}
              </div>
              {edit?.id !== c.id && <>
                <button onClick={() => setEdit({ id: c.id, name: c.name })} className={btn + ' text-blue-600'}>Editar</button>
                <button onClick={() => toggle(c)} className={btn + (c.is_active ? ' bg-line text-ink' : ' bg-green-600 text-white')}>{c.is_active ? 'Desativar' : 'Ativar'}</button>
                <button onClick={() => remove(c)} className={btn + ' text-red-600'}>Excluir</button></>}
            </li>))}
          {!list.length && <li className="text-muted text-center py-8">Nenhuma categoria ainda. Crie a primeira acima.</li>}
        </ul>)}
    </div>)
}
