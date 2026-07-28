'use client'

import { useRouter } from 'next/navigation'

import {
  ConnectorList,
  type ConnectorState,
} from '@/components/connectors/connector-list'

// The Connectors page body. A thin client wrapper so the page itself stays a
// server component: it only exists to refresh server data after a connect or
// disconnect lands.
export function ConnectorsManager({
  connections,
}: {
  connections: ConnectorState
}) {
  const router = useRouter()

  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <ConnectorList
        connections={connections}
        onChanged={() => router.refresh()}
        showBlurb
      />
      <p className="px-0.5 text-xs text-muted-foreground">
        Agents read from a connected account on their own, and always show you
        a preview before they send or change anything. Web search needs no
        connector and is always on.
      </p>
    </div>
  )
}
