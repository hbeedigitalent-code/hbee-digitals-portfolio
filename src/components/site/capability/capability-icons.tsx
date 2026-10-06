import { BarChart3, Lightbulb, Search, Settings, Tag, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CapabilityIcon } from '../services/services-content'

/* The six-module system's icon set, keyed by capability icon. Same mapping
   as the Services capability system (Brand, Technology, Creative, Discovery,
   Experience, Growth), so a capability always reads as its module. */
const ICON_PROPS = { strokeWidth: 1.75, width: '100%', height: '100%', 'aria-hidden': true, focusable: false } as const

export const CAPABILITY_ICONS: Record<CapabilityIcon, ReactNode> = {
  brand: <Tag {...ICON_PROPS} />,
  systems: <Settings {...ICON_PROPS} />,
  creative: <Lightbulb {...ICON_PROPS} />,
  discovery: <Search {...ICON_PROPS} />,
  commerce: <UserRound {...ICON_PROPS} />,
  retention: <BarChart3 {...ICON_PROPS} />,
}
