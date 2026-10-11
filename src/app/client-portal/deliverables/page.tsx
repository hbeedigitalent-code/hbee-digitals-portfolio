// src/app/client-portal/deliverables/page.tsx
//
// Deliverables now live on the Files page (Phase 18.5), which lists them and downloads them
// through a session-scoped signed route. This route is kept so existing links (notifications,
// the dashboard's deliverable activity, bookmarks) keep working. It deliberately renders no
// deliverable data itself: the previous version read project_deliverables in the browser and
// rendered the raw stored file_url as a link.

import { redirect } from 'next/navigation'

export default function ClientDeliverablesRedirect() {
  redirect('/client-portal/files')
}
