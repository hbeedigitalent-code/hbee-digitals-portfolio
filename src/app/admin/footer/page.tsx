'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { fetchSiteSettings, SITE_SETTINGS_KEY } from '@/lib/site-settings'
import { SOCIAL_NETWORKS, footerSitePayload, networkFor, parseSocialProfiles, readNewsletterSettings, socialProfilesPayload, type NewsletterSettings, type SocialProfile } from '@/lib/footer-settings'

const input = 'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5'
const card = 'space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6'
const button = 'rounded-full bg-[var(--accent)] px-6 py-3 font-bold text-[var(--btn-primary-text)] disabled:opacity-50'

/** Reuse the existing settings rows; never save code-owned navigation or legacy branding. */
export default function AdminFooterPage() {
  const [site, setSite] = useState<Record<string, unknown> | null>(null), [footerId, setFooterId] = useState<string | null>(null)
  const [contact, setContact] = useState(''), [description, setDescription] = useState('')
  const [newsletter, setNewsletter] = useState<NewsletterSettings>(() => readNewsletterSettings(null))
  const [social, setSocial] = useState<SocialProfile[]>([])
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(''), [message, setMessage] = useState(''), [loadError, setLoadError] = useState('')
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [siteResult, footer] = await Promise.all([fetchSiteSettings(), supabase.from('footer_settings').select('id,social_links').limit(2).maybeSingle()])
        if (!mounted) return
        if (!siteResult.error && siteResult.data) {
          setSite(siteResult.data); setContact(typeof siteResult.data.contact_email === 'string' ? siteResult.data.contact_email : '')
          setDescription(typeof siteResult.data.footer_description === 'string' ? siteResult.data.footer_description : '')
          setNewsletter(readNewsletterSettings(siteResult.data.newsletter_settings))
        } else setLoadError('Canonical site settings could not be loaded. Brand/newsletter saving is disabled.')
        if (!footer.error && footer.data) {
          const rows = parseSocialProfiles(footer.data.social_links)
          setSocial([...rows, ...SOCIAL_NETWORKS.filter(platform => !rows.some(row => networkFor(row.platform) === platform)).map(platform => ({ platform, url: '', is_active: false }))])
          setFooterId(footer.data.id)
        } else setLoadError(previous => `${previous} Existing footer settings could not be loaded. Social saving is disabled.`)
      } catch { if (mounted) setLoadError('Settings could not be loaded safely. Reload before editing.') }
      finally { if (mounted) setLoading(false) }
    }
    void load()
    return () => { mounted = false }
  }, [])
  const supportsNewsletter = Boolean(site && Object.prototype.hasOwnProperty.call(site, 'newsletter_settings'))
  function setSocialField(index: number, patch: Partial<SocialProfile>) { setSocial(rows => rows.map((row, i) => i === index ? { ...row, ...patch } : row)) }
  async function saveSite(event: FormEvent) {
    event.preventDefault()
    if (!site || saving) return
    setSaving('site'); setMessage('')
    try {
      const payload = footerSitePayload(contact, description, supportsNewsletter ? newsletter : undefined)
      const result = await supabase.from('site_settings').update(payload).eq('settings_key', SITE_SETTINGS_KEY).select('settings_key').single()
      if (result.error || !result.data) throw Error('Settings were not saved. Please retry; your entries are preserved.')
      setSite({ ...site, ...payload }); setMessage('Brand/newsletter settings saved. Public settings revalidate every 60 seconds; reload after refresh to review.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed. Your entries are preserved.') }
    finally { setSaving('') }
  }
  async function saveSocial(event: FormEvent) {
    event.preventDefault()
    if (!footerId || saving) return
    setSaving('social'); setMessage('')
    try {
      const result = await supabase.from('footer_settings').update(socialProfilesPayload(social)).eq('id', footerId).select('id').single()
      if (result.error || !result.data) throw Error('Social profiles were not saved. Please retry; your entries are preserved.')
      setMessage('Social profiles saved.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed. Your entries are preserved.') }
    finally { setSaving('') }
  }
  if (loading) return <p>Loading footer settings…</p>
  return <div className="space-y-6">
    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Footer & newsletter</h1>
    <p className="text-sm text-[var(--text-secondary)]">Navigation, legal links and visual branding stay code-owned. Contact and description use the same canonical record as <Link href="/admin/settings">Site Settings</Link>. Subscribers remain in <Link href="/admin/subscribers">Subscribers</Link>.</p>
    {loadError && <p role="alert">{loadError}</p>}{message && <p role="status">{message}</p>}
    <form className={card} onSubmit={saveSite}>
      <fieldset disabled={!site || Boolean(saving)} className="space-y-4">
        <legend className="text-xl font-bold">Brand & newsletter</legend>
        <label className="block">Contact email<input type="email" value={contact} onChange={e => setContact(e.target.value)} className={input} /></label>
        <label className="block">Footer description<textarea maxLength={400} value={description} onChange={e => setDescription(e.target.value)} className={input} /></label>
        {!supportsNewsletter && <p>Newsletter controls require the proposed schema addition. Capture remains disabled; no SQL is run by this screen.</p>}
        <fieldset disabled={!supportsNewsletter} className="space-y-4">
          <legend className="font-bold">Newsletter settings</legend>
          <p className="text-sm">Capture stays off unless the master switch and a surface switch are both enabled. Keep the master switch off until consent columns, email uniqueness, unsubscribe, RLS and Turnstile/Upstash are verified. All copy is plain text.</p>
          {(['headline', 'description', 'popup_headline'] as const).map(field => <label key={field} className="block">{field === 'headline' ? 'Footer headline' : field === 'description' ? 'Supporting copy' : 'Popup headline'}<input required maxLength={field === 'description' ? 320 : 120} value={newsletter[field]} onChange={e => setNewsletter({ ...newsletter, [field]: e.target.value })} className={input} /></label>)}
          <label className="block">Popup delay (seconds)<input type="number" min={180} max={300} step={1} required value={newsletter.popup_delay_seconds} onChange={e => setNewsletter({ ...newsletter, popup_delay_seconds: Number(e.target.value) })} className={input} /></label>
          <label className="flex gap-2"><input type="checkbox" checked={newsletter.enabled} onChange={e => setNewsletter({ ...newsletter, enabled: e.target.checked })} />Enable newsletter capture</label>
          <label className="flex gap-2"><input type="checkbox" checked={newsletter.footer_enabled} onChange={e => setNewsletter({ ...newsletter, footer_enabled: e.target.checked })} />Enable footer subscription</label>
          <label className="flex gap-2"><input type="checkbox" checked={newsletter.popup_enabled} onChange={e => setNewsletter({ ...newsletter, popup_enabled: e.target.checked })} />Enable delayed popup</label>
        </fieldset>
        <button className={button} type="submit">{saving === 'site' ? 'Saving…' : 'Save brand/newsletter'}</button>
      </fieldset>
    </form>
    <form className={card} onSubmit={saveSocial}>
      <fieldset disabled={!footerId || Boolean(saving)} className="space-y-4">
        <legend className="text-xl font-bold">Footer social profiles</legend>
        <p className="text-sm">Only enabled, configured HTTPS profiles appear. Legacy Site Settings social fields are not a second source for this footer.</p>
        {social.map((row, index) => <div key={index} className="space-y-2">
          {networkFor(row.platform) ? <><label className="block">{networkFor(row.platform)} URL<input type="url" value={row.url} onChange={e => setSocialField(index, { url: e.target.value })} className={input} /></label><label className="flex gap-2"><input type="checkbox" checked={row.is_active} onChange={e => setSocialField(index, { is_active: e.target.checked })} />Enabled</label></> : <p>Historical profile “{row.platform}” is retained unchanged and not rendered by this footer.</p>}
        </div>)}
        <button className={button} type="submit">{saving === 'social' ? 'Saving…' : 'Save social profiles'}</button>
      </fieldset>
    </form>
  </div>
}
