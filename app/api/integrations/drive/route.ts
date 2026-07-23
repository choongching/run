import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import { GOOGLE_DRIVE_APP_SLUG, getPipedreamClient } from '@/lib/pipedream/client'

// Org-level Google Drive connection through Pipedream Connect. The flow:
// GET returns a Connect Link URL the admin opens to run Google OAuth inside
// Pipedream's hosted page; POST is called afterwards to look up the newly
// created account (Pipedream does not deliver the account id back to us) and
// persist it on company_settings; DELETE disconnects.

export async function GET() {
  const { error, userId } = await requireAdmin()
  if (error) return error

  try {
    const pd = getPipedreamClient()
    // Send the admin back to the Integrations page after Pipedream's hosted
    // OAuth flow. The drive marker lets the freshly loaded page finish the
    // verification itself, since the polling lives in the original tab.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const base = appUrl ? `${appUrl.replace(/\/$/, '')}/admin/integrations` : null
    const token = await pd.tokens.create({
      externalUserId: userId,
      ...(base
        ? {
            successRedirectUri: `${base}?drive=connected`,
            errorRedirectUri: `${base}?drive=error`,
          }
        : {}),
    })
    const url = new URL(token.connectLinkUrl)
    url.searchParams.set('app', GOOGLE_DRIVE_APP_SLUG)
    return NextResponse.json({ connect_url: url.toString() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create connect token'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function POST() {
  const { error, supabase, userId } = await requireAdmin()
  if (error) return error

  try {
    const pd = getPipedreamClient()
    // Collect every google_drive account for this admin: list ordering is not
    // documented, and a reconnect can briefly leave several accounts behind.
    const pageable = await pd.accounts.list({
      externalUserId: userId,
      app: GOOGLE_DRIVE_APP_SLUG,
    })
    const accounts = []
    for await (const account of pageable) accounts.push(account)

    // Prefer usable accounts, newest first. An unhealthy account is never
    // treated as a successful connection.
    const usable = accounts
      .filter((a) => a.healthy !== false && a.dead !== true)
      .sort(
        (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
      )
    const account = usable[0]
    if (!account) {
      // OAuth not completed yet; the client polls until this succeeds.
      return NextResponse.json({ connected: false })
    }

    const { error: dbError } = await supabase
      .from('company_settings')
      .update({
        pipedream_account_id: account.id,
        pipedream_connected_by: userId,
        pipedream_connected_at:
          account.createdAt?.toISOString() ?? new Date().toISOString(),
      })
      .not('id', 'is', null)
    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Best-effort cleanup of superseded accounts so stale Google grants do
    // not accumulate in Pipedream after reconnects.
    for (const stale of accounts) {
      if (stale.id !== account.id) {
        try {
          await pd.accounts.delete(stale.id)
        } catch {
          // Leave orphans rather than failing the connect.
        }
      }
    }

    return NextResponse.json({ connected: true, account_name: account.name ?? null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not verify connection'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function DELETE() {
  const { error, supabase } = await requireAdmin()
  if (error) return error

  const { data: settings } = await supabase
    .from('company_settings')
    .select('pipedream_account_id')
    .not('id', 'is', null)
    .limit(1)
    .single()
  if (!settings?.pipedream_account_id) {
    return NextResponse.json({ error: 'Google Drive is not connected' }, { status: 404 })
  }

  // Delete the Pipedream account first (revokes the stored Google grant); the
  // local columns are what the app treats as the source of truth for status.
  try {
    const pd = getPipedreamClient()
    await pd.accounts.delete(settings.pipedream_account_id)
  } catch {
    // Already deleted on Pipedream or transient failure; disconnect locally.
  }

  const { error: dbError } = await supabase
    .from('company_settings')
    .update({
      pipedream_account_id: null,
      pipedream_connected_by: null,
      pipedream_connected_at: null,
    })
    .not('id', 'is', null)
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
