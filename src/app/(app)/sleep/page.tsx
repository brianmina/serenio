import { createClient } from '@/lib/supabase/server'
import SleepClient from './SleepClient'

export default async function SleepPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: logs } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })

  return <SleepClient logs={logs ?? []} />
}
