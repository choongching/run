import { NextResponse } from 'next/server'

import { requireUser } from '@/lib/api-helpers'
import {
  CONNECTABLE_APPS,
  getPipedreamClient,
  type ConnectableApp,
} from '@/lib/pipedream/client'

// Per-user tool connections (phase 3). Each user connects their OWN Gmail /
// Drive; external_user_id is the user's uuid. GET returns a Connect Link the
// user opens (usually in a popup from the chat connect card); POST finalizes
// by finding the freshly created account and storing it; DELETE disconnects.

function resolveApp(raw: string): ConnectableApp | null {
  return raw in CONNECTABLE_APPS ? (raw as ConnectableApp) : null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ app: string }> }
) {
  const { error, userId } = await requireUser()
  if (error) return error
  const app = resolveApp((await params).app)
  if (!app) return NextResponse.json({ error: 'Unknown app' }, { status: 404 })

  try {
    const pd = getPipedreamClient()
    const token = await pd.tokens.create({ externalUserId: userId })
    const url = new URL(token.connectLinkUrl)
    url.searchParams.set('app', CONNECTABLE_APPS[app].slug)
    return NextResponse.json({ connect_url: url.toString() })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not create connect token'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ app: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const app = resolveApp((await params).app)
  if (!app) return NextResponse.json({ error: 'Unknown app' }, { status: 404 })

  try {
    const pd = getPipedreamClient()
    const pageable = await pd.accounts.list({
      externalUserId: userId,
      app: CONNECTABLE_APPS[app].slug,
    })
    const accounts = []
    for await (const account of pageable) accounts.push(account)

    // Prefer usable accounts, newest first; an unhealthy account is never a
    // successful connection.
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
      .from('user_connections')
      .upsert(
        {
          user_id: userId,
          app,
          pipedream_account_id: account.id,
        },
        { onConflict: 'user_id,app' }
      )
    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Best-effort cleanup of superseded accounts for this user+app so stale
    // Google grants do not accumulate after reconnects.
    for (const stale of accounts) {
      if (stale.id !== account.id) {
        try {
          await pd.accounts.delete(stale.id)
        } catch {
          // Leave orphans rather than failing the connect.
        }
      }
    }

    return NextResponse.json({
      connected: true,
      account_name: account.name ?? null,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not verify connection'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ app: string }> }
) {
  const { error, supabase, userId } = await requireUser()
  if (error) return error
  const app = resolveApp((await params).app)
  if (!app) return NextResponse.json({ error: 'Unknown app' }, { status: 404 })

  const { data: connection } = await supabase
    .from('user_connections')
    .select('pipedream_account_id')
    .eq('user_id', userId)
    .eq('app', app)
    .maybeSingle()
  if (!connection) {
    return NextResponse.json({ error: 'Not connected' }, { status: 404 })
  }

  try {
    const pd = getPipedreamClient()
    await pd.accounts.delete(connection.pipedream_account_id)
  } catch {
    // Already gone on Pipedream or transient; disconnect locally regardless.
  }

  const { error: dbError } = await supabase
    .from('user_connections')
    .delete()
    .eq('user_id', userId)
    .eq('app', app)
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
