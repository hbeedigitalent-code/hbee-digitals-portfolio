// src/app/admin/proposals/new/page.tsx
//
// New proposal (S6.4). The form itself is the shared ProposalEditor: line items, currency, discount and expiry. Totals are computed
// by the database when the draft is saved; nothing monetary is trusted from this page.

import ProposalEditor from '@/components/admin/ProposalEditor'

export default function AdminProposalsNewPage() {
  return <ProposalEditor />
}
