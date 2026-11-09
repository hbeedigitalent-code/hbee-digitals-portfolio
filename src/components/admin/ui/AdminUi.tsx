import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { AlertTriangle, Inbox, Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import styles from './admin-ui.module.css'

/**
 * Shared Admin UI primitives (Phase A1). Presentational only: no data access, no auth. They read the
 * --ad-* roles from the nearest [data-surface="admin"], so they follow the light/dark theme on their own.
 * Pages adopt them one at a time; nothing here is required by an unmigrated page.
 */

/* ── Page header ─────────────────────────────────────────────── */

export interface AdminBreadcrumb { label: string; href?: string }

export function AdminPageHeader({ title, description, eyebrow, breadcrumbs, actions, meta, className, children }: {
  title: ReactNode
  description?: ReactNode
  eyebrow?: string
  breadcrumbs?: AdminBreadcrumb[]
  actions?: ReactNode
  /** Badges / status shown under the description. */
  meta?: ReactNode
  className?: string
  /** Same slot as `actions` (children win): the page's primary actions, right-aligned. */
  children?: ReactNode
}) {
  const actionSlot = children ?? actions
  return (
    <header className={cn(styles.header, className)}>
      <div className={styles.headerText}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb">
            <ol className={styles.crumbs}>
              {breadcrumbs.map((crumb) => (
                <li key={crumb.label}>{crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}</li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
        {meta && <div className={styles.meta}>{meta}</div>}
      </div>
      {actionSlot && <div className={styles.actions}>{actionSlot}</div>}
    </header>
  )
}

/* ── Card & section ──────────────────────────────────────────── */

export function AdminCard({ padded = true, className, children, ...rest }: { padded?: boolean; className?: string; children: ReactNode } & Omit<ComponentProps<'div'>, 'className' | 'children'>) {
  return <div {...rest} className={cn(styles.card, padded && styles.pad, className)}>{children}</div>
}

/** A titled card; also the unit a long form is split into. `id` makes it an in-page anchor. */
export function AdminSection({ id, title, description, actions, className, children }: {
  id?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
  children: ReactNode
}) {
  const titleId = id ? `${id}-title` : undefined
  return (
    <section id={id} aria-labelledby={titleId} className={cn(styles.section, className)}>
      <div className={styles.sectionHead}>
        <div>
          <h2 id={titleId} className={styles.sectionTitle}>{title}</h2>
          {description && <p className={styles.sectionDesc}>{description}</p>}
        </div>
        {actions}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}

/* ── Metric ──────────────────────────────────────────────────── */

export function AdminMetric({ label, value, hint, href, tone = 'default' }: {
  label: string
  value: ReactNode
  hint?: ReactNode
  href?: string
  /** attention = needs the team's eyes (orange node); good / warn colour the node only. */
  tone?: 'default' | 'attention' | 'good' | 'warn'
}) {
  const toneClass = tone === 'attention' ? styles.toneAttention : tone === 'good' ? styles.toneGood : tone === 'warn' ? styles.toneWarn : undefined
  const body = (
    <>
      <p className={styles.metricLabel}><span aria-hidden="true" className={styles.node} />{label}</p>
      <p className={styles.metricValue}>{value}</p>
      {hint && <p className={styles.metricHint}>{hint}</p>}
    </>
  )
  const className = cn(styles.card, styles.metric, toneClass, href && styles.cardLink)
  return href ? <Link href={href} className={className}>{body}</Link> : <div className={className}>{body}</div>
}

/* ── Action bar ──────────────────────────────────────────────── */

/** Pinned save bar. Compose: <AdminActionBar><AdminActionBarStatus dirty>…</AdminActionBarStatus><AdminActionBarActions>…buttons…</AdminActionBarActions></AdminActionBar> */
export function AdminActionBar({ children }: { children: ReactNode }) {
  return <div className={styles.actionBar}>{children}</div>
}

export function AdminActionBarStatus({ dirty = false, children }: { dirty?: boolean; children: ReactNode }) {
  return <span role="status" className={styles.actionBarStatus} data-state={dirty ? 'dirty' : 'clean'}>{children}</span>
}

export function AdminActionBarActions({ children }: { children: ReactNode }) {
  return <div className={styles.actionBarActions}>{children}</div>
}

/* ── States ──────────────────────────────────────────────────── */

export function AdminLoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className={styles.state}>
      <span aria-hidden="true" className={styles.spinner} />
      <p className={styles.stateText}>{label}</p>
    </div>
  )
}

export function AdminEmptyState({ title, description, action, icon }: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className={styles.state}>
      <span aria-hidden="true" className={styles.stateIcon}>{icon ?? <Inbox />}</span>
      <p className={styles.stateTitle}>{title}</p>
      {description && <p className={styles.stateText}>{description}</p>}
      {action && <div className={styles.stateActions}>{action}</div>}
    </div>
  )
}

export function AdminErrorState({ title = 'Something went wrong', message, onRetry, retryLabel = 'Try again' }: { title?: string; message: ReactNode; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" className={cn(styles.state, styles.stateError)}>
      <span aria-hidden="true" className={styles.stateIcon}><AlertTriangle /></span>
      <p className={styles.stateTitle}>{title}</p>
      <p className={styles.stateText}>{message}</p>
      {onRetry && <div className={styles.stateActions}><AdminButton variant="secondary" onClick={onRetry}>{retryLabel}</AdminButton></div>}
    </div>
  )
}

/* ── Badge, notice, button ───────────────────────────────────── */

export type AdminTone = 'neutral' | 'blue' | 'orange' | 'green' | 'amber' | 'red' | 'dark'
const BADGE: Record<AdminTone, string | undefined> = { neutral: undefined, blue: styles.badgeBlue, orange: styles.badgeOrange, green: styles.badgeGreen, amber: styles.badgeAmber, red: styles.badgeRed, dark: styles.badgeDark }

export function AdminStatusBadge({ tone = 'neutral', dot = false, children }: { tone?: AdminTone; dot?: boolean; children: ReactNode }) {
  return <span className={cn(styles.badge, BADGE[tone])} data-dot={dot ? '' : undefined}>{children}</span>
}

/** Success / error / info feedback. Error is announced assertively (role=alert), the rest politely. */
export function AdminNotice({ tone = 'info', children }: { tone?: 'info' | 'success' | 'error'; children: ReactNode }) {
  return <p role={tone === 'error' ? 'alert' : 'status'} className={cn(styles.notice, tone === 'success' && styles.noticeSuccess, tone === 'error' && styles.noticeError)}>{children}</p>
}

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
const VARIANT: Record<ButtonVariant, string> = { primary: styles.btnPrimary, accent: styles.btnAccent, secondary: styles.btnSecondary, ghost: styles.btnGhost, danger: styles.btnDanger }

/** Button styling as a class string, for pages that keep plain <a>/<button> elements. */
export function adminBtn(variant: ButtonVariant = 'secondary', size: 'sm' | 'md' = 'md', extra?: string) {
  return cn(styles.btn, VARIANT[variant], size === 'sm' && styles.btnSm, extra)
}

type ButtonBase = { variant?: ButtonVariant; size?: 'sm' | 'md'; className?: string; children: ReactNode }
export function AdminButton(props: ButtonBase & Omit<ComponentProps<'button'>, 'className' | 'children'>): JSX.Element
export function AdminButton(props: ButtonBase & { href: string; target?: string; rel?: string; 'aria-label'?: string }): JSX.Element
export function AdminButton({ variant = 'secondary', size = 'md', className, children, ...rest }: ButtonBase & Record<string, unknown>) {
  const classes = cn(styles.btn, VARIANT[variant], size === 'sm' && styles.btnSm, className)
  if ('href' in rest && typeof rest.href === 'string') {
    const { href, ...anchor } = rest as { href: string } & Record<string, unknown>
    return <Link href={href} className={classes} {...anchor}>{children}</Link>
  }
  return <button type="button" className={classes} {...(rest as ComponentProps<'button'>)}>{children}</button>
}

/* ── Phase A2: list toolbar, facts, status rows, callout ─────── */

export function AdminSearchField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className={styles.search}>
      <span className="sr-only">{label}</span>
      <Search aria-hidden="true" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  )
}

