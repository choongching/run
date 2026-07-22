'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

export function CompanyContextForm({ initialContext }: { initialContext: string | null }) {
  const [context, setContext] = useState(initialContext ?? '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_context: context }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setStatus('saved')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Save failed')
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Company context</CardTitle>
        <CardDescription>
          Brand guidelines, tone of voice, product facts. Injected verbatim into
          AI prompt generation and, later, mission runs.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Textarea
          rows={14}
          placeholder="e.g. We are Acme, a B2B logistics platform. Voice: plain, confident, no exclamation marks..."
          value={context}
          onChange={(e) => {
            setContext(e.target.value)
            setStatus('idle')
          }}
        />
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save context'}
          </Button>
          {status === 'saved' && (
            <span className="text-sm text-muted-foreground">Saved.</span>
          )}
          {status === 'error' && (
            <span className="text-sm text-destructive">{errorMessage}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
