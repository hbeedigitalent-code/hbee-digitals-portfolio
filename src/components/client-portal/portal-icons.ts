import { ClipboardList, FileSignature, FolderOpen, Gauge, LayoutGrid, MonitorCheck, Receipt, Settings, type LucideIcon } from 'lucide-react'
import type { PortalNavIcon } from './portal-nav'

/**
 * The portal's navigation icons, in ONE place: the sidebar / drawer (PortalShell) and the Overview's workspace tiles both read this, so a section
 * looks the same wherever it appears. One distinct icon per section — never a repeated generic glyph.
 */
export const PORTAL_NAV_ICONS: Record<PortalNavIcon, LucideIcon> = {
  overview: LayoutGrid,
  'growth-profile': Gauge,
  projects: MonitorCheck,
  proposals: FileSignature,
  files: FolderOpen,
  requests: ClipboardList,
  invoices: Receipt,
  settings: Settings,
}
