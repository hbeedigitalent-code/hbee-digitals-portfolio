// src/app/client-portal/messages/page.tsx
//
// The portal has no messaging backend (the Phase 18 audit found no working project_messages writer or
// reader), and "Messages" is not in the portal navigation. The route used to render an empty, non-
// functional inbox. It now sends anyone who still has the old link to Requests, the one real way to
// ask Hbee for something. No messaging is implied or built.

import { redirect } from 'next/navigation'

export default function ClientMessagesRedirect() {
  redirect('/client-portal/requests')
}