export interface AdminFilterOption<K extends string = string> { key: K; label: string; count?: number }

/** A row of toggle buttons (aria-pressed). Counts are shown only when the caller can state them truthfully. */
export function AdminFilterGroup<K extends string>({ label, options, value, onChange }: { label: string; options: AdminFilterOption<K>[]; value: K; onChange: (key: K) => void }) {
  return (
    <div role="group" aria-label={label} className={styles.filters}>
      {options.map((option) => (
        <button key={option.key} type="button" aria-pressed={value === option.key} onClick={() => onChange(option.key)} className={adminBtn(value === option.key ? 'accent' : 'secondary', 'sm')}>
          {option.label}{option.count !== undefined && <> <span className="opacity-70">{option.count}</span></>}
        </button>
      ))}
    </div>
  )
}

export function AdminToolbar({ children }: { children: ReactNode }) {
  return <div className={styles.toolbar}>{children}</div>
}

export interface AdminFact { label: string; value?: ReactNode | null; href?: string; external?: boolean }

/** Labelled facts. A missing value renders "Not provided" in a muted style — never a fabricated one. */
export function AdminFacts({ items, columns = 2 }: { items: AdminFact[]; columns?: 1 | 2 }) {
  return (
    <dl className={styles.facts} data-cols={columns}>
      {items.map((item) => {
        const has = item.value !== undefined && item.value !== null && item.value !== ''
        return (
          <div key={item.label} className={styles.fact}>
            <dt>{item.label}</dt>
            <dd>
              {!has ? <span className={styles.factMuted}>Not provided</span> : item.href ? <a href={item.href} {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{item.value}</a> : item.value}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export function AdminStatusRows({ children }: { children: ReactNode }) {
  return <ul className={styles.statusRows}>{children}</ul>
}

/** One line of a relationship / state checklist. ok = the relationship or state is in place. */
export function AdminStatusRow({ label, ok = false, children }: { label: string; ok?: boolean; children: ReactNode }) {
  return (
    <li className={styles.statusRow}>
      <span className={styles.statusRowLabel}>{label}</span>
      <span className={styles.statusRowValue} data-ok={ok}><span aria-hidden="true" className={styles.statusDot} />{children}</span>
    </li>
  )
}

/** A left-ruled statement: what is true now and what to do about it. */
export function AdminCallout({ tone = 'info', title, children }: { tone?: 'attention' | 'info' | 'good' | 'warn'; title: string; children?: ReactNode }) {
  const toneClass = tone === 'attention' ? styles.calloutAttention : tone === 'good' ? styles.calloutGood : tone === 'warn' ? styles.calloutWarn : styles.calloutInfo
  return (
    <div className={cn(styles.callout, toneClass)}>
      <p className={styles.calloutTitle}>{title}</p>
      {children && <div className={styles.calloutText}>{children}</div>}
    </div>
  )
}
