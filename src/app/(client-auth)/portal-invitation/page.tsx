import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import SvgIcon from '@/components/ui/SvgIcon'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPrivilegedClient } from '@/lib/admin-api-auth'
import { INVITE_COOKIE, viewInvitation, type InvitationView } from '@/lib/portal-invitations'
import { AcceptInvitation } from './AcceptInvitation'

// Portal invitation landing (Phase 16.6). The token arrives in an httpOnly
// cookie set by /api/portal-invitation/open — never in this page's URL. This
// page only READS state; connecting happens through the authenticated POST in
// <AcceptInvitation/>. No merchant or client id is ever rendered.

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Portal invitation | Hbee Digitals',
  robots: { index: false, follow: false },
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <SvgIcon name="logo" size={48} color="var(--accent-orange)" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-[var(--text-muted)]">{children}</div>
      </div>
    </main>
  )
}

const primary =
  'block w-full rounded-lg bg-[var(--accent-orange)] px-4 py-3 text-center font-semibold text-[var(--cta-text)] transition hover:opacity-90'
const secondary =
  'block w-full rounded-lg border border-[var(--border)] px-4 py-3 text-center font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-orange)]'

export default async function PortalInvitationPage() {
  const token = cookies().get(INVITE_COOKIE)?.value ?? ''
  const db = getPrivilegedClient()
  const view: InvitationView = token && db ? await viewInvitation(db, token) : { state: 'invalid' }

  if (view.state === 'invalid') {
    return (
      <Shell title="This invitation link isn't valid">
        <p>Please open the link from your invitation email again. If it still doesn&apos;t work, contact us and we&apos;ll send a new one.</p>
        <Link href="/contact" className={`${secondary} mt-6`}>Contact Hbee</Link>
      </Shell>
    )
  }
  if (view.state === 'expired') {
    return (
      <Shell title="This invitation has expired">
        <p>Invitations are valid for a limited time. Contact us and we&apos;ll send you a new one.</p>
        <Link href="/contact" className={`${secondary} mt-6`}>Contact Hbee</Link>
      </Shell>
    )
  }
  if (view.state === 'used') {
    return (
      <Shell title="This invitation has already been used">
        <p>If you connected your account with it, sign in to open your client portal.</p>
        <Link href="/client-login" className={`${primary} mt-6`}>Sign in</Link>
      </Shell>
    )
  }

  const session = createServerSupabaseClient()
  const {
    data: { user },
  } = await session.auth.getUser()
  const forBusiness = view.businessName ? ` for ${view.businessName}` : ''

  if (!user) {
    return (
      <Shell title="You're invited to the Hbee client portal">
        <p>
          Hbee has invited you to connect a client portal account{forBusiness}. Use{' '}
          <strong className="text-[var(--text-primary)]">{view.email}</strong> — the address this invitation was sent to.
        </p>
        <div className="mt-6 space-y-3">
          <Link href="/client-login?next=/portal-invitation" className={primary}>I already have an account — sign in</Link>
          <Link href="/client-signup" className={secondary}>Create an account</Link>
        </div>
        <p className="mt-6 text-sm">New accounts need a confirmed email. After confirming, open your invitation link again to finish connecting.</p>
      </Shell>
    )
  }

  if ((user.email ?? '').trim().toLowerCase() !== view.email) {
    return (
      <Shell title="Signed in with a different email">
        <p>
          This invitation was sent to <strong className="text-[var(--text-primary)]">{view.email}</strong>. Please sign out, then sign in or create an account with that address.
        </p>
        <Link href="/client-login?next=/portal-invitation" className={`${secondary} mt-6`}>Sign in with another account</Link>
      </Shell>
    )
  }

  return (
    <Shell title="Connect your client portal">
      <p>
        You&apos;re signed in as <strong className="text-[var(--text-primary)]">{view.email}</strong>. Connect this account{forBusiness} to finish.
      </p>
      <AcceptInvitation className={`${primary} mt-6`} secondaryClassName={secondary} />
    </Shell>
  )
}
