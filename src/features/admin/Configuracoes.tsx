import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { centsToInput, parseToCents } from '../../lib/money'
import { clean, cleanLong } from '../../lib/text'
import { publicImg, removeBrandLogo, uploadBrandLogo } from '../../lib/image'
import { Loading, Notice } from '../../components/ui'

type Msg = { ok: boolean; text: string } | null
const inp = 'w-full border-2 border-brand-200 rounded-xl p-3 bg-card'
const btn = 'rounded-xl px-5 py-3 font-bold bg-paper0 text-white active:scale-95 disabled:opacity-40'

export default function Configuracoes() {
  const [loading, setLoading] = useState(true); const [msg, setMsg] = useState<Msg>(null); const [busy, setBusy] = useState('')
  const [logo, setLogo] = useState<string | null>(null); const [logoBusy, setLogoBusy] = useState(false)
  const [s, setS] = useState({ tagline: '', store_name: '', is_open: true, soldout_behavior: 'hide', delivery_enabled: true, fee: '0,00', whatsapp: '', min_days: '2' })
  const [p, setP] = useState({ pix_key: '', receiver_name: '', bank: '', instructions: '', payment_link: '' })
  const say = (ok: boolean, text: string) => { setMsg({ ok, text }); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => setMsg(null), 5000) }

  useEffect(() => {
    Promise.all([sb.from('store_settings').select('*').eq('id', 1).single(), sb.from('payment_settings').select('*').eq('id', 1).single()]).then(([a, b]) => {
      if (a.error || b.error) say(false, 'Não foi possível carregar as configurações.')
      if (a.data) setLogo(a.data.logo_path ?? null)
      if (a.data) setS({ tagline: a.data.tagline ?? '', store_name: a.data.store_name, is_open: a.data.is_open, soldout_behavior: a.data.soldout_behavior, delivery_enabled: a.data.delivery_enabled, fee: centsToInput(a.data.delivery_fee_cents), whatsapp: a.data.order_whatsapp ?? '', min_days: String(a.data.min_days_custom) })
      if (b.data) setP({ pix_key: b.data.pix_key ?? '', receiver_name: b.data.receiver_name ?? '', bank: b.data.bank ?? '', instructions: b.data.instructions ?? '', payment_link: b.data.payment_link ?? '' })
      setLoading(false)
    })
  }, [])

  async function saveStore() {
    const wa = s.whatsapp.replace(/\D/g, ''); const name = clean(s.store_name)
    const fee = /^\s*0*([.,]0*)?\s*$/.test(s.fee) ? 0 : parseToCents(s.fee); const days = Number(s.min_days)
    if (name.length < 2 || name.length > 60) return say(false, 'O nome da loja precisa ter de 2 a 60 caracteres.')
    if (wa && (wa.length < 10 || wa.length > 13)) return say(false, 'WhatsApp inválido: use DDD + número (ex.: 15999998888).')
    if (fee === null) return say(false, 'Taxa de entrega inválida.')
    if (!Number.isInteger(days) || days < 0 || days > 60) return say(false, 'Antecedência das encomendas: de 0 a 60 dias.')
    setBusy('store')
    const r = await sb.from('store_settings').update({ tagline: clean(s.tagline).slice(0, 100), store_name: name, is_open: s.is_open, soldout_behavior: s.soldout_behavior, delivery_enabled: s.delivery_enabled, delivery_fee_cents: fee, order_whatsapp: wa || null, min_days_custom: days }).eq('id', 1)
    setBusy(''); say(!r.error, r.error ? 'Não foi possível salvar.' : 'Configurações da loja salvas!')
  }
  async function changeLogo(file: File | undefined) {
    if (!file) return
    setLogoBusy(true)
    try {
      const path = await uploadBrandLogo(file)
      const r = await sb.from('store_settings').update({ logo_path: path }).eq('id', 1)
      if (r.error) { await removeBrandLogo(path); throw new Error('Não foi possível salvar a logo.') }
      await removeBrandLogo(logo); setLogo(path); say(true, 'Logo atualizada!')
    } catch (e) { say(false, (e as Error).message) }
    setLogoBusy(false)
  }
  async function dropLogo() {
    if (!logo || !confirm('Remover a logo da loja?')) return
    setLogoBusy(true)
    const r = await sb.from('store_settings').update({ logo_path: null }).eq('id', 1)
    if (!r.error) { await removeBrandLogo(logo); setLogo(null); say(true, 'Logo removida.') } else say(false, 'Não foi possível remover a logo.')
    setLogoBusy(false)
  }
  async function savePay() {
    const link = p.payment_link.trim()
    if (link && !/^https:\/\/[^\s]+$/.test(link)) return say(false, 'O link de pagamento precisa começar com https://')
    if (p.pix_key.trim().length > 120) return say(false, 'A chave Pix está longa demais.')
    setBusy('pay')
    const r = await sb.from('payment_settings').update({ pix_key: clean(p.pix_key) || null, receiver_name: clean(p.receiver_name) || null, bank: clean(p.bank) || null, instructions: cleanLong(p.instructions).slice(0, 500) || null, payment_link: link || null }).eq('id', 1)
    setBusy(''); say(!r.error, r.error ? 'Não foi possível salvar.' : 'Dados do Pix salvos!')
  }
  if (loading) return <Loading />
  const card = 'bg-card rounded-2xl shadow-sm p-5 space-y-3'
  const lbl = 'block font-semibold'
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-extrabold">Configurações</h1></div>
      <Notice msg={msg} />
      <section className={card}><h2 className="text-lg font-extrabold">Marca</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-24 h-24 rounded-full bg-sand-100 border border-line overflow-hidden flex items-center justify-center text-4xl shrink-0">
            {logo ? <img src={publicImg(logo)} alt="Logo atual" className="w-full h-full object-cover" /> : '🍰'}</div>
          <div className="space-y-2">
            <label className="block"><span className="font-semibold">Logo da loja (JPG, PNG ou WebP)</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={logoBusy} onChange={e => { changeLogo(e.target.files?.[0]); e.target.value = '' }} className="block text-sm mt-1" /></label>
            {logo && <button disabled={logoBusy} onClick={dropLogo} className="text-sm text-red-600 underline">Remover logo</button>}
            {logoBusy && <p className="text-sm text-muted">Enviando…</p>}
            <p className="text-xs text-muted">Aparece na página inicial da loja. Prefira uma imagem quadrada.</p>
          </div>
        </div>
        <label className={lbl}>Frase da loja (aparece abaixo do nome)<input className={inp} maxLength={100} value={s.tagline} onChange={e => setS({ ...s, tagline: e.target.value })} placeholder="Doces feitos com carinho" /></label>
      </section>
      <section className={card}><h2 className="text-lg font-extrabold">Loja</h2>
        <label className={lbl}>Nome da loja<input className={inp} maxLength={60} value={s.store_name} onChange={e => setS({ ...s, store_name: e.target.value })} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" className="w-5 h-5 accent-brand-500" checked={s.is_open} onChange={e => setS({ ...s, is_open: e.target.checked })} /><span><b>Loja aberta para pedidos</b> (desligue para fechar a loja)</span></label>
        <label className={lbl}>WhatsApp que recebe os pedidos (com DDD)<input className={inp} inputMode="tel" placeholder="15999998888" value={s.whatsapp} onChange={e => setS({ ...s, whatsapp: e.target.value })} /></label>
        <label className={lbl}>Produto esgotado
          <select className={inp} value={s.soldout_behavior} onChange={e => setS({ ...s, soldout_behavior: e.target.value })}>
            <option value="hide">Esconder da loja</option><option value="show">Mostrar com a marca "Esgotado"</option></select></label>
        <label className="flex items-center gap-2"><input type="checkbox" className="w-5 h-5 accent-brand-500" checked={s.delivery_enabled} onChange={e => setS({ ...s, delivery_enabled: e.target.checked })} /><span>Aceitar entregas</span></label>
        <label className={lbl}>Taxa de entrega (R$)<input className={inp} inputMode="decimal" value={s.fee} onChange={e => setS({ ...s, fee: e.target.value })} /></label>
        <label className={lbl}>Antecedência mínima das encomendas (dias)<input className={inp} inputMode="numeric" value={s.min_days} onChange={e => setS({ ...s, min_days: e.target.value })} /></label>
        <button disabled={busy === 'store'} onClick={saveStore} className={btn}>{busy === 'store' ? 'Salvando…' : 'Salvar marca e loja'}</button>
      </section>
      <section className={card}><h2 className="text-lg font-extrabold">Pix</h2>
        <p className="text-sm text-muted">Estes dados só aparecem para o cliente depois que ele confirma o pedido. O pagamento é confirmado por você, no pedido.</p>
        <label className={lbl}>Chave Pix<input className={inp} maxLength={120} autoComplete="off" value={p.pix_key} onChange={e => setP({ ...p, pix_key: e.target.value })} /></label>
        <label className={lbl}>Nome do recebedor<input className={inp} maxLength={80} value={p.receiver_name} onChange={e => setP({ ...p, receiver_name: e.target.value })} /></label>
        <label className={lbl}>Instituição financeira<input className={inp} maxLength={60} value={p.bank} onChange={e => setP({ ...p, bank: e.target.value })} /></label>
        <label className={lbl}>Texto de orientação<textarea className={inp} rows={3} maxLength={500} value={p.instructions} onChange={e => setP({ ...p, instructions: e.target.value })} placeholder="Ex.: Envie o comprovante pelo WhatsApp." /></label>
        <label className={lbl}>Link de pagamento (opcional, https://)<input className={inp} inputMode="url" value={p.payment_link} onChange={e => setP({ ...p, payment_link: e.target.value })} /></label>
        <button disabled={busy === 'pay'} onClick={savePay} className={btn}>{busy === 'pay' ? 'Salvando…' : 'Salvar Pix'}</button>
      </section>
    </div>)
}
