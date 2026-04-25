import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { accessToken, enrollmentId, institutionName, account } = await req.json()

  const { error } = await supabase.from('bank_connections').upsert({
    user_id: user.id,
    enrollment_id: enrollmentId,
    access_token: accessToken,
    institution_name: institutionName,
    account_id: account.id,
    account_name: account.name,
    account_type: account.type,
  }, { onConflict: 'user_id,account_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
