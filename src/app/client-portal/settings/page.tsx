// src/app/client-portal/settings/page.tsx
//
// Profile settings (Phase 18.7). Reads and saves through ONE session-bound endpoint,
// /api/client-portal/settings (GET / PATCH), which scopes to the caller's own clients row and only
// ever writes the fields shown here: name, business, WhatsApp, website, country and the three
// notification preferences. It replaces the browser-side clients.select('*') / clients.update(...).
//
// The profile photo is still uploaded by the browser to the existing `client-portal` bucket
// (unchanged — that bucket is public today and is recorded for the final security pass); the
// resulting URL is then saved through the same endpoint, which accepts only this user's own upload.
// There is no team access, password change, storage or account-deletion UI because the backend has
// none of those.

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { SupportAmbiguous, SupportError, SupportLoading } from '@/components/client-portal/SupportState'
import { formatDay } from '@/lib/client-portal/support-display'
import styles from '@/components/client-portal/support.module.css'

interface Profile {
  fullName: string
  businessName: string
  email: string
  whatsapp: string
  websiteUrl: string
  country: string
  profileImage: string | null
  createdAt: string | null
  reference: string | null
}

interface Preferences {
  emailNotifications: boolean
  projectUpdates: boolean
  marketingEmails: boolean
}

type LoadState = 'loading' | 'ready' | 'ambiguous' | 'error'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

