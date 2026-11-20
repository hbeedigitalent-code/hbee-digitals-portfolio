// src/app/admin/proposals/[id]/edit/page.tsx
//
// Edit a proposal DRAFT (or the revision of a proposal the client asked changes to). The detail page links here (it previously
// linked to a page that did not exist). Once a proposal has been sent its commercial terms are frozen by the database; this form
// then reports the refusal instead of saving.

import ProposalEditor from '@/components/admin/ProposalEditor'

export default function AdminProposalEditPage({ params }: { params: { id: string } }) {
  return <ProposalEditor proposalId={params.id} />
}
