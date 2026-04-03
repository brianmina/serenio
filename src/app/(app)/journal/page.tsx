import { createClient } from '@/lib/supabase/server'
import JournalClient from './JournalClient'

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: entries } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  return <JournalClient entries={entries ?? []} />
}