function Switch({ id, title, desc, checked, onChange }: { id: string; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={styles.switchRow}>
      <div className={styles.switchText}>
        <p id={id} className={styles.switchTitle}>
          {title}
        </p>
        <p className={styles.switchDesc}>{desc}</p>
      </div>
      <label className={styles.switch}>
        <input type="checkbox" aria-labelledby={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className={styles.track} aria-hidden="true" />
      </label>
    </div>
  )
}

export default function ClientSettingsPage() {
  const [state, setState] = useState<LoadState>('loading')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({ fullName: '', businessName: '', whatsapp: '', websiteUrl: '', country: '' })
  const [prefs, setPrefs] = useState<Preferences>({ emailNotifications: true, projectUpdates: true, marketingEmails: false })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const apply = useCallback((payload: { profile: Profile; preferences: Preferences }) => {
    setProfile(payload.profile)
    setForm({
      fullName: payload.profile.fullName,
      businessName: payload.profile.businessName,
      whatsapp: payload.profile.whatsapp,
      websiteUrl: payload.profile.websiteUrl,
      country: payload.profile.country,
    })
    setPrefs(payload.preferences)
  }, [])

  const load = useCallback(async () => {
    setState('loading')
    try {
      const response = await fetch('/api/client-portal/settings', { credentials: 'same-origin' })
      if (response.status === 409) {
        setState('ambiguous')
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.profile) {
        setState('error')
        return
      }
      apply(payload)
      setState('ready')
    } catch (err) {
      console.error('Error:', err)
      setState('error')
    }
  }, [apply])

  useEffect(() => {
    load()
  }, [load])

  async function patch(body: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
    const response = await fetch('/api/client-portal/settings', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.profile) return { ok: false, error: payload?.error || 'Failed to update. Please try again.' }
    apply(payload)
    window.dispatchEvent(new Event('clientProfileUpdate'))
    return { ok: true }
  }

  async function handleProfileImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file.' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setMessage({ type: 'error', text: 'That image is too large. Please choose one under 5 MB.' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      // Created on demand: only the avatar upload talks to Supabase from the browser.
      const supabase = createClientComponentClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `profile-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('client-portal')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('client-portal')
        .getPublicUrl(filePath)

      const result = await patch({ profile_image: urlData.publicUrl })
      if (!result.ok) throw new Error(result.error)

      setMessage({ type: 'success', text: 'Profile image updated successfully!' })
    } catch (error) {
      console.error('Upload error:', error)
      setMessage({ type: 'error', text: 'Failed to upload image. Please try again.' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const result = await patch({
        full_name: form.fullName,
        business_name: form.businessName,
        whatsapp: form.whatsapp,
        website_url: form.websiteUrl,
        country: form.country,
        email_notifications: prefs.emailNotifications,
        project_updates: prefs.projectUpdates,
        marketing_emails: prefs.marketingEmails,
      })
      if (!result.ok) {
        setMessage({ type: 'error', text: result.error })
        return
      }
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (error) {
      console.error('Update error:', error)
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (state === 'loading') return <SupportLoading />
  if (state === 'ambiguous') return <SupportAmbiguous what="settings" />
  if (state === 'error' || !profile) return <SupportError message="We could not load your settings. Please try again in a moment." onRetry={load} />

  const avatarLetter = (form.fullName || profile.fullName).trim().charAt(0).toUpperCase() || 'C'
  const since = formatDay(profile.createdAt)


  return (
    <div className={styles.page}>
      <header>
        <p className={styles.eyebrow}>
          <span aria-hidden="true" className={styles.node} />
          Settings
        </p>
        <h1 className={styles.h1}>Profile settings</h1>
        <p className={styles.lead}>Manage your account information and preferences.</p>
      </header>

      {message && (
        <div role={message.type === 'error' ? 'alert' : 'status'} className={message.type === 'error' ? styles.err : styles.ok}>
          {message.text}
        </div>
      )}

      {/* Profile photo */}
      <section className={styles.panel} aria-labelledby="set-photo">
        <p className={styles.eyebrow}>
          <span aria-hidden="true" className={styles.node} />
          Profile photo
        </p>
        <h2 id="set-photo" className="sr-only">
          Profile photo
        </h2>
        <div className={styles.avatarRow}>
          <span className={styles.avatar} aria-hidden="true">
            {profile.profileImage ? <img src={profile.profileImage} alt="" /> : avatarLetter}
          </span>
          <div style={{ minWidth: 0 }}>
            <p className={styles.h2} style={{ marginTop: 0 }}>
              {profile.fullName || 'Client'}
            </p>
            <p className={styles.sub}>{profile.email}</p>
          </div>
          <button type="button" className={styles.secondary} onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Change profile photo">
            {uploading ? 'Uploading…' : 'Change photo'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
        </div>
      </section>

      {/* One form: personal information + notification preferences, saved together as before */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <section className={styles.panel} aria-labelledby="set-personal">
          <p className={styles.eyebrow}>
            <span aria-hidden="true" className={styles.node} />
            Personal information
          </p>
          <h2 id="set-personal" className="sr-only">
            Personal information
          </h2>
          <div className={`${styles.fields} ${styles.two}`} style={{ marginTop: '1rem' }}>
            <div className={styles.field}>
              <label htmlFor="settings-full-name" className={styles.label}>
                Full name
              </label>
              <input id="settings-full-name" className={styles.input} value={form.fullName} maxLength={120} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Your full name" />
            </div>
            <div className={styles.field}>
              <label htmlFor="settings-business-name" className={styles.label}>
                Business name
              </label>
              <input id="settings-business-name" className={styles.input} value={form.businessName} maxLength={160} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Your business name" />
            </div>
            <div className={styles.field}>
              <label htmlFor="settings-email" className={styles.label}>
                Email address
              </label>
              <input id="settings-email" className={styles.input} value={profile.email} disabled readOnly />
              <p className={styles.hint}>Email cannot be changed</p>
            </div>
            <div className={styles.field}>
              <label htmlFor="settings-whatsapp" className={styles.label}>
                WhatsApp
              </label>
              <input id="settings-whatsapp" className={styles.input} value={form.whatsapp} maxLength={40} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+1 234 567 8900" inputMode="tel" />
            </div>
            <div className={styles.field}>
              <label htmlFor="settings-website" className={styles.label}>
                Website
              </label>
              <input id="settings-website" className={styles.input} value={form.websiteUrl} maxLength={300} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://yourstore.com" inputMode="url" />
            </div>
            <div className={styles.field}>
              <label htmlFor="settings-country" className={styles.label}>
                Country
              </label>
              <input id="settings-country" className={styles.input} value={form.country} maxLength={80} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Your country" />
            </div>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="set-notifications">
          <p className={styles.eyebrow}>
            <span aria-hidden="true" className={styles.node} />
            Notification preferences
          </p>
          <h2 id="set-notifications" className="sr-only">
            Notification preferences
          </h2>
          <div style={{ marginTop: '0.5rem' }}>
            <Switch id="notif-email-notifications" title="Email notifications" desc="Receive updates about your projects via email" checked={prefs.emailNotifications} onChange={(v) => setPrefs({ ...prefs, emailNotifications: v })} />
            <Switch id="notif-project-updates" title="Project updates" desc="Get notified when your projects are updated" checked={prefs.projectUpdates} onChange={(v) => setPrefs({ ...prefs, projectUpdates: v })} />
            <Switch id="notif-marketing-emails" title="Marketing emails" desc="Receive marketing and promotional emails" checked={prefs.marketingEmails} onChange={(v) => setPrefs({ ...prefs, marketingEmails: v })} />
          </div>
          <div className={styles.actions} style={{ marginTop: '0.75rem' }}>
            <button type="submit" disabled={saving} className={styles.primary}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </section>
      </form>

      {/* Account facts: only real fields */}
      <section className={styles.panel} aria-labelledby="set-account">
        <p className={styles.eyebrow}>
          <span aria-hidden="true" className={styles.node} />
          Account
        </p>
        <h2 id="set-account" className="sr-only">
          Account
        </h2>
        <dl className={styles.facts}>
          {since && (
            <div>
              <dt>Member since</dt>
              <dd>{since}</dd>
            </div>
          )}
          {profile.reference && (
            <div>
              <dt>Account reference</dt>
              <dd style={{ fontFamily: 'ui-monospace, monospace' }}>{profile.reference}</dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  )
}
