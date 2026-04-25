import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { autoCategory } from '@/app/(app)/transactions/csvParsers'

type TellerTransaction = {
  id: string
  date: string
  description: string
  amount: string
  status: string
  details?: { counterparty?: { name?: string } }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { connectionId } = await req.json()

  const { data: connection, error: connErr } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', user.id)
    .single()

  if (connErr || !connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 })

  const creds = Buffer.from(`${connection.access_token}:`).toString('base64')
  const res = await fetch(`https://api.teller.io/accounts/${connection.account_id}/transactions`, {
    headers: { Authorization: `Basic ${creds}` },
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: `Teller error: ${text}` }, { status: res.status })
  }

  const tellerTxns: TellerTransaction[] = await res.json()

  // Fetch existing teller_ids to avoid duplicates
  const { data: existing } = await supabase
    .from('transactions')
    .select('teller_id')
    .eq('user_id', user.id)
    .not('teller_id', 'is', null)

  const seen = new Set((existing ?? []).map(t => t.teller_id as string))

  const toInsert = tellerTxns
    .filter(t => t.status === 'posted' && !seen.has(t.id))
    .map(t => {
      const rawAmount = parseFloat(t.amount)
      const type: 'income' | 'expense' = rawAmount > 0 ? 'income' : 'expense'
      const description = t.details?.counterparty?.name || t.description || ''
      return {
        user_id: user.id,
        teller_id: t.id,
        date: t.date,
        description,
        amount: Math.abs(rawAmount),
        type,
        category: autoCategory(description, type),
      }
    })

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from('transactions').insert(toInsert)
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  await supabase
    .from('bank_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', connectionId)

  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  revalidatePath('/reports')

  return NextResponse.json({ imported: toInsert.length })
}
